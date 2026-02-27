/**
 * Admin Coupon Management API - Firebase Version
 * Handles CRUD operations for coupon management
 * @module api/admin/coupons
 */

import { db } from '../../lib/firebaseClient';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';

/**
 * Create new coupon
 * @param {Object} couponData - Coupon data
 * @returns {Promise<Object>} Created coupon
 */
export async function createCoupon(couponData) {
  try {
    // Validate required fields
    if (!couponData.code || !couponData.discountType || !couponData.discountValue) {
      throw new Error('Missing required fields: code, discountType, and discountValue are required');
    }

    // Validate discount type
    if (!['percentage', 'fixed'].includes(couponData.discountType)) {
      throw new Error('Invalid discountType. Must be "percentage" or "fixed"');
    }

    // Validate discount value
    if (couponData.discountValue <= 0) {
      throw new Error('Discount value must be positive');
    }

    // Validate percentage discount
    if (couponData.discountType === 'percentage' && (couponData.discountValue < 0 || couponData.discountValue > 100)) {
      throw new Error('Percentage discount must be between 0 and 100');
    }

    // Validate dates
    if (!couponData.startDate || !couponData.endDate) {
      throw new Error('Start date and end date are required');
    }

    if (new Date(couponData.endDate) <= new Date(couponData.startDate)) {
      throw new Error('End date must be after start date');
    }

    // Validate coupon code format (alphanumeric, 4-20 chars)
    const codeRegex = /^[A-Z0-9]{4,20}$/;
    const upperCode = couponData.code.toUpperCase();
    if (!codeRegex.test(upperCode)) {
      throw new Error('Coupon code must be 4-20 alphanumeric characters');
    }

    // Check if coupon code already exists
    const couponsRef = collection(db, 'coupons');
    const q = query(couponsRef, where('code', '==', upperCode));
    const existingCoupons = await getDocs(q);
    
    if (!existingCoupons.empty) {
      throw new Error('Coupon code already exists');
    }

    // Prepare coupon data
    const couponToInsert = {
      ...couponData,
      code: upperCode,
      usedCount: 0,
      isActive: couponData.isActive !== undefined ? couponData.isActive : true,
      minOrderValue: couponData.minOrderValue || 0,
      maxUsesPerUser: couponData.maxUsesPerUser || 1,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    // Insert coupon into Firestore
    const docRef = await addDoc(couponsRef, couponToInsert);
    const newCoupon = await getDoc(docRef);

    return { id: newCoupon.id, ...newCoupon.data() };
  } catch (error) {
    console.error('Error creating coupon:', error);
    throw error;
  }
}

/**
 * Get all coupons with optional filters
 * @param {Object} filters - Filter options (status, search, etc.)
 * @returns {Promise<Array>} List of coupons
 */
export async function getCoupons(filters = {}) {
  try {
    const couponsRef = collection(db, 'coupons');
    let q = query(couponsRef, orderBy('createdAt', 'desc'));

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      const now = new Date();
      
      if (filters.status === 'active') {
        q = query(
          couponsRef,
          where('isActive', '==', true),
          where('startDate', '<=', Timestamp.fromDate(now)),
          where('endDate', '>=', Timestamp.fromDate(now)),
          orderBy('createdAt', 'desc')
        );
      } else if (filters.status === 'inactive') {
        q = query(couponsRef, where('isActive', '==', false), orderBy('createdAt', 'desc'));
      } else if (filters.status === 'expired') {
        q = query(couponsRef, where('endDate', '<', Timestamp.fromDate(now)), orderBy('endDate', 'desc'));
      }
    }

    const snapshot = await getDocs(q);
    const coupons = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Apply search filter (client-side for Firebase)
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      return coupons.filter(coupon => 
        coupon.code.toLowerCase().includes(searchTerm)
      );
    }

    return coupons;
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

    const couponRef = doc(db, 'coupons', id);
    const couponDoc = await getDoc(couponRef);

    if (!couponDoc.exists()) {
      throw new Error('Coupon not found');
    }

    return { id: couponDoc.id, ...couponDoc.data() };
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
    if (couponData.discountType && !['percentage', 'fixed'].includes(couponData.discountType)) {
      throw new Error('Invalid discountType. Must be "percentage" or "fixed"');
    }

    // Validate discount value if provided
    if (couponData.discountValue !== undefined && couponData.discountValue <= 0) {
      throw new Error('Discount value must be positive');
    }

    // Validate percentage discount if provided
    if (couponData.discountType === 'percentage' && couponData.discountValue !== undefined) {
      if (couponData.discountValue < 0 || couponData.discountValue > 100) {
        throw new Error('Percentage discount must be between 0 and 100');
      }
    }

    // Validate dates if provided
    if (couponData.startDate && couponData.endDate) {
      if (new Date(couponData.endDate) <= new Date(couponData.startDate)) {
        throw new Error('End date must be after start date');
      }
    }

    // Prepare update data (exclude code - cannot be changed)
    const { code, usedCount, createdAt, ...updateData } = couponData;
    updateData.updatedAt = Timestamp.now();

    // Update coupon in Firestore
    const couponRef = doc(db, 'coupons', id);
    await updateDoc(couponRef, updateData);

    const updatedCoupon = await getDoc(couponRef);
    return { id: updatedCoupon.id, ...updatedCoupon.data() };
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
    const couponRef = doc(db, 'coupons', id);
    const couponDoc = await getDoc(couponRef);

    if (!couponDoc.exists()) {
      throw new Error('Coupon not found');
    }

    const coupon = couponDoc.data();
    if (coupon.usedCount > 0) {
      throw new Error('Cannot delete coupon with existing usage');
    }

    // Delete coupon
    await deleteDoc(couponRef);
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

    const couponRef = doc(db, 'coupons', id);
    const couponDoc = await getDoc(couponRef);

    if (!couponDoc.exists()) {
      throw new Error('Coupon not found');
    }

    const coupon = couponDoc.data();
    await updateDoc(couponRef, {
      isActive: !coupon.isActive,
      updatedAt: Timestamp.now(),
    });

    const updatedCoupon = await getDoc(couponRef);
    return { id: updatedCoupon.id, ...updatedCoupon.data() };
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
    const couponRef = doc(db, 'coupons', id);
    const couponDoc = await getDoc(couponRef);

    if (!couponDoc.exists()) {
      throw new Error('Coupon not found');
    }

    const coupon = { id: couponDoc.id, ...couponDoc.data() };

    // Get usage details
    const usageRef = collection(db, 'coupon_usage');
    const usageQuery = query(usageRef, where('couponId', '==', id));
    const usageSnapshot = await getDocs(usageQuery);

    const usageData = usageSnapshot.docs.map(doc => doc.data());

    // Calculate statistics
    const totalUsage = usageData.length;
    const totalDiscountGiven = usageData.reduce((sum, usage) => sum + (usage.discountAmount || 0), 0);
    const uniqueUsers = new Set(usageData.map(usage => usage.userId)).size;

    return {
      coupon,
      stats: {
        total_usage: totalUsage,
        total_discount_given: totalDiscountGiven,
        unique_users: uniqueUsers,
        remaining_uses: coupon.maxUses ? Math.max(0, coupon.maxUses - totalUsage) : null,
        usage_percentage: coupon.maxUses ? ((totalUsage / coupon.maxUses) * 100).toFixed(2) : null,
      },
      recent_usage: usageData.slice(0, 10),
    };
  } catch (error) {
    console.error('Error fetching coupon stats:', error);
    throw error;
  }
}
