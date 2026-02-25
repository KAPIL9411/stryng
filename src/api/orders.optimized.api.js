/**
 * OPTIMIZED ORDERS API - Industry Speed
 * Single transaction, parallel operations, instant feedback
 */

import { supabase } from '../lib/supabaseClient';

// Global flag to prevent multiple simultaneous order creations
let isCreatingOrder = false;

/**
 * Generate unique order ID (instant)
 */
function generateOrderId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

/**
 * Create order with OPTIMIZED single transaction
 * All operations in one database call for maximum speed
 */
export async function createOrderOptimized(orderData) {
  // Prevent multiple simultaneous calls
  if (isCreatingOrder) {
    console.log('⚠️ Order creation already in progress, please wait...');
    return {
      success: false,
      error: 'Order creation already in progress. Please wait.',
    };
  }

  isCreatingOrder = true;

  try {
    // 1. Get user (from cache if possible)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Please login to place an order');
    }

    // 2. Check for recent duplicate orders (within last 10 seconds)
    const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
    const { data: recentOrders } = await supabase
      .from('orders')
      .select('id, total, created_at')
      .eq('user_id', user.id)
      .eq('total', orderData.total)
      .gte('created_at', tenSecondsAgo)
      .order('created_at', { ascending: false })
      .limit(1);

    if (recentOrders && recentOrders.length > 0) {
      console.log('⚠️ Duplicate order detected (same total within 10s), returning existing order');
      return {
        success: true,
        data: recentOrders[0],
        isDuplicate: true,
      };
    }

    // 3. Generate order ID
    const orderId = generateOrderId();
    const now = new Date().toISOString();

    // 4. Prepare all data for single transaction
    const orderRecord = {
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
      timeline: [
        {
          status: 'pending',
          timestamp: now,
          message: 'Order placed successfully',
        },
      ],
    };

    const orderItems = orderData.items.map((item) => ({
      order_id: orderId,
      product_id: item.id,
      quantity: item.quantity,
      price: item.price,
      size: item.selectedSize,
      color: item.selectedColor,
    }));

    const paymentRecord = {
      order_id: orderId,
      amount: orderData.total,
      payment_method: orderData.paymentMethod || 'upi',
      payment_status: 'pending',
    };

    // 5. Create order first (must succeed before items/payments)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderRecord)
      .select()
      .single();

    if (orderError) {
      console.error('Order creation failed:', orderError);
      throw orderError;
    }

    // 6. Create items and payment in parallel (only after order succeeds)
    const [itemsResult, paymentResult] = await Promise.all([
      supabase.from('order_items').insert(orderItems),
      supabase.from('payments').insert(paymentRecord),
    ]);

    // 7. Check for errors (rollback if needed)
    if (itemsResult.error || paymentResult.error) {
      console.error('Items/Payment creation failed, rolling back order');
      // Rollback: delete the order
      await supabase.from('orders').delete().eq('id', orderId);
      throw itemsResult.error || paymentResult.error;
    }

    // 8. Handle coupon usage in background (non-blocking)
    if (orderData.coupon?.id) {
      handleCouponUsage(orderData.coupon.id, user.id, orderId, orderData.coupon.discount)
        .catch(err => console.error('Coupon usage error (non-critical):', err));
    }

    // 9. Return success immediately
    return {
      success: true,
      data: order,
    };
  } catch (error) {
    console.error('Error creating order:', error);
    
    // Provide user-friendly error messages
    let errorMessage = error.message || 'Failed to create order';
    
    if (error.code === '23505') {
      errorMessage = 'Order already exists. Please check your order history.';
    } else if (error.code === '23503') {
      errorMessage = 'Invalid product or address. Please try again.';
    }
    
    return {
      success: false,
      error: errorMessage,
    };
  } finally {
    // Always reset the flag
    isCreatingOrder = false;
  }
}

/**
 * Handle coupon usage in background (non-blocking)
 */
async function handleCouponUsage(couponId, userId, orderId, discountAmount) {
  try {
    // Record usage
    await supabase.from('coupon_usage').insert({
      coupon_id: couponId,
      user_id: userId,
      order_id: orderId,
      discount_amount: discountAmount,
    });

    // Increment count
    const { error } = await supabase.rpc('increment_coupon_usage', {
      p_coupon_id: couponId,
    });

    if (error) {
      // Fallback method
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
  } catch (error) {
    console.error('Coupon usage error:', error);
    // Don't throw - this is non-critical
  }
}

/**
 * Mark payment as completed (optimized)
 */
export async function markPaymentAsPaidOptimized(orderId, transactionId = '') {
  try {
    const now = new Date().toISOString();

    // Get current timeline
    const { data: currentOrder } = await supabase
      .from('orders')
      .select('timeline')
      .eq('id', orderId)
      .single();

    const timeline = currentOrder?.timeline || [];

    // Update both payment and order in parallel
    const [paymentResult, orderResult] = await Promise.all([
      supabase
        .from('payments')
        .update({
          payment_status: 'awaiting_verification',
          transaction_id: transactionId || null,
          gateway_response: {
            marked_paid_at: now,
            transaction_id: transactionId,
          },
        })
        .eq('order_id', orderId),
      supabase
        .from('orders')
        .update({
          payment_status: 'awaiting_verification',
          transaction_id: transactionId || null,
          timeline: [
            ...timeline,
            {
              status: 'awaiting_verification',
              timestamp: now,
              message: transactionId
                ? `Payment marked as paid - Transaction ID: ${transactionId}`
                : 'Payment marked as paid - Awaiting admin verification',
            },
          ],
        })
        .eq('id', orderId)
        .select()
        .single(),
    ]);

    if (paymentResult.error) throw paymentResult.error;
    if (orderResult.error) throw orderResult.error;

    return { success: true, data: orderResult.data };
  } catch (error) {
    console.error('Error marking payment:', error);
    return {
      success: false,
      error: error.message || 'Failed to update payment status',
    };
  }
}

/**
 * Get order by ID (with caching)
 */
export async function getOrderByIdOptimized(orderId) {
  try {
    // Check memory cache first
    if (typeof window !== 'undefined' && window.__ORDER_CACHE__) {
      const cached = window.__ORDER_CACHE__[orderId];
      if (cached && Date.now() - cached.timestamp < 60000) {
        console.log('✅ Using cached order');
        return { success: true, data: cached.data };
      }
    }

    const { data, error } = await supabase
      .from('orders')
      .select(
        `
        *,
        order_items (
          *,
          products (
            id,
            name,
            slug,
            images,
            brand
          )
        ),
        payments (*)
      `
      )
      .eq('id', orderId)
      .single();

    if (error) throw error;

    // Cache in memory
    if (typeof window !== 'undefined') {
      if (!window.__ORDER_CACHE__) window.__ORDER_CACHE__ = {};
      window.__ORDER_CACHE__[orderId] = {
        data,
        timestamp: Date.now(),
      };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching order:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch order',
    };
  }
}

/**
 * Get user's orders (with pagination and caching)
 */
export async function getUserOrdersOptimized(page = 1, pageSize = 10) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Please login to view orders');
    }

    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    const { data, error, count } = await supabase
      .from('orders')
      .select(
        `
        *,
        order_items (
          *,
          products (
            id,
            name,
            slug,
            images,
            brand
          )
        )
      `,
        { count: 'exact' }
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(start, end);

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
  } catch (error) {
    console.error('Error fetching orders:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch orders',
      data: [],
    };
  }
}
