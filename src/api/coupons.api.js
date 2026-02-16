/**
 * Customer Coupon API
 * Handles coupon validation and application for customers
 * @module api/coupons
 */

import { supabase } from '../lib/supabaseClient';

/**
 * Validate and get discount for a coupon
 * @param {string} code - Coupon code
 * @param {string} userId - User ID
 * @param {number} orderTotal - Order total amount
 * @returns {Promise<Object>} Validation result with discount details
 */
export async function validateCoupon(code, userId, orderTotal) {
  try {
    if (!code || !userId || orderTotal === undefined) {
      return {
        success: false,
        data: { valid: false, error: 'Code, userId, and orderTotal are required' }
      };
    }

    if (orderTotal < 0) {
      return {
        success: false,
        data: { valid: false, error: 'Order total must be non-negative' }
      };
    }

    // Call the database function for validation
    const { data, error } = await supabase
      .rpc('validate_coupon', {
        p_code: code.toUpperCase(),
        p_user_id: userId,
        p_order_total: orderTotal
      });

    if (error) {
      console.error('Database error validating coupon:', error);
      return {
        success: false,
        data: { valid: false, error: error.message || 'Failed to validate coupon' }
      };
    }

    // The database function returns a JSON object
    // Supabase RPC returns it directly in the data field
    return {
      success: true,
      data: data // This is the JSON object from the database function
    };
  } catch (error) {
    console.error('Error validating coupon:', error);
    return {
      success: false,
      data: { valid: false, error: error.message || 'Failed to validate coupon' }
    };
  }
}

/**
 * Get available coupons for current cart
 * @param {number} orderTotal - Current cart total
 * @returns {Promise<Array>} List of applicable coupons
 */
export async function getAvailableCoupons(orderTotal) {
  try {
    if (orderTotal === undefined || orderTotal < 0) {
      throw new Error('Valid order total is required');
    }

    const now = new Date().toISOString();

    // Get active coupons that meet minimum order value
    const { data, error } = await supabase
      .from('coupons')
      .select('id, code, description, discount_type, discount_value, max_discount, min_order_value, max_uses, used_count')
      .eq('is_active', true)
      .lte('start_date', now)
      .gte('end_date', now)
      .lte('min_order_value', orderTotal)
      .order('discount_value', { ascending: false });

    if (error) {
      throw error;
    }

    // Filter out coupons that have reached max uses
    const availableCoupons = (data || []).filter(coupon => {
      if (coupon.max_uses === null) return true;
      return coupon.used_count < coupon.max_uses;
    });

    return availableCoupons;
  } catch (error) {
    console.error('Error fetching available coupons:', error);
    throw error;
  }
}

/**
 * Record coupon usage after successful order
 * @param {string} couponId - Coupon ID
 * @param {string} userId - User ID
 * @param {string} orderId - Order ID
 * @param {number} discountAmount - Discount amount applied
 * @returns {Promise<Object>} Usage record
 */
export async function recordCouponUsage(couponId, userId, orderId, discountAmount) {
  try {
    if (!couponId || !userId || !orderId || discountAmount === undefined) {
      throw new Error('All parameters are required: couponId, userId, orderId, discountAmount');
    }

    if (discountAmount < 0) {
      throw new Error('Discount amount must be non-negative');
    }

    // Insert usage record
    const { data: usageData, error: usageError } = await supabase
      .from('coupon_usage')
      .insert([{
        coupon_id: couponId,
        user_id: userId,
        order_id: orderId,
        discount_amount: discountAmount
      }])
      .select()
      .single();

    if (usageError) {
      throw usageError;
    }

    // Increment used_count in coupons table
    const { error: updateError } = await supabase
      .rpc('increment', { 
        row_id: couponId, 
        x: 1 
      });

    // If increment function doesn't exist, use manual update
    if (updateError) {
      const { data: coupon } = await supabase
        .from('coupons')
        .select('used_count')
        .eq('id', couponId)
        .single();

      if (coupon) {
        await supabase
          .from('coupons')
          .update({ used_count: coupon.used_count + 1 })
          .eq('id', couponId);
      }
    }

    return usageData;
  } catch (error) {
    console.error('Error recording coupon usage:', error);
    throw error;
  }
}
