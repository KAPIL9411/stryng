/**
 * Coupons API - Firebase Firestore
 * Handles coupon validation and usage tracking
 * @module api/coupons
 */

import { serverTimestamp, Timestamp } from 'firebase/firestore';
import {
  COLLECTIONS,
  getDocument,
  getDocuments,
  addDocument,
  updateDocument,
  deleteDocument,
  incrementField,
} from '../lib/firestoreHelpers';

/**
 * Validate a coupon code
 * @param {string} code - Coupon code
 * @param {string} userId - User ID
 * @param {number} orderTotal - Order total amount
 * @returns {Promise<Object>} Validation result
 */
export const validateCoupon = async (code, userId, orderTotal) => {
  try {
    console.log('🎫 Validating coupon:', { code, userId, orderTotal });
    
    // Find coupon by code (case-insensitive)
    const coupons = await getDocuments(COLLECTIONS.COUPONS, {
      where: [['code', '==', code.toUpperCase()]],
      limit: 1,
    });

    console.log('🎫 Found coupons:', coupons);

    if (coupons.length === 0) {
      return {
        success: true,
        data: {
          valid: false,
          error: 'Invalid coupon code',
        },
      };
    }

    const coupon = coupons[0];
    console.log('🎫 Coupon data:', coupon);

    // Check if coupon is active - check multiple possible field names
    const isActive = coupon.is_active ?? coupon.isActive ?? coupon.active ?? true;
    console.log('🎫 Is active check:', { is_active: coupon.is_active, isActive: coupon.isActive, active: coupon.active, result: isActive });
    
    if (!isActive) {
      return {
        success: true,
        data: {
          valid: false,
          error: 'This coupon is no longer active',
        },
      };
    }

    // Check validity period
    const now = new Date();
    const startDate = coupon.start_date?.toDate?.() || new Date(coupon.start_date);
    const endDate = coupon.end_date?.toDate?.() || new Date(coupon.end_date);

    console.log('🎫 Date check:', { now, startDate, endDate });

    if (now < startDate) {
      return {
        success: true,
        data: {
          valid: false,
          error: 'This coupon is not yet valid',
        },
      };
    }

    if (now > endDate) {
      return {
        success: true,
        data: {
          valid: false,
          error: 'This coupon has expired',
        },
      };
    }

    // Check minimum order value
    const minOrderValue = coupon.min_order_value || coupon.minOrderValue || 0;
    console.log('🎫 Min order check:', { orderTotal, minOrderValue });
    
    if (orderTotal < minOrderValue) {
      return {
        success: true,
        data: {
          valid: false,
          error: `Minimum order value of ₹${minOrderValue} required`,
        },
      };
    }

    // Check max uses
    const maxUses = coupon.max_uses || coupon.maxUses;
    const usedCount = coupon.used_count || coupon.usedCount || 0;
    console.log('🎫 Usage check:', { maxUses, usedCount });
    
    if (maxUses && usedCount >= maxUses) {
      return {
        success: true,
        data: {
          valid: false,
          error: 'Coupon usage limit reached',
        },
      };
    }

    // Check per-user usage
    const userUsage = await getDocuments(COLLECTIONS.COUPON_USAGE, {
      where: [
        ['coupon_id', '==', coupon.id],
        ['user_id', '==', userId],
      ],
    });

    const maxUsesPerUser = coupon.max_uses_per_user || coupon.maxUsesPerUser || 1;
    console.log('🎫 Per-user usage check:', { userUsageCount: userUsage.length, maxUsesPerUser });
    
    if (userUsage.length >= maxUsesPerUser) {
      return {
        success: true,
        data: {
          valid: false,
          error: 'You have already used this coupon',
        },
      };
    }

    // Calculate discount
    const discountType = coupon.discount_type || coupon.discountType || 'percentage';
    const discountValue = parseFloat(coupon.discount_value || coupon.discountValue || 0);
    const maxDiscount = parseFloat(coupon.max_discount || coupon.maxDiscount || 0);
    
    console.log('🎫 Discount calculation:', { discountType, discountValue, maxDiscount, orderTotal });
    
    let discountAmount = 0;
    
    if (discountType === 'percentage') {
      discountAmount = (orderTotal * discountValue) / 100;
      console.log('🎫 Percentage discount calculated:', discountAmount);
      
      if (maxDiscount && discountAmount > maxDiscount) {
        console.log('🎫 Capping discount at max:', maxDiscount);
        discountAmount = maxDiscount;
      }
    } else if (discountType === 'fixed' || discountType === 'flat') {
      discountAmount = discountValue;
      console.log('🎫 Fixed discount:', discountAmount);
    } else {
      console.warn('🎫 Unknown discount type:', discountType);
      discountAmount = discountValue;
    }

    // Ensure discount doesn't exceed order total
    if (discountAmount > orderTotal) {
      console.log('🎫 Discount exceeds order total, capping at:', orderTotal);
      discountAmount = orderTotal;
    }
    
    // Ensure discount is a valid number
    if (isNaN(discountAmount) || discountAmount < 0) {
      console.error('🎫 Invalid discount amount:', discountAmount);
      return {
        success: true,
        data: {
          valid: false,
          error: 'Invalid coupon configuration. Please contact support.',
        },
      };
    }

    const finalDiscount = Math.round(discountAmount * 100) / 100;
    console.log('🎫 Final discount amount:', finalDiscount);

    return {
      success: true,
      data: {
        valid: true,
        coupon_id: coupon.id,
        code: coupon.code,
        description: coupon.description || '',
        discount_type: discountType,
        discount_value: discountValue,
        discount_amount: finalDiscount,
      },
    };
  } catch (error) {
    console.error('Error validating coupon:', error);
    return {
      success: false,
      error: 'Unable to validate coupon. Please try again.',
    };
  }
};

/**
 * Get all active coupons
 * @returns {Promise<Array>} Active coupons
 */
export const getActiveCoupons = async () => {
  try {
    console.log('🎫 API: Fetching active coupons...');
    const now = Timestamp.now();
    
    // Get all coupons - use camelCase field names to match admin API
    const coupons = await getDocuments(COLLECTIONS.COUPONS, {
      orderBy: [['createdAt', 'desc']],
    });
    
    console.log('🎫 API: Total coupons in database:', coupons.length);
    console.log('🎫 API: All coupons:', coupons);

    // Filter by active status and date range - use camelCase field names
    const activeCoupons = coupons.filter((coupon) => {
      // Check if coupon is active (default to true if not specified)
      const isActive = coupon.isActive !== false;
      
      if (!isActive) {
        console.log('🎫 API: Coupon inactive:', coupon.code);
        return false;
      }

      // Check date validity
      const startDate = coupon.startDate?.toDate?.() || new Date(coupon.startDate);
      const endDate = coupon.endDate?.toDate?.() || new Date(coupon.endDate);
      const nowDate = now.toDate();
      
      // Set to start/end of day for more lenient comparison
      const startOfToday = new Date(nowDate);
      startOfToday.setHours(0, 0, 0, 0);
      
      const endOfEndDate = new Date(endDate);
      endOfEndDate.setHours(23, 59, 59, 999);
      
      const startOfStartDate = new Date(startDate);
      startOfStartDate.setHours(0, 0, 0, 0);
      
      const isValid = startOfToday >= startOfStartDate && startOfToday <= endOfEndDate;
      
      if (!isValid) {
        console.log('🎫 API: Coupon date invalid:', coupon.code, {
          now: nowDate.toISOString(),
          start: startDate.toISOString(),
          end: endDate.toISOString()
        });
      }
      
      return isValid;
    });
    
    console.log('🎫 API: Active coupons after filtering:', activeCoupons.length);
    console.log('🎫 API: Active coupons:', activeCoupons);
    return activeCoupons;
  } catch (error) {
    console.error('🎫 API: Error fetching active coupons:', error);
    return [];
  }
};

/**
 * Get all coupons (Admin only)
 * @returns {Promise<Array>} All coupons
 */
export const getAllCoupons = async () => {
  try {
    return await getDocuments(COLLECTIONS.COUPONS, {
      orderBy: [['created_at', 'desc']],
    });
  } catch (error) {
    console.error('Error fetching all coupons:', error);
    return [];
  }
};

/**
 * Create a new coupon (Admin only)
 * @param {Object} couponData - Coupon data
 * @returns {Promise<string>} New coupon ID
 */
export const createCoupon = async (couponData) => {
  try {
    const couponId = await addDocument(COLLECTIONS.COUPONS, {
      ...couponData,
      code: couponData.code.toUpperCase(),
      used_count: 0,
      is_active: couponData.is_active !== false,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });

    return couponId;
  } catch (error) {
    console.error('Error creating coupon:', error);
    throw error;
  }
};

/**
 * Update a coupon (Admin only)
 * @param {string} couponId - Coupon ID
 * @param {Object} couponData - Updated coupon data
 * @returns {Promise<void>}
 */
export const updateCoupon = async (couponId, couponData) => {
  try {
    const updates = { ...couponData };
    if (updates.code) {
      updates.code = updates.code.toUpperCase();
    }

    await updateDocument(COLLECTIONS.COUPONS, couponId, {
      ...updates,
      updated_at: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating coupon:', error);
    throw error;
  }
};

/**
 * Delete a coupon (Admin only)
 * @param {string} couponId - Coupon ID
 * @returns {Promise<void>}
 */
export const deleteCoupon = async (couponId) => {
  try {
    await deleteDocument(COLLECTIONS.COUPONS, couponId);
  } catch (error) {
    console.error('Error deleting coupon:', error);
    throw error;
  }
};

/**
 * Increment coupon usage count
 * @param {string} couponId - Coupon ID
 * @returns {Promise<void>}
 */
export const incrementCouponUsage = async (couponId) => {
  try {
    await incrementField(COLLECTIONS.COUPONS, couponId, 'used_count', 1);
  } catch (error) {
    console.error('Error incrementing coupon usage:', error);
    throw error;
  }
};

export default {
  validateCoupon,
  getActiveCoupons,
  getAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  incrementCouponUsage,
};
