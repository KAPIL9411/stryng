-- Migration: Batch Operations to Avoid N+1 Patterns
-- Description: Creates RPC functions for batch stock operations
-- Date: 2024

-- ============================================
-- Batch Decrement Stock Function
-- ============================================
-- This function decrements stock for multiple products in a single transaction
-- Prevents N+1 query pattern when processing orders with multiple items

CREATE OR REPLACE FUNCTION batch_decrement_stock(
    items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    item jsonb;
    result jsonb := '[]'::jsonb;
    item_result jsonb;
    current_stock integer;
BEGIN
    -- Loop through items and decrement stock
    FOR item IN SELECT * FROM jsonb_array_elements(items)
    LOOP
        -- Get current stock
        SELECT stock INTO current_stock
        FROM products
        WHERE id = (item->>'product_id')::uuid;

        -- Check if product exists
        IF current_stock IS NULL THEN
            item_result := jsonb_build_object(
                'product_id', item->>'product_id',
                'success', false,
                'error', 'Product not found'
            );
        -- Check if sufficient stock
        ELSIF current_stock < (item->>'quantity')::integer THEN
            item_result := jsonb_build_object(
                'product_id', item->>'product_id',
                'success', false,
                'error', 'Insufficient stock',
                'current_stock', current_stock,
                'requested', (item->>'quantity')::integer
            );
        ELSE
            -- Decrement stock
            UPDATE products
            SET stock = stock - (item->>'quantity')::integer,
                updated_at = NOW()
            WHERE id = (item->>'product_id')::uuid;

            item_result := jsonb_build_object(
                'product_id', item->>'product_id',
                'success', true,
                'decremented', (item->>'quantity')::integer
            );
        END IF;

        -- Add to result array
        result := result || jsonb_build_array(item_result);
    END LOOP;

    RETURN result;
END;
$$;

-- ============================================
-- Batch Reserve Inventory Function
-- ============================================
-- This function reserves inventory for multiple products in a single transaction
-- Prevents N+1 query pattern during checkout

CREATE OR REPLACE FUNCTION batch_reserve_inventory(
    p_user_id uuid,
    p_items jsonb,
    p_timeout_minutes integer DEFAULT 15
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    item jsonb;
    result jsonb := '[]'::jsonb;
    item_result jsonb;
    current_stock integer;
    reserved_stock integer;
    available_stock integer;
    reservation_id uuid;
    expires_at timestamp;
BEGIN
    expires_at := NOW() + (p_timeout_minutes || ' minutes')::interval;

    -- Loop through items and create reservations
    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- Get current stock and reserved stock
        SELECT stock INTO current_stock
        FROM products
        WHERE id = (item->>'product_id')::uuid;

        -- Calculate reserved stock (active reservations)
        SELECT COALESCE(SUM(quantity), 0) INTO reserved_stock
        FROM inventory_reservations
        WHERE product_id = (item->>'product_id')::uuid
        AND expires_at > NOW()
        AND status = 'active';

        available_stock := current_stock - reserved_stock;

        -- Check if product exists
        IF current_stock IS NULL THEN
            item_result := jsonb_build_object(
                'product_id', item->>'product_id',
                'success', false,
                'error', 'Product not found'
            );
        -- Check if sufficient stock available
        ELSIF available_stock < (item->>'quantity')::integer THEN
            item_result := jsonb_build_object(
                'product_id', item->>'product_id',
                'success', false,
                'error', 'Insufficient stock',
                'available', available_stock,
                'requested', (item->>'quantity')::integer
            );
        ELSE
            -- Create reservation
            INSERT INTO inventory_reservations (
                user_id,
                product_id,
                quantity,
                expires_at,
                status
            ) VALUES (
                p_user_id,
                (item->>'product_id')::uuid,
                (item->>'quantity')::integer,
                expires_at,
                'active'
            )
            RETURNING id INTO reservation_id;

            item_result := jsonb_build_object(
                'product_id', item->>'product_id',
                'success', true,
                'reservation_id', reservation_id,
                'expires_at', expires_at
            );
        END IF;

        -- Add to result array
        result := result || jsonb_build_array(item_result);
    END LOOP;

    RETURN result;
END;
$$;

-- ============================================
-- Grant Execute Permissions
-- ============================================

GRANT EXECUTE ON FUNCTION batch_decrement_stock(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION batch_reserve_inventory(uuid, jsonb, integer) TO authenticated;

-- ============================================
-- Comments
-- ============================================

COMMENT ON FUNCTION batch_decrement_stock IS 'Batch decrement stock for multiple products to avoid N+1 pattern';
COMMENT ON FUNCTION batch_reserve_inventory IS 'Batch reserve inventory for multiple products to avoid N+1 pattern';
