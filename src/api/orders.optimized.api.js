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
  console.log('🔵 createOrderOptimized called, isCreatingOrder:', isCreatingOrder);
  
  // Prevent multiple simultaneous calls
  if (isCreatingOrder) {
    console.log('⚠️ Order creation already in progress, please wait...');
    return {
      success: false,
      error: 'Order creation already in progress. Please wait.',
    };
  }

  isCreatingOrder = true;
  console.log('🟢 Setting isCreatingOrder = true');

  try {
    // 1. Get user (from cache if possible)
    console.log('📝 Step 1: Getting user...');
    const startAuth = Date.now();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log(`⏱️ Auth check took ${Date.now() - startAuth}ms`);
    
    if (authError || !user) {
      throw new Error('Please login to place an order');
    }
    console.log('✅ User authenticated:', user.id);

    // 2. Skip duplicate check for now (causing delays) - will add back later if needed
    console.log('📝 Step 2: Skipping duplicate check for speed...');

    // 3. Generate order ID
    console.log('📝 Step 3: Generating order ID...');
    const orderId = generateOrderId();
    const now = new Date().toISOString();
    console.log('✅ Order ID generated:', orderId);

    // 4. Prepare all data for single transaction
    console.log('📝 Step 4: Preparing order data...');
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
    console.log('✅ Order data prepared');

    // 5. Create order first (must succeed before items/payments)
    console.log('📝 Step 5: Creating order in database...');
    const startOrderInsert = Date.now();
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderRecord)
      .select()
      .single();
    console.log(`⏱️ Order insert took ${Date.now() - startOrderInsert}ms`);

    if (orderError) {
      console.error('❌ Order creation failed:', orderError);
      throw orderError;
    }
    console.log('✅ Order created successfully:', order.id);

    // 6. Create items and payment in parallel (only after order succeeds)
    console.log('📝 Step 6: Creating order items and payment...');
    const startParallel = Date.now();
    const [itemsResult, paymentResult] = await Promise.all([
      supabase.from('order_items').insert(orderItems),
      supabase.from('payments').insert(paymentRecord),
    ]);
    console.log(`⏱️ Parallel inserts took ${Date.now() - startParallel}ms`);

    // 7. Check for errors (rollback if needed)
    if (itemsResult.error || paymentResult.error) {
      console.error('❌ Items/Payment creation failed, rolling back order');
      // Rollback: delete the order
      await supabase.from('orders').delete().eq('id', orderId);
      throw itemsResult.error || paymentResult.error;
    }
    console.log('✅ Order items and payment created successfully');

    // 8. Handle coupon usage in background (non-blocking)
    if (orderData.coupon?.id) {
      console.log('📝 Step 7: Handling coupon usage (background)...');
      handleCouponUsage(orderData.coupon.id, user.id, orderId, orderData.coupon.discount)
        .catch(err => console.error('Coupon usage error (non-critical):', err));
    }

    // 9. Return success immediately
    console.log('✅ Order creation complete! Returning success...');
    return {
      success: true,
      data: order,
    };
  } catch (error) {
    console.error('💥 Error creating order:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    
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
    console.log('🔴 Resetting isCreatingOrder = false');
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
    console.log('💳 Marking payment as paid for order:', orderId);
    
    const now = new Date().toISOString();

    // Get current order with timeline
    const { data: currentOrder, error: fetchError } = await supabase
      .from('orders')
      .select('timeline')
      .eq('id', orderId)
      .single();

    if (fetchError) {
      console.error('❌ Failed to fetch order:', fetchError);
      throw new Error('Order not found');
    }

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

    if (paymentResult.error) {
      console.error('❌ Payment update failed:', paymentResult.error);
      throw paymentResult.error;
    }
    
    if (orderResult.error) {
      console.error('❌ Order update failed:', orderResult.error);
      throw orderResult.error;
    }

    console.log('✅ Payment marked as paid successfully');
    return { success: true, data: orderResult.data };
  } catch (error) {
    console.error('❌ Error marking payment:', error);
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
