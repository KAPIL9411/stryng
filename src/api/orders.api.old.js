import { supabase } from '../lib/supabaseClient';
import { batchDecrementStock } from './batch.api';
import { monitorQuery } from '../utils/queryMonitor';

/**
 * Create a new order with atomic operations (Shopify-inspired)
 * Prevents race conditions and ensures data integrity
 * @param {Object} orderData - Order details
 * @returns {Promise<Object>} Created order
 */
export async function createOrder(orderData) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Generate order ID
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Prepare items for atomic function
    const items = orderData.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      selectedSize: item.selectedSize,
      selectedColor: item.selectedColor,
      price: item.price,
    }));

    // Use atomic order creation function
    const { data, error } = await monitorQuery(
      'create_order_atomic',
      async () =>
        await supabase.rpc('create_order_atomic', {
          p_order_id: orderId,
          p_user_id: user.id,
          p_total: orderData.total,
          p_items: items,
          p_address: orderData.address,
          p_payment_method: orderData.paymentMethod || 'upi',
        })
    );

    if (error) throw error;

    if (!data.success) {
      throw new Error(data.error || 'Failed to create order');
    }

    // Fetch complete order data
    const { data: order, error: fetchError } = await monitorQuery(
      'getOrderById',
      async () =>
        await supabase
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
            `
          )
          .eq('id', orderId)
          .single()
    );

    if (fetchError) throw fetchError;

    return { success: true, data: order };
  } catch (error) {
    console.error('Error creating order:', error);
    return {
      success: false,
      error: error.message,
      code: error.code,
    };
  }
}

/**
 * Get order by ID
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Order details
 */
export async function getOrderById(orderId) {
  try {
    const { data: order, error } = await monitorQuery(
      'getOrderById',
      async () =>
        await supabase
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
                payments (*),
                shipments (*)
            `
          )
          .eq('id', orderId)
          .single()
    );

    if (error) throw error;

    return { success: true, data: order };
  } catch (error) {
    console.error('Error fetching order:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all orders for current user with pagination
 * @param {number} page - Page number (default: 1)
 * @param {number} pageSize - Items per page (default: 10)
 * @returns {Promise<Object>} User orders with pagination info
 */
export async function getUserOrders(page = 1, pageSize = 10) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    const { data: orders, error, count } = await monitorQuery(
      'getUserOrders',
      async () =>
        await supabase
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
          .range(start, end)
    );

    if (error) throw error;

    return {
      success: true,
      data: orders,
      pagination: {
        currentPage: page,
        pageSize,
        totalItems: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
        hasNext: end < (count || 0) - 1,
        hasPrev: page > 1,
      },
    };
  } catch (error) {
    console.error('Error fetching user orders:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update order status
 * @param {string} orderId - Order ID
 * @param {string} status - New status
 * @param {Object} additionalData - Additional data to update
 * @returns {Promise<Object>} Updated order
 */
export async function updateOrderStatus(orderId, status, additionalData = {}) {
  try {
    const updateData = {
      status,
      ...additionalData,
    };

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating order status:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Cancel order (only if not shipped)
 * @param {string} orderId - Order ID
 * @param {string} reason - Cancellation reason
 * @returns {Promise<Object>} Result
 */
export async function cancelOrder(orderId, reason) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get order to check status
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('status, user_id')
      .eq('id', orderId)
      .single();

    if (fetchError) throw fetchError;

    // Check if user owns the order
    if (order.user_id !== user.id) {
      throw new Error('Unauthorized');
    }

    // Check if order can be cancelled
    if (
      ['shipped', 'out_for_delivery', 'delivered', 'cancelled'].includes(
        order.status
      )
    ) {
      throw new Error('Order cannot be cancelled at this stage');
    }

    // Update order status
    const { data, error } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        timeline: [
          ...order.timeline,
          {
            status: 'Cancelled',
            time: new Date().toISOString(),
            completed: true,
            current: true,
            note: reason,
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
    return { success: false, error: error.message };
  }
}

/**
 * Mark payment as paid (customer confirms)
 * @param {string} orderId - Order ID
 * @param {string} transactionId - UPI transaction ID (optional)
 * @returns {Promise<Object>} Result
 */
export async function markPaymentAsPaid(orderId, transactionId = '') {
  try {
    // Update payment status
    const { error: paymentError } = await supabase
      .from('payments')
      .update({
        payment_status: 'awaiting_verification',
        transaction_id: transactionId || null,
        gateway_response: {
          marked_paid_at: new Date().toISOString(),
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
      })
      .eq('id', orderId)
      .select()
      .single();

    if (orderError) throw orderError;

    return { success: true, data };
  } catch (error) {
    console.error('Error marking payment as paid:', error);
    return { success: false, error: error.message };
  }
}

/**
 * ADMIN: Get all orders with filters and pagination
 * @param {Object} filters - Filter options
 * @param {number} page - Page number (default: 1)
 * @param {number} pageSize - Items per page (default: 20)
 * @returns {Promise<Object>} Orders list with pagination info
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
                profiles!orders_user_id_fkey (
                    email,
                    full_name,
                    phone
                ),
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
    if (filters.from_date) {
      query = query.gte('created_at', filters.from_date);
    }
    if (filters.to_date) {
      query = query.lte('created_at', filters.to_date);
    }

    const { data, error, count } = await monitorQuery(
      'getAllOrders',
      async () => await query
    );

    if (error) throw error;

    return {
      success: true,
      data,
      pagination: {
        currentPage: page,
        pageSize,
        totalItems: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
        hasNext: end < (count || 0) - 1,
        hasPrev: page > 1,
      },
    };
  } catch (error) {
    console.error('Error fetching all orders:', error);
    return { success: false, error: error.message };
  }
}

/**
 * ADMIN: Verify payment and confirm order
 * @param {string} orderId - Order ID
 * @param {boolean} isVerified - Payment verified or not
 * @param {string} notes - Admin notes
 * @returns {Promise<Object>} Result
 */
export async function verifyPayment(orderId, isVerified, notes = '') {
  try {
    if (isVerified) {
      // Update payment status
      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          payment_status: 'success',
          payment_date: new Date().toISOString(),
        })
        .eq('order_id', orderId);

      if (paymentError) throw paymentError;

      // Update order status
      const { data, error: orderError } = await supabase
        .from('orders')
        .update({
          status: 'confirmed',
          payment_status: 'success',
        })
        .eq('id', orderId)
        .select()
        .single();

      if (orderError) throw orderError;

      // Deduct inventory using batch operation
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', orderId);

      // Use batch decrement to avoid N+1 pattern
      await batchDecrementStock(orderItems);

      return { success: true, data };
    } else {
      // Payment not verified - mark as failed
      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          payment_status: 'failed',
          gateway_response: { admin_notes: notes },
        })
        .eq('order_id', orderId);

      if (paymentError) throw paymentError;

      const { data, error: orderError } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          payment_status: 'failed',
        })
        .eq('id', orderId)
        .select()
        .single();

      if (orderError) throw orderError;

      return { success: true, data };
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    return { success: false, error: error.message };
  }
}

/**
 * ADMIN: Update shipping details
 * @param {string} orderId - Order ID
 * @param {Object} shippingData - Shipping details
 * @returns {Promise<Object>} Result
 */
export async function updateShippingDetails(orderId, shippingData) {
  try {
    // Create or update shipment
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .upsert({
        order_id: orderId,
        ...shippingData,
        shipped_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (shipmentError) throw shipmentError;

    // Update order status
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .update({
        status: 'shipped',
      })
      .eq('id', orderId)
      .select()
      .single();

    if (orderError) throw orderError;

    return { success: true, data: { order, shipment } };
  } catch (error) {
    console.error('Error updating shipping details:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get dashboard statistics
 * @returns {Promise<Object>} Dashboard stats
 */
export async function getDashboardStats() {
  try {
    // Get total orders
    const { count: totalOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    // Get total customers
    const { count: totalCustomers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Get total revenue (successful payments only)
    const { data: revenueData } = await supabase
      .from('orders')
      .select('total')
      .eq('payment_status', 'success');

    const totalRevenue = revenueData?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;

    // Get pending orders
    const { count: pendingOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'payment_pending');

    return {
      success: true,
      data: {
        totalOrders: totalOrders || 0,
        totalCustomers: totalCustomers || 0,
        totalRevenue,
        pendingOrders: pendingOrders || 0,
      },
    };
  } catch (error) {
    console.error('❌ getDashboardStats error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get recent orders
 * @param {number} limit - Number of orders to fetch
 * @returns {Promise<Object>} Recent orders
 */
export async function getRecentOrders(limit = 10) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        profiles!orders_user_id_fkey (
          email,
          full_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return {
      success: true,
      data: data || [],
    };
  } catch (error) {
    console.error('❌ getRecentOrders error:', error);
    return {
      success: false,
      error: error.message,
      data: [],
    };
  }
}
