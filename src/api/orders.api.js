/**
 * SIMPLIFIED ORDERS API
 * Clean, simple, reliable - like major e-commerce platforms
 */

import { supabase } from '../lib/supabaseClient';

/**
 * Generate unique order ID
 */
function generateOrderId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

/**
 * Create a new order (SIMPLIFIED)
 * Single API call, no complex logic
 */
export async function createOrder(orderData) {
  try {
    // 1. Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Please login to place an order');
    }

    // 2. Generate order ID
    const orderId = generateOrderId();

    // 3. Create order
    const now = new Date().toISOString();
    const { data: order, error: orderError } = await supabase
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
        timeline: [
          {
            status: 'pending',
            timestamp: now,
            message: 'Order placed successfully',
          },
        ],
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // 4. Create order items
    const items = orderData.items.map((item) => ({
      order_id: orderId,
      product_id: item.id,
      quantity: item.quantity,
      price: item.price,
      size: item.selectedSize,
      color: item.selectedColor,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(items);

    if (itemsError) throw itemsError;

    // 5. Create payment record
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: orderId,
        amount: orderData.total,
        payment_method: orderData.paymentMethod || 'upi',
        payment_status: 'pending',
      });

    if (paymentError) throw paymentError;

    // 6. Record coupon usage if coupon was applied
    if (orderData.coupon?.id) {
      // Record in coupon_usage table
      const { error: usageError } = await supabase
        .from('coupon_usage')
        .insert({
          coupon_id: orderData.coupon.id,
          user_id: user.id,
          order_id: orderId,
          discount_amount: orderData.coupon.discount,
        });

      if (usageError) {
        console.error('Error recording coupon usage:', usageError);
        // Don't fail the order if coupon usage recording fails
      }

      // Increment used_count using the new function
      const { error: incrementError } = await supabase.rpc('increment_coupon_usage', {
        p_coupon_id: orderData.coupon.id,
      });

      if (incrementError) {
        console.error('Error incrementing coupon usage:', incrementError);
        // Try alternative method if RPC doesn't work
        const { data: coupon } = await supabase
          .from('coupons')
          .select('used_count')
          .eq('id', orderData.coupon.id)
          .single();

        if (coupon) {
          await supabase
            .from('coupons')
            .update({ used_count: (coupon.used_count || 0) + 1 })
            .eq('id', orderData.coupon.id);
        }
      }
    }

    // 7. Return success
    return {
      success: true,
      data: order,
    };
  } catch (error) {
    console.error('Error creating order:', error);
    return {
      success: false,
      error: error.message || 'Failed to create order',
    };
  }
}

/**
 * Mark payment as completed by user
 */
export async function markPaymentAsPaid(orderId, transactionId = '') {
  try {
    // Get current timeline
    const { data: currentOrder } = await supabase
      .from('orders')
      .select('timeline')
      .eq('id', orderId)
      .single();

    const timeline = currentOrder?.timeline || [];
    const now = new Date().toISOString();

    // Update payment status
    const { error: paymentError } = await supabase
      .from('payments')
      .update({
        payment_status: 'awaiting_verification',
        transaction_id: transactionId || null,
        gateway_response: {
          marked_paid_at: now,
          transaction_id: transactionId,
        },
      })
      .eq('order_id', orderId);

    if (paymentError) throw paymentError;

    // Update order
    const { data, error: orderError } = await supabase
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
      .single();

    if (orderError) throw orderError;

    return { success: true, data };
  } catch (error) {
    console.error('Error marking payment:', error);
    return {
      success: false,
      error: error.message || 'Failed to update payment status',
    };
  }
}

/**
 * Get order by ID
 */
export async function getOrderById(orderId) {
  try {
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
 * Get user's orders
 */
export async function getUserOrders(page = 1, pageSize = 10) {
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

/**
 * Cancel order (only if not shipped)
 */
export async function cancelOrder(orderId, reason = '') {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Please login to cancel order');
    }

    // Get order
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('status, user_id')
      .eq('id', orderId)
      .single();

    if (fetchError) throw fetchError;

    // Check ownership
    if (order.user_id !== user.id) {
      throw new Error('Unauthorized');
    }

    // Check if can be cancelled
    if (['shipped', 'delivered', 'cancelled'].includes(order.status)) {
      throw new Error('Order cannot be cancelled at this stage');
    }

    // Get current timeline
    const { data: currentOrder } = await supabase
      .from('orders')
      .select('timeline')
      .eq('id', orderId)
      .single();

    const timeline = currentOrder?.timeline || [];
    const now = new Date().toISOString();

    // Cancel order
    const { data, error } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        updated_at: now,
        timeline: [
          ...timeline,
          {
            status: 'cancelled',
            timestamp: now,
            message: reason ? `Order cancelled: ${reason}` : 'Order cancelled by customer',
          },
        ],
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error cancelling order:', error);
    return {
      success: false,
      error: error.message || 'Failed to cancel order',
    };
  }
}

/**
 * ADMIN: Get all orders
 */
export async function getAllOrders(filters = {}, page = 1, pageSize = 20) {
  try {
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    let query = supabase
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
            images
          )
        ),
        payments (*)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(start, end);

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.payment_status) {
      query = query.eq('payment_status', filters.payment_status);
    }

    const { data, error, count } = await query;

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

/**
 * ADMIN: Verify payment and confirm order
 */
export async function verifyPayment(orderId, isVerified, notes = '') {
  try {
    if (isVerified) {
      // Get current order to append to timeline
      const { data: currentOrder } = await supabase
        .from('orders')
        .select('timeline')
        .eq('id', orderId)
        .single();

      const timeline = currentOrder?.timeline || [];
      const now = new Date().toISOString();

      // Update payment
      await supabase
        .from('payments')
        .update({
          payment_status: 'paid',
          payment_date: now,
        })
        .eq('order_id', orderId);

      // Update order
      const { data, error } = await supabase
        .from('orders')
        .update({
          status: 'confirmed',
          payment_status: 'paid',
          timeline: [
            ...timeline,
            {
              status: 'confirmed',
              timestamp: now,
              message: 'Payment verified and order confirmed',
            },
          ],
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;

      // Deduct stock
      const { data: items } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', orderId);

      for (const item of items) {
        await supabase.rpc('decrement_stock', {
          p_product_id: item.product_id,
          p_quantity: item.quantity,
        });
      }

      return { success: true, data };
    } else {
      // Get current order to append to timeline
      const { data: currentOrder } = await supabase
        .from('orders')
        .select('timeline')
        .eq('id', orderId)
        .single();

      const timeline = currentOrder?.timeline || [];
      const now = new Date().toISOString();

      // Payment failed
      await supabase
        .from('payments')
        .update({
          payment_status: 'failed',
          gateway_response: { admin_notes: notes },
        })
        .eq('order_id', orderId);

      const { data, error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          payment_status: 'failed',
          timeline: [
            ...timeline,
            {
              status: 'cancelled',
              timestamp: now,
              message: 'Payment verification failed - Order cancelled',
            },
          ],
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    return {
      success: false,
      error: error.message || 'Failed to verify payment',
    };
  }
}

/**
 * ADMIN: Update order status
 */
export async function updateOrderStatus(orderId, status) {
  try {
    // Get current order to append to timeline
    const { data: currentOrder } = await supabase
      .from('orders')
      .select('timeline')
      .eq('id', orderId)
      .single();

    const timeline = currentOrder?.timeline || [];
    const now = new Date().toISOString();

    // Status messages
    const statusMessages = {
      pending: 'Order is pending',
      confirmed: 'Order confirmed',
      processing: 'Order is being processed',
      shipped: 'Order has been shipped',
      delivered: 'Order delivered successfully',
      cancelled: 'Order cancelled',
    };

    const { data, error } = await supabase
      .from('orders')
      .update({
        status,
        updated_at: now,
        timeline: [
          ...timeline,
          {
            status,
            timestamp: now,
            message: statusMessages[status] || `Order status updated to ${status}`,
          },
        ],
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating order:', error);
    return {
      success: false,
      error: error.message || 'Failed to update order',
    };
  }
}

/**
 * Get dashboard stats
 */
export async function getDashboardStats() {
  try {
    // Total orders
    const { count: totalOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    // Total revenue
    const { data: revenueData } = await supabase
      .from('orders')
      .select('total')
      .eq('payment_status', 'paid');

    const totalRevenue =
      revenueData?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;

    // Pending orders
    const { count: pendingOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    return {
      success: true,
      data: {
        totalOrders: totalOrders || 0,
        totalRevenue,
        pendingOrders: pendingOrders || 0,
      },
    };
  } catch (error) {
    console.error('Error fetching stats:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch stats',
    };
  }
}

/**
 * Get recent orders
 */
export async function getRecentOrders(limit = 10) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return {
      success: true,
      data: data || [],
    };
  } catch (error) {
    console.error('Error fetching recent orders:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch recent orders',
      data: [],
    };
  }
}
