import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { supabase } from '../lib/supabaseClient';

describe('validate_coupon database function', () => {
  let testCouponId;
  let testUserId;
  const testCouponCode = 'TEST20';

  beforeAll(async () => {
    // Wait a bit for schema cache to refresh
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create a test user for testing
    const { data: { user }, error: userError } = await supabase.auth.signUp({
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
    });
    
    if (userError) throw userError;
    testUserId = user.id;

    // Create a test coupon
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .insert({
        code: testCouponCode,
        description: 'Test coupon',
        discount_type: 'percentage',
        discount_value: 20,
        max_discount: 500,
        min_order_value: 1000,
        max_uses: 100,
        max_uses_per_user: 1,
        start_date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        end_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        is_active: true,
      })
      .select()
      .single();

    if (couponError) throw couponError;
    testCouponId = coupon.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (testCouponId) {
      await supabase.from('coupons').delete().eq('id', testCouponId);
    }
    if (testUserId) {
      await supabase.auth.admin.deleteUser(testUserId);
    }
  });

  it('should validate a valid coupon and return discount amount', async () => {
    const { data, error } = await supabase.rpc('validate_coupon', {
      p_code: testCouponCode,
      p_user_id: testUserId,
      p_order_total: 2000,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.valid).toBe(true);
    expect(data.coupon_id).toBe(testCouponId);
    expect(data.code).toBe(testCouponCode);
    expect(data.discount_amount).toBe(400); // 20% of 2000
    expect(data.discount_type).toBe('percentage');
  });

  it('should return error for invalid coupon code', async () => {
    const { data, error } = await supabase.rpc('validate_coupon', {
      p_code: 'INVALID',
      p_user_id: testUserId,
      p_order_total: 2000,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.valid).toBe(false);
    expect(data.error).toBe('Invalid coupon code');
  });

  it('should return error when order total is below minimum', async () => {
    const { data, error } = await supabase.rpc('validate_coupon', {
      p_code: testCouponCode,
      p_user_id: testUserId,
      p_order_total: 500, // Below min_order_value of 1000
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.valid).toBe(false);
    expect(data.error).toContain('Minimum order value');
  });

  it('should apply max discount cap for percentage coupons', async () => {
    const { data, error } = await supabase.rpc('validate_coupon', {
      p_code: testCouponCode,
      p_user_id: testUserId,
      p_order_total: 5000, // 20% would be 1000, but max is 500
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.valid).toBe(true);
    expect(data.discount_amount).toBe(500); // Capped at max_discount
  });

  it('should return error when user has already used the coupon', async () => {
    // First, record a usage
    await supabase.from('coupon_usage').insert({
      coupon_id: testCouponId,
      user_id: testUserId,
      order_id: '00000000-0000-0000-0000-000000000000', // Dummy order ID
      discount_amount: 400,
    });

    const { data, error } = await supabase.rpc('validate_coupon', {
      p_code: testCouponCode,
      p_user_id: testUserId,
      p_order_total: 2000,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.valid).toBe(false);
    expect(data.error).toBe('You have already used this coupon');

    // Clean up
    await supabase.from('coupon_usage').delete().eq('coupon_id', testCouponId);
  });

  it('should handle case-insensitive coupon codes', async () => {
    const { data, error } = await supabase.rpc('validate_coupon', {
      p_code: 'test20', // lowercase
      p_user_id: testUserId,
      p_order_total: 2000,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.valid).toBe(true);
    expect(data.code).toBe(testCouponCode);
  });

  it('should return error for expired coupon', async () => {
    // Create an expired coupon
    const expiredCode = 'EXPIRED20';
    const { data: expiredCoupon } = await supabase
      .from('coupons')
      .insert({
        code: expiredCode,
        description: 'Expired coupon',
        discount_type: 'percentage',
        discount_value: 20,
        min_order_value: 0,
        max_uses_per_user: 1,
        start_date: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        end_date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        is_active: true,
      })
      .select()
      .single();

    const { data, error } = await supabase.rpc('validate_coupon', {
      p_code: expiredCode,
      p_user_id: testUserId,
      p_order_total: 2000,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.valid).toBe(false);
    expect(data.error).toBe('This coupon has expired');

    // Clean up
    await supabase.from('coupons').delete().eq('id', expiredCoupon.id);
  });

  it('should return error for inactive coupon', async () => {
    // Create an inactive coupon
    const inactiveCode = 'INACTIVE20';
    const { data: inactiveCoupon } = await supabase
      .from('coupons')
      .insert({
        code: inactiveCode,
        description: 'Inactive coupon',
        discount_type: 'percentage',
        discount_value: 20,
        min_order_value: 0,
        max_uses_per_user: 1,
        start_date: new Date(Date.now() - 86400000).toISOString(),
        end_date: new Date(Date.now() + 86400000).toISOString(),
        is_active: false, // Inactive
      })
      .select()
      .single();

    const { data, error } = await supabase.rpc('validate_coupon', {
      p_code: inactiveCode,
      p_user_id: testUserId,
      p_order_total: 2000,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.valid).toBe(false);
    expect(data.error).toBe('Invalid coupon code');

    // Clean up
    await supabase.from('coupons').delete().eq('id', inactiveCoupon.id);
  });

  it('should handle fixed discount type correctly', async () => {
    // Create a fixed discount coupon
    const fixedCode = 'FIXED100';
    const { data: fixedCoupon } = await supabase
      .from('coupons')
      .insert({
        code: fixedCode,
        description: 'Fixed discount coupon',
        discount_type: 'fixed',
        discount_value: 100,
        min_order_value: 500,
        max_uses_per_user: 1,
        start_date: new Date(Date.now() - 86400000).toISOString(),
        end_date: new Date(Date.now() + 86400000).toISOString(),
        is_active: true,
      })
      .select()
      .single();

    const { data, error } = await supabase.rpc('validate_coupon', {
      p_code: fixedCode,
      p_user_id: testUserId,
      p_order_total: 1000,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.valid).toBe(true);
    expect(data.discount_amount).toBe(100); // Fixed amount
    expect(data.discount_type).toBe('fixed');

    // Clean up
    await supabase.from('coupons').delete().eq('id', fixedCoupon.id);
  });

  it('should not allow discount to exceed order total', async () => {
    // Create a large fixed discount coupon
    const largeCode = 'LARGE500';
    const { data: largeCoupon } = await supabase
      .from('coupons')
      .insert({
        code: largeCode,
        description: 'Large discount coupon',
        discount_type: 'fixed',
        discount_value: 500,
        min_order_value: 0,
        max_uses_per_user: 1,
        start_date: new Date(Date.now() - 86400000).toISOString(),
        end_date: new Date(Date.now() + 86400000).toISOString(),
        is_active: true,
      })
      .select()
      .single();

    const { data, error } = await supabase.rpc('validate_coupon', {
      p_code: largeCode,
      p_user_id: testUserId,
      p_order_total: 300, // Less than discount value
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.valid).toBe(true);
    expect(data.discount_amount).toBe(300); // Capped at order total

    // Clean up
    await supabase.from('coupons').delete().eq('id', largeCoupon.id);
  });
});
