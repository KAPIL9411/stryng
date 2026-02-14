import { supabase } from '../lib/supabaseClient';

/**
 * Create a new order
 * @param {Object} orderData - Order details
 * @returns {Promise<Object>} Created order
 */
export async function createOrder(orderData) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Generate order ID
        const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        // Create order
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                id: orderId,
                user_id: user.id,
                total: orderData.total,
                status: 'payment_pending',
                payment_method: 'upi',
                payment_status: 'pending',
                address: orderData.address,
                timeline: orderData.timeline || [
                    { status: 'Order Placed', time: new Date().toISOString(), completed: true, current: true },
                    { status: 'Payment Verified', time: '', completed: false },
                    { status: 'Processing', time: '', completed: false },
                    { status: 'Shipped', time: '', completed: false },
                    { status: 'Delivered', time: '', completed: false },
                ]
            })
            .select()
            .single();

        if (orderError) throw orderError;

        // Create order items
        const orderItems = orderData.items.map(item => ({
            order_id: orderId,
            product_id: item.id,
            quantity: item.quantity,
            size: item.size,
            color: item.color,
            price: item.price
        }));

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);

        if (itemsError) throw itemsError;

        // Create payment record
        const { error: paymentError } = await supabase
            .from('payments')
            .insert({
                order_id: orderId,
                amount: orderData.total,
                payment_method: 'upi',
                payment_status: 'pending',
                transaction_id: orderData.transactionId || null
            });

        if (paymentError) throw paymentError;

        return { success: true, data: order };
    } catch (error) {
        console.error('Error creating order:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get order by ID
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Order details
 */
export async function getOrderById(orderId) {
    try {
        const { data: order, error } = await supabase
            .from('orders')
            .select(`
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
            `)
            .eq('id', orderId)
            .single();

        if (error) throw error;

        return { success: true, data: order };
    } catch (error) {
        console.error('Error fetching order:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get all orders for current user
 * @returns {Promise<Object>} User orders
 */
export async function getUserOrders() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data: orders, error } = await supabase
            .from('orders')
            .select(`
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
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return { success: true, data: orders };
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
            ...additionalData
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
        const { data: { user } } = await supabase.auth.getUser();
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
        if (['shipped', 'out_for_delivery', 'delivered', 'cancelled'].includes(order.status)) {
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
                        note: reason
                    }
                ]
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
                    transaction_id: transactionId
                }
            })
            .eq('order_id', orderId);

        if (paymentError) throw paymentError;

        // Update order
        const { data, error: orderError } = await supabase
            .from('orders')
            .update({
                payment_status: 'awaiting_verification',
                transaction_id: transactionId || null
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
 * ADMIN: Get all orders with filters
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Orders list
 */
export async function getAllOrders(filters = {}) {
    try {
        let query = supabase
            .from('orders')
            .select(`
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
            `)
            .order('created_at', { ascending: false });

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

        const { data, error } = await query;

        if (error) throw error;

        return { success: true, data };
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
                    payment_date: new Date().toISOString()
                })
                .eq('order_id', orderId);

            if (paymentError) throw paymentError;

            // Update order status
            const { data, error: orderError } = await supabase
                .from('orders')
                .update({
                    status: 'confirmed',
                    payment_status: 'success'
                })
                .eq('id', orderId)
                .select()
                .single();

            if (orderError) throw orderError;

            // Deduct inventory
            const { data: orderItems } = await supabase
                .from('order_items')
                .select('product_id, quantity')
                .eq('order_id', orderId);

            for (const item of orderItems) {
                await supabase.rpc('decrement_stock', {
                    product_id: item.product_id,
                    quantity: item.quantity
                });
            }

            return { success: true, data };
        } else {
            // Payment not verified - mark as failed
            const { error: paymentError } = await supabase
                .from('payments')
                .update({
                    payment_status: 'failed',
                    gateway_response: { admin_notes: notes }
                })
                .eq('order_id', orderId);

            if (paymentError) throw paymentError;

            const { data, error: orderError } = await supabase
                .from('orders')
                .update({
                    status: 'cancelled',
                    payment_status: 'failed'
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
                shipped_at: new Date().toISOString()
            })
            .select()
            .single();

        if (shipmentError) throw shipmentError;

        // Update order status
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .update({
                status: 'shipped'
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
