import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { validateCoupon, getAvailableCoupons, recordCouponUsage } from './coupons.api';
import { createCoupon } from './admin/coupons.admin.api';
import { supabase } from '../lib/supabaseClient';

describe('validateCoupon', () => {
  const testCouponIds = [];
  const testUserId = '00000000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    // Create test coupons
    const validCoupon = await createCoupon({
      code: 'VALID20',
      description: 'Valid 20% discount',
      discount_type: 'percentage',
      discount_value: 20,
      max_discount: 500,
      min_order_value: 1000,
      max_uses: 100,
      max_uses_per_user: 1,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      is_active: true
    });
    testCouponIds.push(validCoupon.id);

    const expiredCoupon = await createCoupon({
      code: 'EXPIRED10',
      description: 'Expired coupon',
      discount_type: 'percentage',
      discount_value: 10,
      start_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      end_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      is_active: true
    });
    testCouponIds.push(expiredCoupon.id);

    const inactiveCoupon = await createCoupon({
      code: 'INACTIVE15',
      description: 'Inactive coupon',
      discount_type: 'percentage',
      discount_value: 15,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      is_active: false
    });
    testCouponIds.push(inactiveCoupon.id);
  });

  afterAll(async () => {
    if (testCouponIds.length > 0) {
      await supabase.from('coupons').delete().in('id', testCouponIds);
    }
  });

  it('should validate a valid coupon', async () => {
    const result = await validateCoupon('VALID20', testUserId, 2000);

    expect(result).toBeDefined();
    expect(result.valid).toBe(true);
    expect(result.code).toBe('VALID20');
    expect(result.discount_amount).toBeDefined();
  });

  it('should return error for invalid coupon code', async () => {
    const result = await validateCoupon('INVALID', testUserId, 2000);

    expect(result).toBeDefined();
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid coupon code');
  });

  it('should return error for expired coupon', async () => {
    const result = await validateCoupon('EXPIRED10', testUserId, 2000);

    expect(result).toBeDefined();
    expect(result.valid).toBe(false);
    expect(result.error).toContain('expired');
  });

  it('should return error for inactive coupon', async () => {
    const result = await validateCoupon('INACTIVE15', testUserId, 2000);

    expect(result).toBeDefined();
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid coupon code');
  });

  it('should return error when minimum order value not met', async () => {
    const result = await validateCoupon('VALID20', testUserId, 500);

    expect(result).toBeDefined();
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Minimum order value');
  });

  it('should throw error for missing parameters', async () => {
    await expect(validateCoupon()).rejects.toThrow('Code, userId, and orderTotal are required');
  });

  it('should throw error for negative order total', async () => {
    await expect(validateCoupon('VALID20', testUserId, -100)).rejects.toThrow('Order total must be non-negative');
  });
});

describe('getAvailableCoupons', () => {
  const testCouponIds = [];

  beforeAll(async () => {
    const now = new Date();
    const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Coupon with min order 500
    const coupon1 = await createCoupon({
      code: 'AVAIL500',
      description: 'Min order 500',
      discount_type: 'percentage',
      discount_value: 10,
      min_order_value: 500,
      start_date: now.toISOString(),
      end_date: future.toISOString(),
      is_active: true
    });
    testCouponIds.push(coupon1.id);

    // Coupon with min order 1000
    const coupon2 = await createCoupon({
      code: 'AVAIL1000',
      description: 'Min order 1000',
      discount_type: 'percentage',
      discount_value: 20,
      min_order_value: 1000,
      start_date: now.toISOString(),
      end_date: future.toISOString(),
      is_active: true
    });
    testCouponIds.push(coupon2.id);

    // Coupon with min order 2000
    const coupon3 = await createCoupon({
      code: 'AVAIL2000',
      description: 'Min order 2000',
      discount_type: 'percentage',
      discount_value: 30,
      min_order_value: 2000,
      start_date: now.toISOString(),
      end_date: future.toISOString(),
      is_active: true
    });
    testCouponIds.push(coupon3.id);
  });

  afterAll(async () => {
    if (testCouponIds.length > 0) {
      await supabase.from('coupons').delete().in('id', testCouponIds);
    }
  });

  it('should return coupons for order total 1500', async () => {
    const result = await getAvailableCoupons(1500);

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    
    // Should include coupons with min order <= 1500
    const codes = result.map(c => c.code);
    expect(codes).toContain('AVAIL500');
    expect(codes).toContain('AVAIL1000');
    expect(codes).not.toContain('AVAIL2000');
  });

  it('should return all coupons for high order total', async () => {
    const result = await getAvailableCoupons(3000);

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    
    const codes = result.map(c => c.code);
    expect(codes).toContain('AVAIL500');
    expect(codes).toContain('AVAIL1000');
    expect(codes).toContain('AVAIL2000');
  });

  it('should return empty array for low order total', async () => {
    const result = await getAvailableCoupons(100);

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    
    const codes = result.map(c => c.code);
    expect(codes).not.toContain('AVAIL500');
    expect(codes).not.toContain('AVAIL1000');
    expect(codes).not.toContain('AVAIL2000');
  });

  it('should throw error for missing order total', async () => {
    await expect(getAvailableCoupons()).rejects.toThrow('Valid order total is required');
  });

  it('should throw error for negative order total', async () => {
    await expect(getAvailableCoupons(-100)).rejects.toThrow('Valid order total is required');
  });
});

describe('recordCouponUsage', () => {
  let testCouponId;
  let testUserId;
  let testOrderId;

  beforeAll(async () => {
    // Get a real user ID from the database
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (users && users.length > 0) {
      testUserId = users[0].id;
    }

    // Get a real order ID from the database
    const { data: orders } = await supabase
      .from('orders')
      .select('id')
      .limit(1);
    
    if (orders && orders.length > 0) {
      testOrderId = orders[0].id;
    }

    const coupon = await createCoupon({
      code: 'RECORD',
      description: 'Test record usage',
      discount_type: 'percentage',
      discount_value: 10,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });
    testCouponId = coupon.id;
  });

  afterAll(async () => {
    if (testCouponId) {
      await supabase.from('coupon_usage').delete().eq('coupon_id', testCouponId);
      await supabase.from('coupons').delete().eq('id', testCouponId);
    }
  });

  it('should record coupon usage', async () => {
    // Skip if no real user or order exists
    if (!testUserId || !testOrderId) {
      console.log('Skipping test: No real user or order found in database');
      return;
    }

    const result = await recordCouponUsage(testCouponId, testUserId, testOrderId, 100);

    expect(result).toBeDefined();
    expect(result.coupon_id).toBe(testCouponId);
    expect(result.user_id).toBe(testUserId);
    expect(result.order_id).toBe(testOrderId);
    expect(result.discount_amount).toBe(100);
  });

  it('should increment used_count', async () => {
    // Skip if no real user or order exists
    if (!testUserId || !testOrderId) {
      console.log('Skipping test: No real user or order found in database');
      return;
    }

    const { data: couponBefore } = await supabase
      .from('coupons')
      .select('used_count')
      .eq('id', testCouponId)
      .single();

    const initialCount = couponBefore.used_count;

    // Create a new order ID for this test
    const { data: newOrder } = await supabase
      .from('orders')
      .select('id')
      .limit(1)
      .neq('id', testOrderId);

    if (newOrder && newOrder.length > 0) {
      await recordCouponUsage(testCouponId, testUserId, newOrder[0].id, 50);

      const { data: couponAfter } = await supabase
        .from('coupons')
        .select('used_count')
        .eq('id', testCouponId)
        .single();

      expect(couponAfter.used_count).toBeGreaterThan(initialCount);
    } else {
      console.log('Skipping increment test: Not enough orders in database');
    }
  });

  it('should throw error for missing parameters', async () => {
    await expect(recordCouponUsage()).rejects.toThrow('All parameters are required');
  });

  it('should throw error for negative discount amount', async () => {
    const dummyUserId = '00000000-0000-0000-0000-000000000001';
    const dummyOrderId = '00000000-0000-0000-0000-000000000002';
    await expect(recordCouponUsage(testCouponId, dummyUserId, dummyOrderId, -50)).rejects.toThrow('Discount amount must be non-negative');
  });
});
