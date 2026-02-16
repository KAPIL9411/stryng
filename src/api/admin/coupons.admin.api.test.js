import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCoupon, getCoupons } from './coupons.admin.api';
import { supabase } from '../../lib/supabaseClient';

describe('createCoupon', () => {
  const createdCouponIds = [];

  afterAll(async () => {
    // Clean up created coupons
    if (createdCouponIds.length > 0) {
      await supabase.from('coupons').delete().in('id', createdCouponIds);
    }
  });

  it('should create a valid percentage coupon', async () => {
    const couponData = {
      code: 'TEST10',
      description: 'Test 10% discount',
      discount_type: 'percentage',
      discount_value: 10,
      max_discount: 500,
      min_order_value: 1000,
      max_uses: 100,
      max_uses_per_user: 1,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      is_active: true
    };

    const result = await createCoupon(couponData);
    createdCouponIds.push(result.id);

    expect(result).toBeDefined();
    expect(result.code).toBe('TEST10');
    expect(result.discount_type).toBe('percentage');
    expect(result.discount_value).toBe(10);
    expect(result.used_count).toBe(0);
  });

  it('should create a valid fixed discount coupon', async () => {
    const couponData = {
      code: 'SAVE100',
      description: 'Save 100 rupees',
      discount_type: 'fixed',
      discount_value: 100,
      min_order_value: 500,
      max_uses_per_user: 2,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    const result = await createCoupon(couponData);
    createdCouponIds.push(result.id);

    expect(result).toBeDefined();
    expect(result.code).toBe('SAVE100');
    expect(result.discount_type).toBe('fixed');
    expect(result.discount_value).toBe(100);
  });

  it('should convert code to uppercase', async () => {
    const couponData = {
      code: 'lowercase20',
      description: 'Test lowercase',
      discount_type: 'percentage',
      discount_value: 20,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    const result = await createCoupon(couponData);
    createdCouponIds.push(result.id);

    expect(result.code).toBe('LOWERCASE20');
  });

  it('should throw error for missing required fields', async () => {
    const couponData = {
      description: 'Missing code'
    };

    await expect(createCoupon(couponData)).rejects.toThrow('Missing required fields');
  });

  it('should throw error for invalid discount type', async () => {
    const couponData = {
      code: 'INVALID',
      discount_type: 'invalid_type',
      discount_value: 10,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    await expect(createCoupon(couponData)).rejects.toThrow('Invalid discount_type');
  });

  it('should throw error for negative discount value', async () => {
    const couponData = {
      code: 'NEGATIVE',
      discount_type: 'percentage',
      discount_value: -10,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    await expect(createCoupon(couponData)).rejects.toThrow('Discount value must be positive');
  });

  it('should throw error for percentage discount > 100', async () => {
    const couponData = {
      code: 'OVER100',
      discount_type: 'percentage',
      discount_value: 150,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    await expect(createCoupon(couponData)).rejects.toThrow('Percentage discount must be between 0 and 100');
  });

  it('should throw error when end date is before start date', async () => {
    const couponData = {
      code: 'BADDATE',
      discount_type: 'percentage',
      discount_value: 10,
      start_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      end_date: new Date().toISOString()
    };

    await expect(createCoupon(couponData)).rejects.toThrow('End date must be after start date');
  });

  it('should throw error for invalid coupon code format', async () => {
    const couponData = {
      code: 'AB',
      discount_type: 'percentage',
      discount_value: 10,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    await expect(createCoupon(couponData)).rejects.toThrow('Coupon code must be 4-20 alphanumeric characters');
  });

  it('should throw error for duplicate coupon code', async () => {
    const couponData = {
      code: 'DUPLICATE',
      description: 'First coupon',
      discount_type: 'percentage',
      discount_value: 10,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    const result = await createCoupon(couponData);
    createdCouponIds.push(result.id);

    await expect(createCoupon(couponData)).rejects.toThrow('Coupon code already exists');
  });
});

describe('getCoupons', () => {
  const testCouponIds = [];

  beforeAll(async () => {
    // Create test coupons with different statuses
    const now = new Date();
    const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

    // Active coupon
    const activeCoupon = await createCoupon({
      code: 'ACTIVE10',
      description: 'Active coupon',
      discount_type: 'percentage',
      discount_value: 10,
      start_date: now.toISOString(),
      end_date: future.toISOString(),
      is_active: true
    });
    testCouponIds.push(activeCoupon.id);

    // Inactive coupon
    const inactiveCoupon = await createCoupon({
      code: 'INACTIVE20',
      description: 'Inactive coupon',
      discount_type: 'percentage',
      discount_value: 20,
      start_date: now.toISOString(),
      end_date: future.toISOString(),
      is_active: false
    });
    testCouponIds.push(inactiveCoupon.id);

    // Expired coupon (start in past, end yesterday)
    const expiredCoupon = await createCoupon({
      code: 'EXPIRED30',
      description: 'Expired coupon',
      discount_type: 'percentage',
      discount_value: 30,
      start_date: past.toISOString(),
      end_date: yesterday.toISOString(),
      is_active: true
    });
    testCouponIds.push(expiredCoupon.id);
  });

  afterAll(async () => {
    // Clean up test coupons
    if (testCouponIds.length > 0) {
      await supabase.from('coupons').delete().in('id', testCouponIds);
    }
  });

  it('should return all coupons when no filters applied', async () => {
    const result = await getCoupons();
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(3);
  });

  it('should filter active coupons', async () => {
    const result = await getCoupons({ status: 'active' });
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    
    // All returned coupons should be active and not expired
    result.forEach(coupon => {
      expect(coupon.is_active).toBe(true);
      expect(new Date(coupon.end_date).getTime()).toBeGreaterThan(Date.now());
    });
  });

  it('should filter inactive coupons', async () => {
    const result = await getCoupons({ status: 'inactive' });
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    
    // All returned coupons should be inactive
    result.forEach(coupon => {
      expect(coupon.is_active).toBe(false);
    });
  });

  it('should filter expired coupons', async () => {
    const result = await getCoupons({ status: 'expired' });
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    
    // All returned coupons should be expired
    result.forEach(coupon => {
      expect(new Date(coupon.end_date).getTime()).toBeLessThan(Date.now());
    });
  });

  it('should search coupons by code', async () => {
    const result = await getCoupons({ search: 'ACTIVE' });
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(1);
    
    // All returned coupons should contain 'ACTIVE' in code
    result.forEach(coupon => {
      expect(coupon.code.toUpperCase()).toContain('ACTIVE');
    });
  });

  it('should combine status filter and search', async () => {
    const result = await getCoupons({ status: 'active', search: 'ACTIVE' });
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    
    // Should return active coupons with 'ACTIVE' in code
    result.forEach(coupon => {
      expect(coupon.is_active).toBe(true);
      expect(coupon.code.toUpperCase()).toContain('ACTIVE');
    });
  });

  it('should return empty array when no coupons match filters', async () => {
    const result = await getCoupons({ search: 'NONEXISTENT999' });
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });
});

describe('getCouponById', () => {
  let testCouponId;

  beforeAll(async () => {
    const coupon = await createCoupon({
      code: 'GETBYID',
      description: 'Test get by ID',
      discount_type: 'percentage',
      discount_value: 15,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });
    testCouponId = coupon.id;
  });

  afterAll(async () => {
    if (testCouponId) {
      await supabase.from('coupons').delete().eq('id', testCouponId);
    }
  });

  it('should get coupon by ID', async () => {
    const { getCouponById } = await import('./coupons.admin.api');
    const result = await getCouponById(testCouponId);

    expect(result).toBeDefined();
    expect(result.id).toBe(testCouponId);
    expect(result.code).toBe('GETBYID');
  });

  it('should throw error for missing ID', async () => {
    const { getCouponById } = await import('./coupons.admin.api');
    await expect(getCouponById()).rejects.toThrow('Coupon ID is required');
  });

  it('should throw error for non-existent coupon', async () => {
    const { getCouponById } = await import('./coupons.admin.api');
    await expect(getCouponById('00000000-0000-0000-0000-000000000000')).rejects.toThrow('Coupon not found');
  });
});

describe('updateCoupon', () => {
  let testCouponId;

  beforeAll(async () => {
    const coupon = await createCoupon({
      code: 'UPDATE',
      description: 'Test update',
      discount_type: 'percentage',
      discount_value: 10,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });
    testCouponId = coupon.id;
  });

  afterAll(async () => {
    if (testCouponId) {
      await supabase.from('coupons').delete().eq('id', testCouponId);
    }
  });

  it('should update coupon description', async () => {
    const { updateCoupon } = await import('./coupons.admin.api');
    const result = await updateCoupon(testCouponId, {
      description: 'Updated description'
    });

    expect(result).toBeDefined();
    expect(result.description).toBe('Updated description');
  });

  it('should update discount value', async () => {
    const { updateCoupon } = await import('./coupons.admin.api');
    const result = await updateCoupon(testCouponId, {
      discount_value: 20
    });

    expect(result.discount_value).toBe(20);
  });

  it('should throw error for missing ID', async () => {
    const { updateCoupon } = await import('./coupons.admin.api');
    await expect(updateCoupon(null, { description: 'test' })).rejects.toThrow('Coupon ID is required');
  });

  it('should throw error for invalid discount type', async () => {
    const { updateCoupon } = await import('./coupons.admin.api');
    await expect(updateCoupon(testCouponId, { discount_type: 'invalid' })).rejects.toThrow('Invalid discount_type');
  });
});

describe('deleteCoupon', () => {
  it('should delete unused coupon', async () => {
    const coupon = await createCoupon({
      code: 'DELETE1',
      description: 'Test delete',
      discount_type: 'percentage',
      discount_value: 10,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });

    const { deleteCoupon } = await import('./coupons.admin.api');
    await expect(deleteCoupon(coupon.id)).resolves.not.toThrow();

    // Verify deletion
    const { data } = await supabase.from('coupons').select().eq('id', coupon.id);
    expect(data.length).toBe(0);
  });

  it('should throw error for missing ID', async () => {
    const { deleteCoupon } = await import('./coupons.admin.api');
    await expect(deleteCoupon()).rejects.toThrow('Coupon ID is required');
  });

  it('should throw error when deleting used coupon', async () => {
    const coupon = await createCoupon({
      code: 'USED1',
      description: 'Used coupon',
      discount_type: 'percentage',
      discount_value: 10,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });

    // Simulate usage
    await supabase.from('coupons').update({ used_count: 1 }).eq('id', coupon.id);

    const { deleteCoupon } = await import('./coupons.admin.api');
    await expect(deleteCoupon(coupon.id)).rejects.toThrow('Cannot delete coupon with existing usage');

    // Cleanup
    await supabase.from('coupons').delete().eq('id', coupon.id);
  });
});

describe('toggleCouponStatus', () => {
  let testCouponId;

  beforeAll(async () => {
    const coupon = await createCoupon({
      code: 'TOGGLE',
      description: 'Test toggle',
      discount_type: 'percentage',
      discount_value: 10,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      is_active: true
    });
    testCouponId = coupon.id;
  });

  afterAll(async () => {
    if (testCouponId) {
      await supabase.from('coupons').delete().eq('id', testCouponId);
    }
  });

  it('should toggle coupon from active to inactive', async () => {
    const { toggleCouponStatus } = await import('./coupons.admin.api');
    const result = await toggleCouponStatus(testCouponId);

    expect(result).toBeDefined();
    expect(result.is_active).toBe(false);
  });

  it('should toggle coupon from inactive to active', async () => {
    const { toggleCouponStatus } = await import('./coupons.admin.api');
    const result = await toggleCouponStatus(testCouponId);

    expect(result.is_active).toBe(true);
  });

  it('should throw error for missing ID', async () => {
    const { toggleCouponStatus } = await import('./coupons.admin.api');
    await expect(toggleCouponStatus()).rejects.toThrow('Coupon ID is required');
  });
});

describe('getCouponStats', () => {
  let testCouponId;

  beforeAll(async () => {
    const coupon = await createCoupon({
      code: 'STATS',
      description: 'Test stats',
      discount_type: 'percentage',
      discount_value: 10,
      max_uses: 100,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });
    testCouponId = coupon.id;
  });

  afterAll(async () => {
    if (testCouponId) {
      await supabase.from('coupons').delete().eq('id', testCouponId);
    }
  });

  it('should get coupon statistics', async () => {
    const { getCouponStats } = await import('./coupons.admin.api');
    const result = await getCouponStats(testCouponId);

    expect(result).toBeDefined();
    expect(result.coupon).toBeDefined();
    expect(result.stats).toBeDefined();
    expect(result.stats.total_usage).toBeDefined();
    expect(result.stats.total_discount_given).toBeDefined();
    expect(result.stats.unique_users).toBeDefined();
    expect(result.recent_usage).toBeDefined();
  });

  it('should throw error for missing ID', async () => {
    const { getCouponStats } = await import('./coupons.admin.api');
    await expect(getCouponStats()).rejects.toThrow('Coupon ID is required');
  });
});
