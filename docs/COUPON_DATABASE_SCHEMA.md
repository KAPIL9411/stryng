# Coupon System - Database Schema Documentation

## Overview
This document describes the database schema for the Coupon System, including tables, relationships, indexes, and constraints.

---

## Tables

### 1. coupons

Stores coupon/discount code information.

```sql
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10, 2) NOT NULL CHECK (discount_value > 0),
  max_discount DECIMAL(10, 2),
  min_order_value DECIMAL(10, 2) DEFAULT 0,
  max_uses INTEGER,
  max_uses_per_user INTEGER DEFAULT 1 CHECK (max_uses_per_user > 0),
  used_count INTEGER DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_dates CHECK (end_date > start_date),
  CONSTRAINT valid_percentage CHECK (
    discount_type != 'percentage' OR (discount_value >= 0 AND discount_value <= 100)
  )
);
```

#### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | uuid_generate_v4() | Primary key |
| code | VARCHAR(20) | No | - | Unique coupon code (uppercase) |
| description | TEXT | Yes | NULL | Description of the offer |
| discount_type | VARCHAR(20) | No | - | 'percentage' or 'fixed' |
| discount_value | DECIMAL(10,2) | No | - | Discount amount or percentage |
| max_discount | DECIMAL(10,2) | Yes | NULL | Maximum discount cap (for percentage) |
| min_order_value | DECIMAL(10,2) | No | 0 | Minimum order value required |
| max_uses | INTEGER | Yes | NULL | Total usage limit (NULL = unlimited) |
| max_uses_per_user | INTEGER | No | 1 | Per-user usage limit |
| used_count | INTEGER | No | 0 | Current usage count |
| start_date | TIMESTAMP | No | - | Coupon validity start date |
| end_date | TIMESTAMP | No | - | Coupon validity end date |
| is_active | BOOLEAN | No | true | Whether coupon is active |
| created_at | TIMESTAMP | No | NOW() | Creation timestamp |
| updated_at | TIMESTAMP | No | NOW() | Last update timestamp |

#### Constraints

- **PRIMARY KEY**: `id`
- **UNIQUE**: `code`
- **CHECK**: `discount_type IN ('percentage', 'fixed')`
- **CHECK**: `discount_value > 0`
- **CHECK**: `max_uses_per_user > 0`
- **CHECK**: `end_date > start_date`
- **CHECK**: For percentage type, value must be 0-100

#### Indexes

```sql
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_active ON coupons(is_active);
CREATE INDEX idx_coupons_dates ON coupons(start_date, end_date);
```

---

### 2. coupon_usage

Tracks individual coupon usage instances.

```sql
CREATE TABLE coupon_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  order_id UUID NOT NULL REFERENCES orders(id),
  discount_amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | uuid_generate_v4() | Primary key |
| coupon_id | UUID | No | - | Reference to coupons table |
| user_id | UUID | No | - | Reference to auth.users |
| order_id | UUID | No | - | Reference to orders table |
| discount_amount | DECIMAL(10,2) | No | - | Actual discount applied |
| created_at | TIMESTAMP | No | NOW() | Usage timestamp |

#### Foreign Keys

- `coupon_id` → `coupons(id)` ON DELETE CASCADE
- `user_id` → `auth.users(id)`
- `order_id` → `orders(id)`

#### Indexes

```sql
CREATE INDEX idx_coupon_usage_coupon ON coupon_usage(coupon_id);
CREATE INDEX idx_coupon_usage_user ON coupon_usage(user_id);
CREATE INDEX idx_coupon_usage_order ON coupon_usage(order_id);
```

---

### 3. orders (Modified)

Added coupon-related columns to existing orders table.

```sql
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS coupon_discount DECIMAL(10, 2) DEFAULT 0;
```

#### New Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| coupon_id | UUID | Yes | NULL | Reference to applied coupon |
| coupon_code | VARCHAR(20) | Yes | NULL | Coupon code (for history) |
| coupon_discount | DECIMAL(10,2) | No | 0 | Discount amount applied |

#### Foreign Keys

- `coupon_id` → `coupons(id)` ON DELETE SET NULL

#### Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_orders_coupon_id ON orders(coupon_id);
```

---

## Database Functions

### validate_coupon

Validates a coupon and calculates discount amount.

```sql
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
  -- Get coupon details
  SELECT * INTO v_coupon
  FROM coupons
  WHERE UPPER(code) = UPPER(p_code)
  AND is_active = true;

  -- Check if coupon exists
  IF NOT FOUND THEN
    RETURN json_build_object('valid', false, 'error', 'Invalid coupon code');
  END IF;

  -- Check validity period
  IF NOW() < v_coupon.start_date THEN
    RETURN json_build_object('valid', false, 'error', 'Coupon not yet valid');
  END IF;

  IF NOW() > v_coupon.end_date THEN
    RETURN json_build_object('valid', false, 'error', 'Coupon has expired');
  END IF;

  -- Check minimum order value
  IF p_order_total < v_coupon.min_order_value THEN
    RETURN json_build_object(
      'valid', false,
      'error', format('Minimum order value of ₹%s required', v_coupon.min_order_value)
    );
  END IF;

  -- Check max uses
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.used_count >= v_coupon.max_uses THEN
    RETURN json_build_object('valid', false, 'error', 'Coupon usage limit reached');
  END IF;

  -- Check per-user usage
  SELECT COUNT(*) INTO v_user_usage_count
  FROM coupon_usage
  WHERE coupon_id = v_coupon.id AND user_id = p_user_id;

  IF v_user_usage_count >= v_coupon.max_uses_per_user THEN
    RETURN json_build_object('valid', false, 'error', 'You have already used this coupon');
  END IF;

  -- Calculate discount
  IF v_coupon.discount_type = 'percentage' THEN
    v_discount_amount := (p_order_total * v_coupon.discount_value / 100);
    IF v_coupon.max_discount IS NOT NULL AND v_discount_amount > v_coupon.max_discount THEN
      v_discount_amount := v_coupon.max_discount;
    END IF;
  ELSE
    v_discount_amount := v_coupon.discount_value;
  END IF;

  -- Ensure discount doesn't exceed order total
  IF v_discount_amount > p_order_total THEN
    v_discount_amount := p_order_total;
  END IF;

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
```

#### Parameters

- `p_code`: Coupon code to validate
- `p_user_id`: User ID attempting to use coupon
- `p_order_total`: Current order total

#### Returns

JSON object with validation result and discount details.

---

## Relationships

```
coupons (1) ──< (N) coupon_usage
coupons (1) ──< (N) orders
auth.users (1) ──< (N) coupon_usage
orders (1) ──< (1) coupon_usage
```

### Relationship Details

1. **coupons → coupon_usage**: One coupon can have many usage records
2. **coupons → orders**: One coupon can be used in many orders
3. **auth.users → coupon_usage**: One user can have many coupon usage records
4. **orders → coupon_usage**: Each order can have one coupon usage record

---

## Data Integrity

### Referential Integrity

- **CASCADE DELETE**: When a coupon is deleted, all its usage records are deleted
- **SET NULL**: When a coupon is deleted, order references are set to NULL (preserves order history)

### Constraints

1. **Unique Codes**: Coupon codes must be unique
2. **Valid Dates**: End date must be after start date
3. **Positive Values**: Discount values must be positive
4. **Percentage Range**: Percentage discounts must be 0-100
5. **Per-User Limit**: Must be at least 1

---

## Indexes Strategy

### Performance Indexes

1. **Code Lookup**: `idx_coupons_code` - Fast coupon code searches
2. **Active Filter**: `idx_coupons_active` - Filter active coupons
3. **Date Range**: `idx_coupons_dates` - Validity period queries
4. **Usage Tracking**: Indexes on coupon_usage for analytics

### Query Optimization

- Code lookups: O(log n) with B-tree index
- Active coupon filtering: Bitmap index scan
- Date range queries: Index range scan
- Usage analytics: Efficient joins with indexed foreign keys

---

## Data Types Rationale

### DECIMAL(10, 2)
- Used for monetary values
- Precision: 10 digits total, 2 after decimal
- Range: Up to ₹99,999,999.99
- Avoids floating-point precision issues

### VARCHAR(20)
- Coupon codes limited to 20 characters
- Sufficient for readable codes
- Indexed for fast lookups

### TIMESTAMP WITH TIME ZONE
- Stores timezone information
- Handles daylight saving time
- Consistent across regions

### UUID
- Globally unique identifiers
- 128-bit values
- Prevents ID conflicts
- Secure (non-sequential)

---

## Migration Scripts

### Initial Setup

```sql
-- Run migrations in order:
1. 20240101000000_create_coupons_table.sql
2. 20240101000001_create_coupon_usage_table.sql
3. 20240101000002_create_validate_coupon_function.sql
4. 20240101000003_add_coupon_fields_to_orders.sql
```

### Rollback

```sql
-- To rollback (in reverse order):
ALTER TABLE orders DROP COLUMN coupon_id, DROP COLUMN coupon_code, DROP COLUMN coupon_discount;
DROP FUNCTION validate_coupon;
DROP TABLE coupon_usage;
DROP TABLE coupons;
```

---

## Sample Queries

### Get Active Coupons
```sql
SELECT * FROM coupons
WHERE is_active = true
AND NOW() BETWEEN start_date AND end_date
ORDER BY created_at DESC;
```

### Get Coupon Usage Stats
```sql
SELECT 
  c.code,
  c.used_count,
  COUNT(DISTINCT cu.user_id) as unique_users,
  SUM(cu.discount_amount) as total_discount_given
FROM coupons c
LEFT JOIN coupon_usage cu ON c.id = cu.coupon_id
WHERE c.id = 'coupon-uuid-here'
GROUP BY c.id, c.code, c.used_count;
```

### Get User's Coupon Usage
```sql
SELECT 
  c.code,
  cu.discount_amount,
  cu.created_at,
  o.id as order_id
FROM coupon_usage cu
JOIN coupons c ON cu.coupon_id = c.id
JOIN orders o ON cu.order_id = o.id
WHERE cu.user_id = 'user-uuid-here'
ORDER BY cu.created_at DESC;
```

### Get Available Coupons for Order
```sql
SELECT * FROM coupons
WHERE is_active = true
AND NOW() BETWEEN start_date AND end_date
AND min_order_value <= 2500  -- order total
AND (max_uses IS NULL OR used_count < max_uses)
ORDER BY discount_value DESC;
```

---

## Backup and Maintenance

### Backup Strategy
- Daily full backups of all coupon tables
- Transaction log backups every hour
- Retention: 30 days

### Maintenance Tasks
- Weekly VACUUM ANALYZE on coupon tables
- Monthly index rebuild
- Quarterly usage data archival (older than 1 year)

---

## Security Considerations

### Row-Level Security (RLS)

```sql
-- Enable RLS on coupons table
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Admin can see all coupons
CREATE POLICY admin_all ON coupons
FOR ALL
TO authenticated
USING (auth.jwt() ->> 'role' = 'admin');

-- Users can only see active coupons
CREATE POLICY user_view ON coupons
FOR SELECT
TO authenticated
USING (is_active = true AND NOW() BETWEEN start_date AND end_date);
```

### Audit Logging

All coupon modifications are logged with:
- User ID
- Action (create, update, delete)
- Timestamp
- Changed fields

---

## Performance Metrics

### Expected Performance
- Coupon validation: < 50ms
- Code lookup: < 10ms
- Usage recording: < 100ms
- Admin list query: < 200ms

### Monitoring
- Track slow queries (> 500ms)
- Monitor index usage
- Alert on high used_count values
- Track validation failures

---

*Last Updated: January 2024*
