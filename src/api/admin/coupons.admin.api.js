/**
 * Admin Coupon Management API
 * Handles CRUD operations for coupon management
 * @module api/admin/coupons
 */

import { supabase } from '../../lib/supabaseClient';

/**
 * Create new coupon
 * @param {Object} couponData - Coupon data
 * @returns {Promise<Object>} Created coupon
 */
export async function createCoupon(couponData) {
  try {
    // Validate required fields
    if (!couponData.code || !couponData.discount_type || !couponData.discount_value) {
      throw new Error('Missing required fields: code, discount_type, and discount_value are required');
    }

    // Validate discount type
    if (!['percentage', 'fixed'].includes(couponData.discount_type)) {
      throw new Error('Invalid discount_type. Must be "percentage" or "fixed"');
    }

    // Validate discount value
    if (couponData.discount_value <= 0) {
      throw new Error('Discount value must be positive');
    }

    // Validate percentage discount
    if (couponData.discount_type === 'percentage' && (couponData.discount_value < 0 || couponData.discount_value > 100)) {
      throw new Error('Percentage discount must be between 0 and 100');
    }

    // Validate dates
    if (!couponData.start_date || !couponData.end_date) {
      throw new Error('Start date and end date are required');
    }

    if (new Date(couponData.end_date) <= new Date(couponData.start_date)) {
      throw new Error('End date must be after start date');
    }

    // Validate coupon code format (alphanumeric, 4-20 chars)
    const codeRegex = /^[A-Z0-9]{4,20}$/;
    const upperCode = couponData.code.toUpperCase();
    if (!codeRegex.test(upperCode)) {
      throw new Error('Coupon code must be 4-20 alphanumeric characters');
    }

    // Prepare coupon data with uppercase code
    const couponToInsert = {
      ...couponData,
      code: upperCode,
      used_count: 0,
      is_active: couponData.is_active !== undefined ? couponData.is_active : true,
      min_order_value: couponData.min_order_value || 0,
      max_uses_per_user: couponData.max_uses_per_user || 1
    };

    // Insert coupon into database
    const { data, error } = await supabase
      .from('coupons')
      .insert([couponToInsert])
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation
      if (error.code === '23505') {
        throw new Error('Coupon code already exists');
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error creating coupon:', error);
    throw error;
  }
}

/**
 * Get all coupons with optional filters
 * @param {Object} filters - Filter options (status, search, etc.)
 * @param {string} filters.status - Filter by status: 'active', 'inactive', 'expired', or 'all'
 * @param {string} filters.search - Search by coupon code
 * @returns {Promise<Array>} List of coupons with usage statistics
 */
export async function getCoupons(filters = {}) {
  try {
    let query = supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      const now = new Date().toISOString();
      
      if (filters.status === 'active') {
        query = query
          .eq('is_active', true)
          .lte('start_date', now)
          .gte('end_date', now);
      } else if (filters.status === 'inactive') {
        query = query.eq('is_active', false);
      } else if (filters.status === 'expired') {
        query = query.lt('end_date', now);
      }
    }

    // Apply search filter (case-insensitive)
    if (filters.search) {
      query = query.ilike('code', `%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching coupons:', error);
    throw error;
  }
}

/**
 * Get single coupon by ID
 * @param {string} id - Coupon ID
 * @returns {Promise<Object>} Coupon data
 */
export async function getCouponById(id) {
  try {
    if (!id) {
      throw new Error('Coupon ID is required');
    }

    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Coupon not found');
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching coupon by ID:', error);
    throw error;
  }
}

/**
 * Update coupon
 * @param {string} id - Coupon ID
 * @param {Object} couponData - Updated coupon data
 * @returns {Promise<Object>} Updated coupon
 */
export async function updateCoupon(id, couponData) {
  try {
    if (!id) {
      throw new Error('Coupon ID is required');
    }

    // Validate discount type if provided
    if (couponData.discount_type && !['percentage', 'fixed'].includes(couponData.discount_type)) {
      throw new Error('Invalid discount_type. Must be "percentage" or "fixed"');
    }

    // Validate discount value if provided
    if (couponData.discount_value !== undefined && couponData.discount_value <= 0) {
      throw new Error('Discount value must be positive');
    }

    // Validate percentage discount if provided
    if (couponData.discount_type === 'percentage' && couponData.discount_value !== undefined) {
      if (couponData.discount_value < 0 || couponData.discount_value > 100) {
        throw new Error('Percentage discount must be between 0 and 100');
      }
    }

    // Validate dates if provided
    if (couponData.start_date && couponData.end_date) {
      if (new Date(couponData.end_date) <= new Date(couponData.start_date)) {
        throw new Error('End date must be after start date');
      }
    }

    // Prepare update data (exclude code - cannot be changed)
    const { code, used_count, created_at, ...updateData } = couponData;
    updateData.updated_at = new Date().toISOString();

    // Update coupon in database
    const { data, error } = await supabase
      .from('coupons')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Coupon not found');
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error updating coupon:', error);
    throw error;
  }
}

/**
 * Delete coupon
 * @param {string} id - Coupon ID
 * @returns {Promise<void>}
 */
export async function deleteCoupon(id) {
  try {
    if (!id) {
      throw new Error('Coupon ID is required');
    }

    // Check if coupon has been used
    const { data: coupon, error: fetchError } = await supabase
      .from('coupons')
      .select('used_count')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        throw new Error('Coupon not found');
      }
      throw fetchError;
    }

    if (coupon.used_count > 0) {
      throw new Error('Cannot delete coupon with existing usage');
    }

    // Delete coupon
    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error deleting coupon:', error);
    throw error;
  }
}

/**
 * Toggle coupon active status
 * @param {string} id - Coupon ID
 * @returns {Promise<Object>} Updated coupon
 */
export async function toggleCouponStatus(id) {
  try {
    if (!id) {
      throw new Error('Coupon ID is required');
    }

    // Get current status
    const { data: coupon, error: fetchError } = await supabase
      .from('coupons')
      .select('is_active')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        throw new Error('Coupon not found');
      }
      throw fetchError;
    }

    // Toggle status
    const { data, error } = await supabase
      .from('coupons')
      .update({ 
        is_active: !coupon.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error toggling coupon status:', error);
    throw error;
  }
}

/**
 * Get coupon usage statistics
 * @param {string} id - Coupon ID
 * @returns {Promise<Object>} Usage statistics
 */
export async function getCouponStats(id) {
  try {
    if (!id) {
      throw new Error('Coupon ID is required');
    }

    // Get coupon basic info
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .select('*')
      .eq('id', id)
      .single();

    if (couponError) {
      if (couponError.code === 'PGRST116') {
        throw new Error('Coupon not found');
      }
      throw couponError;
    }

    // Get usage details
    const { data: usageData, error: usageError } = await supabase
      .from('coupon_usage')
      .select('discount_amount, user_id, created_at')
      .eq('coupon_id', id);

    if (usageError) {
      throw usageError;
    }

    // Calculate statistics
    const totalUsage = usageData?.length || 0;
    const totalDiscountGiven = usageData?.reduce((sum, usage) => sum + parseFloat(usage.discount_amount), 0) || 0;
    const uniqueUsers = new Set(usageData?.map(usage => usage.user_id)).size;

    return {
      coupon,
      stats: {
        total_usage: totalUsage,
        total_discount_given: totalDiscountGiven,
        unique_users: uniqueUsers,
        remaining_uses: coupon.max_uses ? Math.max(0, coupon.max_uses - totalUsage) : null,
        usage_percentage: coupon.max_uses ? (totalUsage / coupon.max_uses * 100).toFixed(2) : null
      },
      recent_usage: usageData?.slice(0, 10) || []
    };
  } catch (error) {
    console.error('Error fetching coupon stats:', error);
    throw error;
  }
}
