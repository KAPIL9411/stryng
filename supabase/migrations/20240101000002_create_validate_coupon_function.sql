-- Create validate_coupon function
-- This function validates a coupon code and calculates the discount amount
-- Returns a JSON object with validation result and discount details

CREATE OR REPLACE FUNCTION validate_coupon(
  p_code VARCHAR,
  p_user_id UUID,
  p_order_total DECIMAL
)
RETURNS JSON AS $$
DECLARE
  v_coupon RECORD;
  v_user_usage_count INTEGER;
  v_discount_amount DECIMAL;
BEGIN
  -- Get coupon details (case-insensitive code lookup)
  SELECT * INTO v_coupon
  FROM coupons
  WHERE UPPER(code) = UPPER(p_code)
  AND is_active = true;

  -- Check if coupon exists and is active
  IF NOT FOUND THEN
    RETURN json_build_object('valid', false, 'error', 'Invalid coupon code');
  END IF;

  -- Check if coupon has started
  IF NOW() < v_coupon.start_date THEN
    RETURN json_build_object('valid', false, 'error', 'Coupon not yet valid');
  END IF;

  -- Check if coupon has expired
  IF NOW() > v_coupon.end_date THEN
    RETURN json_build_object('valid', false, 'error', 'This coupon has expired');
  END IF;

  -- Check minimum order value requirement
  IF p_order_total < v_coupon.min_order_value THEN
    RETURN json_build_object(
      'valid', false,
      'error', format('Minimum order value of ₹%s required', v_coupon.min_order_value)
    );
  END IF;

  -- Check if coupon has reached maximum uses
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.used_count >= v_coupon.max_uses THEN
    RETURN json_build_object('valid', false, 'error', 'This coupon has reached its usage limit');
  END IF;

  -- Check per-user usage limit
  SELECT COUNT(*) INTO v_user_usage_count
  FROM coupon_usage
  WHERE coupon_id = v_coupon.id AND user_id = p_user_id;

  IF v_user_usage_count >= v_coupon.max_uses_per_user THEN
    RETURN json_build_object('valid', false, 'error', 'You have already used this coupon');
  END IF;

  -- Calculate discount amount based on discount type
  IF v_coupon.discount_type = 'percentage' THEN
    v_discount_amount := (p_order_total * v_coupon.discount_value / 100);
    -- Apply max discount cap if specified
    IF v_coupon.max_discount IS NOT NULL AND v_discount_amount > v_coupon.max_discount THEN
      v_discount_amount := v_coupon.max_discount;
    END IF;
  ELSE
    -- Fixed discount type
    v_discount_amount := v_coupon.discount_value;
  END IF;

  -- Ensure discount doesn't exceed order total
  IF v_discount_amount > p_order_total THEN
    v_discount_amount := p_order_total;
  END IF;

  -- Return success with coupon details and calculated discount
  RETURN json_build_object(
    'valid', true,
    'coupon_id', v_coupon.id,
    'code', v_coupon.code,
    'discount_amount', v_discount_amount,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value
  );
END;
$$ LANGUAGE plpgsql;
