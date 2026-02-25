/**
 * Orders API - Clean, reliable, industry-standard
 * Single source of truth for all order operations
 * @module api/orders
 */

import { supabase } from '../lib/supabaseClient';

// ─── Constants ───────────────────────────────────────────────────────────────
const TIMEOUT_MS = {
  READ: 8000,
  WRITE: 20000,
  PARALLEL: 15000,
};

const CANCELLABLE_STATUSES = new Set(['pending', 'confirmed', 'processing']);

// ─── Per-user order creation locks (NOT a global flag) ───────────────────────
// Global flag was broken: user A's order would block user B in the same session
// (e.g. admin panel + customer in same tab, or React StrictMode double-invoke)
const _creationLocks = new Set();

// ─── Helpers ─────────────────────────────────────────────────────────────────
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${label}`)), ms)
    ),
  ]);
}

function generateOrderId() {
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 9).toUpperCase();
  return `ORD-${ts}-${rand}`;
}

function timelineEntry(status, message) {
  return { status, timestamp: new Date().toISOString(), message };
}

const STATUS_MESSAGES = {
  pending: 'Order placed successfully',
  confirmed: 'Order confirmed',
  processing: 'Order is being processed',
  shipped: 'Order has been shipped',
  delivered: 'Order delivered successfully',
  cancelled: 'Order cancelled',
  awaiting_verification: 'Payment awaiting admin verification',
};

function translateError(err) {
  const msg = err?.message || '';
  const code = err?.code || '';
  if (code === '23505') return 'This order already exists. Please check your order history.';
  if (code === '23503') return 'Invalid product or address. Please try again.';
  if (msg.includes('timeout')) return 'Request timed out. Please check your connection and try again.';
  if (msg.includes('JWT') || msg.includes('auth')) return 'Session expired. Please refresh and try again.';
  return msg || 'Something went wrong. Please try again.';
}

async function getAuthUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Please login to continue');
  return user;
}

async function getOrderTimeline(orderId) {
  const { data } = await supabase
    .from('orders')
    .select('timeline')
    .eq('id', orderId)
    .single();
  return data?.timeline || [];
}

// ─── Order Creation ───────────────────────────────────────────────────────────

/**
 * Create a new order
 * - Per-user lock (not global) prevents double-submit
 * - Order insert first, then items + payment in parallel
 * - Coupon usage is fire-and-forget (non-critical path)
 * - Manual rollback on partial failure (Supabase JS v2 has no client transactions)
 */
export async function createOrder(orderData) {
  let user;
  try {
    user = await getAuthUser();
  } catch (err) {
    return { success: false, error: err.message };
  }

  // Per-user double-submit guard
  if (_creationLocks.has(user.id)) {
    return { success: false, error: 'Order already in progress. Please wait.' };
  }
  _creationLocks.add(user.id);

  const orderId = generateOrderId();
  let orderCreated = false;

  try {
    const now = new Date().toISOString();

    // ── Step 1: Insert order record ──────────────────────────────────────────
    const { data: order, error: orderError } = await withTimeout(
      supabase
        .from('orders')
        .insert({
          id: orderId,
          user_id: user.id,
          total: orderData.total,
          status: 'pending',
          payment_status: 'pending',
          payment_method: orderData.paymentMethod || 'upi',
          address: orderData.address,
          coupon_id: orderData.coupon?.id || null,
          coupon_code: orderData.coupon?.code || null,
          coupon_discount: orderData.coupon?.discount || 0,
          timeline: [timelineEntry('pending', STATUS_MESSAGES.pending)],
        })
        .select()
        .single(),
      TIMEOUT_MS.WRITE,
      'order insert'
    );

    if (orderError) throw orderError;
    orderCreated = true;

    // ── Step 2: Insert items + payment in parallel ───────────────────────────
    const orderItems = orderData.items.map((item) => ({
      order_id: orderId,
      product_id: item.id,
      quantity: item.quantity,
      price: item.price,
      size: item.selectedSize || null,
      color: item.selectedColor || null,
    }));

    const [itemsResult, paymentResult] = await withTimeout(
      Promise.all([
        supabase.from('order_items').insert(orderItems),
        supabase.from('payments').insert({
          order_id: orderId,
          amount: orderData.total,
          payment_method: orderData.paymentMethod || 'upi',
          payment_status: 'pending',
        }),
      ]),
      TIMEOUT_MS.PARALLEL,
      'items + payment insert'
    );

    if (itemsResult.error || paymentResult.error) {
      throw itemsResult.error || paymentResult.error;
    }

    // ── Step 3: Coupon usage (background, non-blocking) ──────────────────────
    if (orderData.coupon?.id) {
      _handleCouponUsage(orderData.coupon.id, user.id, orderId, orderData.coupon.discount);
    }

    return { success: true, data: order };

  } catch (err) {
    console.error('❌ createOrder failed:', err);

    // Rollback: clean up orphaned order if items/payment failed
    if (orderCreated) {
      supabase.from('orders').delete().eq('id', orderId).then(() => {
        console.warn(`⚠️ Rolled back order ${orderId}`);
      });
    }

    return { success: false, error: translateError(err) };
  } finally {
    _creationLocks.delete(user.id);
  }
}

/**
 * Record coupon usage — fire and forget, never blocks order creation
 */
async function _handleCouponUsage(couponId, userId, orderId, discountAmount) {
  try {
    await supabase.from('coupon_usage').insert({
      coupon_id: couponId,
      user_id: userId,
      order_id: orderId,
      discount_amount: discountAmount,
    });

    const { error } = await supabase.rpc('increment_coupon_usage', {
      p_coupon_id: couponId,
    });

    // RPC fallback: manual increment if stored procedure missing
    if (error) {
      const { data: coupon } = await supabase
        .from('coupons')
        .select('used_count')
        .eq('id', couponId)
        .single();
      if (coupon) {
        await supabase
          .from('coupons')
          .update({ used_count: (coupon.used_count || 0) + 1 })
          .eq('id', couponId);
      }
    }
  } catch (err) {
    console.error('Coupon usage error (non-critical):', err.message);
  }
}

// ─── Payment ──────────────────────────────────────────────────────────────────

/**
 * Customer marks their payment as sent
 */
export async function markPaymentAsPaid(orderId, transactionId = '') {
  try {
    const now = new Date().toISOString();
    const timeline = await getOrderTimeline(orderId);
    const message = transactionId
      ? `Payment submitted — Transaction ID: ${transactionId}`
      : 'Payment submitted — awaiting admin verification';

    const [paymentResult, orderResult] = await withTimeout(
      Promise.all([
        supabase
          .from('payments')
          .update({
            payment_status: 'awaiting_verification',
            transaction_id: transactionId || null,
            gateway_response: { marked_paid_at: now, transaction_id: transactionId },
          })
          .eq('order_id', orderId),
        supabase
          .from('orders')
          .update({
            payment_status: 'awaiting_verification',
            transaction_id: transactionId || null,
            timeline: [...timeline, timelineEntry('awaiting_verification', message)],
          })
          .eq('id', orderId)
          .select()
          .single(),
      ]),
      TIMEOUT_MS.PARALLEL,
      'markPaymentAsPaid'
    );

    if (paymentResult.error) throw paymentResult.error;
    if (orderResult.error) throw orderResult.error;

    return { success: true, data: orderResult.data };
  } catch (err) {
    console.error('❌ markPaymentAsPaid:', err.message);
    return { success: false, error: translateError(err) };
  }
}

// ─── Order Reads ──────────────────────────────────────────────────────────────

const ORDER_FULL_SELECT = `
  *,
  order_items (
    *,
    products ( id, name, slug, images, brand )
  ),
  payments (*)
`;

const ORDER_LIST_SELECT = `
  *,
  order_items (
    *,
    products ( id, name, slug, images, brand )
  )
`;

/**
 * Get a single order by ID
 * Short-lived in-memory cache (60s) to avoid re-fetching on re-render
 */
const _orderCache = new Map();
const ORDER_CACHE_TTL = 60 * 1000;

export async function getOrderById(orderId) {
  const cached = _orderCache.get(orderId);
  if (cached && Date.now() - cached.ts < ORDER_CACHE_TTL) {
    return { success: true, data: cached.data };
  }

  try {
    const { data, error } = await withTimeout(
      supabase.from('orders').select(ORDER_FULL_SELECT).eq('id', orderId).single(),
      TIMEOUT_MS.READ,
      'getOrderById'
    );
    if (error) throw error;

    _orderCache.set(orderId, { data, ts: Date.now() });
    return { success: true, data };
  } catch (err) {
    console.error('❌ getOrderById:', err.message);
    return { success: false, error: translateError(err) };
  }
}

/**
 * Get the authenticated user's orders (paginated)
 */
export async function getUserOrders(page = 1, pageSize = 10) {
  try {
    const user = await getAuthUser();
    const start = (page - 1) * pageSize;

    const { data, error, count } = await withTimeout(
      supabase
        .from('orders')
        .select(ORDER_LIST_SELECT, { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(start, start + pageSize - 1),
      TIMEOUT_MS.READ,
      'getUserOrders'
    );

    if (error) throw error;

    return {
      success: true,
      data: data || [],
      pagination: {
        currentPage: page,
        pageSize,
        totalItems: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    };
  } catch (err) {
    console.error('❌ getUserOrders:', err.message);
    return { success: false, error: translateError(err), data: [] };
  }
}

// ─── Customer Actions ─────────────────────────────────────────────────────────

/**
 * Cancel order (customer) — only allowed before shipping
 */
export async function cancelOrder(orderId, reason = '') {
  try {
    const user = await getAuthUser();

    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select('status, user_id')
      .eq('id', orderId)
      .single();

    if (fetchErr) throw new Error('Order not found');
    if (order.user_id !== user.id) throw new Error('Unauthorized');
    if (!CANCELLABLE_STATUSES.has(order.status)) {
      throw new Error('This order can no longer be cancelled');
    }

    const timeline = await getOrderTimeline(orderId);
    const message = reason ? `Cancelled by customer: ${reason}` : 'Cancelled by customer';

    const { data, error } = await withTimeout(
      supabase
        .from('orders')
        .update({
          status: 'cancelled',
          timeline: [...timeline, timelineEntry('cancelled', message)],
        })
        .eq('id', orderId)
        .select()
        .single(),
      TIMEOUT_MS.WRITE,
      'cancelOrder'
    );

    if (error) throw error;
    _orderCache.delete(orderId);
    return { success: true, data };
  } catch (err) {
    console.error('❌ cancelOrder:', err.message);
    return { success: false, error: translateError(err) };
  }
}

// ─── Admin Actions ────────────────────────────────────────────────────────────

/**
 * ADMIN: Get all orders with filters + pagination
 */
export async function getAllOrders(filters = {}, page = 1, pageSize = 20) {
  try {
    const start = (page - 1) * pageSize;

    let query = supabase
      .from('orders')
      .select(
        `*, order_items (*, products (id, name, slug, images)), payments (*)`,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(start, start + pageSize - 1);

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.payment_status) query = query.eq('payment_status', filters.payment_status);
    if (filters.user_id) query = query.eq('user_id', filters.user_id);

    const { data, error, count } = await withTimeout(query, TIMEOUT_MS.READ, 'getAllOrders');
    if (error) throw error;

    return {
      success: true,
      data: data || [],
      pagination: {
        currentPage: page,
        pageSize,
        totalItems: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    };
  } catch (err) {
    console.error('❌ getAllOrders:', err.message);
    return { success: false, error: translateError(err), data: [] };
  }
}

/**
 * ADMIN: Verify or reject a payment
 */
export async function verifyPayment(orderId, isVerified, notes = '') {
  try {
    const timeline = await getOrderTimeline(orderId);
    const now = new Date().toISOString();

    if (isVerified) {
      // Update payment + order in parallel
      const [paymentResult, orderResult] = await withTimeout(
        Promise.all([
          supabase
            .from('payments')
            .update({ payment_status: 'paid', payment_date: now })
            .eq('order_id', orderId),
          supabase
            .from('orders')
            .update({
              status: 'confirmed',
              payment_status: 'paid',
              timeline: [
                ...timeline,
                timelineEntry('confirmed', 'Payment verified — order confirmed'),
              ],
            })
            .eq('id', orderId)
            .select()
            .single(),
        ]),
        TIMEOUT_MS.PARALLEL,
        'verifyPayment:confirm'
      );

      if (paymentResult.error) throw paymentResult.error;
      if (orderResult.error) throw orderResult.error;

      // Deduct stock for each item (sequential — RPC calls can't easily be batched)
      const { data: items } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', orderId);

      await Promise.allSettled(
        (items || []).map((item) =>
          supabase.rpc('decrement_stock', {
            p_product_id: item.product_id,
            p_quantity: item.quantity,
          })
        )
      );

      _orderCache.delete(orderId);
      return { success: true, data: orderResult.data };

    } else {
      // Payment rejected
      const [paymentResult, orderResult] = await withTimeout(
        Promise.all([
          supabase
            .from('payments')
            .update({
              payment_status: 'failed',
              gateway_response: { admin_notes: notes },
            })
            .eq('order_id', orderId),
          supabase
            .from('orders')
            .update({
              status: 'cancelled',
              payment_status: 'failed',
              timeline: [
                ...timeline,
                timelineEntry('cancelled', 'Payment rejected — order cancelled'),
              ],
            })
            .eq('id', orderId)
            .select()
            .single(),
        ]),
        TIMEOUT_MS.PARALLEL,
        'verifyPayment:reject'
      );

      if (paymentResult.error) throw paymentResult.error;
      if (orderResult.error) throw orderResult.error;

      _orderCache.delete(orderId);
      return { success: true, data: orderResult.data };
    }
  } catch (err) {
    console.error('❌ verifyPayment:', err.message);
    return { success: false, error: translateError(err) };
  }
}

/**
 * ADMIN: Update order status
 */
export async function updateOrderStatus(orderId, status) {
  try {
    const timeline = await getOrderTimeline(orderId);
    const message = STATUS_MESSAGES[status] || `Status updated to ${status}`;

    const { data, error } = await withTimeout(
      supabase
        .from('orders')
        .update({
          status,
          timeline: [...timeline, timelineEntry(status, message)],
        })
        .eq('id', orderId)
        .select()
        .single(),
      TIMEOUT_MS.WRITE,
      'updateOrderStatus'
    );

    if (error) throw error;
    _orderCache.delete(orderId);
    return { success: true, data };
  } catch (err) {
    console.error('❌ updateOrderStatus:', err.message);
    return { success: false, error: translateError(err) };
  }
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

/**
 * ADMIN: Dashboard stats — runs all 3 queries in parallel
 */
export async function getDashboardStats() {
  try {
    const [ordersResult, revenueResult, pendingResult] = await withTimeout(
      Promise.all([
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('total').eq('payment_status', 'paid'),
        supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
      ]),
      TIMEOUT_MS.READ,
      'getDashboardStats'
    );

    const totalRevenue =
      revenueResult.data?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;

    return {
      success: true,
      data: {
        totalOrders: ordersResult.count || 0,
        totalRevenue,
        pendingOrders: pendingResult.count || 0,
      },
    };
  } catch (err) {
    console.error('❌ getDashboardStats:', err.message);
    return { success: false, error: translateError(err) };
  }
}

/**
 * ADMIN: Recent orders feed
 */
export async function getRecentOrders(limit = 10) {
  try {
    const { data, error } = await withTimeout(
      supabase
        .from('orders')
        .select('id, total, status, payment_status, created_at, address')
        .order('created_at', { ascending: false })
        .limit(limit),
      TIMEOUT_MS.READ,
      'getRecentOrders'
    );

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (err) {
    console.error('❌ getRecentOrders:', err.message);
    return { success: false, error: translateError(err), data: [] };
  }
}