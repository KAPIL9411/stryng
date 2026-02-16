# Coupon System - Deployment Guide

## Pre-Deployment Checklist

### 1. Database Migrations ✅
Ensure all migrations are applied in the correct order:

```bash
# Navigate to supabase directory
cd supabase/migrations

# Migrations to apply (in order):
1. 20240101000000_create_coupons_table.sql
2. 20240101000001_create_coupon_usage_table.sql
3. 20240101000002_create_validate_coupon_function.sql
4. 20240101000003_add_coupon_fields_to_orders.sql
```

### 2. Apply Migrations to Production

#### Option A: Supabase Dashboard
1. Log in to Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste each migration file content
4. Execute in order
5. Verify tables created successfully

#### Option B: Supabase CLI
```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push

# Verify migrations
supabase db diff
```

### 3. Verify Database Schema

Run this query to verify all tables exist:

```sql
-- Check coupons table
SELECT * FROM information_schema.tables 
WHERE table_name = 'coupons';

-- Check coupon_usage table
SELECT * FROM information_schema.tables 
WHERE table_name = 'coupon_usage';

-- Check orders table has coupon columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('coupon_id', 'coupon_code', 'coupon_discount');

-- Check validate_coupon function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'validate_coupon';
```

### 4. Set Up Row Level Security (RLS)

```sql
-- Enable RLS on coupons table
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admins have full access to coupons"
ON coupons
FOR ALL
TO authenticated
USING (auth.jwt() ->> 'role' = 'admin')
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Users can view active coupons
CREATE POLICY "Users can view active coupons"
ON coupons
FOR SELECT
TO authenticated
USING (
  is_active = true 
  AND NOW() BETWEEN start_date AND end_date
);

-- Enable RLS on coupon_usage table
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view own coupon usage"
ON coupon_usage
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- System can insert usage records
CREATE POLICY "System can insert coupon usage"
ON coupon_usage
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
```

### 5. Create Indexes (if not already created)

```sql
-- Verify indexes exist
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('coupons', 'coupon_usage', 'orders')
AND indexname LIKE '%coupon%';

-- If missing, create them:
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_dates ON coupons(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon ON coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user ON coupon_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_order ON coupon_usage(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_coupon_id ON orders(coupon_id);
```

---

## Deployment Steps

### Step 1: Build Frontend

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Test production build locally
npm run preview
```

### Step 2: Deploy to Vercel

#### Automatic Deployment (Recommended)

1. **Connect Repository**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your Git repository
   - Vercel will auto-detect Vite configuration

2. **Configure Environment Variables**
   - Add all environment variables in Vercel dashboard:
     ```
     VITE_SUPABASE_URL=your_production_supabase_url
     VITE_SUPABASE_ANON_KEY=your_production_anon_key
     VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_name
     VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
     VITE_GA_MEASUREMENT_ID=your_ga_id
     ```

3. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Vercel will provide a production URL

#### Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Follow prompts to configure project
```

### Step 3: Verify Deployment

1. **Check Frontend**
   - Visit your production URL
   - Navigate to `/admin/coupons`
   - Verify coupon management page loads

2. **Test Coupon Creation**
   - Log in as admin
   - Create a test coupon
   - Verify it appears in the list

3. **Test Customer Flow**
   - Log in as regular user
   - Add items to cart
   - Go to checkout
   - Try applying the test coupon
   - Verify discount is applied

4. **Test Order Creation**
   - Complete an order with coupon
   - Verify coupon data saved in order
   - Check coupon usage recorded
   - Verify used_count incremented

---

## Post-Deployment Tasks

### 1. Create Sample Coupons

```sql
-- Welcome offer
INSERT INTO coupons (
  code, description, discount_type, discount_value,
  min_order_value, max_uses_per_user,
  start_date, end_date, is_active
) VALUES (
  'WELCOME10',
  'Welcome! Get ₹100 off on your first order',
  'fixed',
  100,
  500,
  1,
  NOW(),
  NOW() + INTERVAL '1 year',
  true
);

-- Flash sale
INSERT INTO coupons (
  code, description, discount_type, discount_value,
  max_discount, min_order_value, max_uses, max_uses_per_user,
  start_date, end_date, is_active
) VALUES (
  'FLASH50',
  'Flash Sale! 50% off on orders above ₹2000',
  'percentage',
  50,
  1000,
  2000,
  100,
  1,
  NOW(),
  NOW() + INTERVAL '7 days',
  true
);

-- Loyalty reward
INSERT INTO coupons (
  code, description, discount_type, discount_value,
  max_discount, min_order_value, max_uses_per_user,
  start_date, end_date, is_active
) VALUES (
  'LOYAL20',
  'Thank you for being loyal! 20% off',
  'percentage',
  20,
  500,
  1000,
  3,
  NOW(),
  NOW() + INTERVAL '3 months',
  true
);
```

### 2. Monitor for Errors

#### Check Supabase Logs
1. Go to Supabase Dashboard
2. Navigate to **Logs** → **Database**
3. Filter for errors related to coupons
4. Monitor for:
   - Failed coupon validations
   - Usage recording errors
   - Constraint violations

#### Check Vercel Logs
1. Go to Vercel Dashboard
2. Navigate to your project
3. Click **Logs**
4. Monitor for:
   - API errors
   - Client-side errors
   - Performance issues

### 3. Set Up Monitoring

#### Database Monitoring
```sql
-- Create a view for coupon statistics
CREATE OR REPLACE VIEW coupon_stats AS
SELECT 
  c.code,
  c.discount_type,
  c.discount_value,
  c.used_count,
  c.max_uses,
  COUNT(DISTINCT cu.user_id) as unique_users,
  SUM(cu.discount_amount) as total_discount_given,
  c.is_active,
  c.start_date,
  c.end_date
FROM coupons c
LEFT JOIN coupon_usage cu ON c.id = cu.coupon_id
GROUP BY c.id, c.code, c.discount_type, c.discount_value, 
         c.used_count, c.max_uses, c.is_active, c.start_date, c.end_date;

-- Query to check for issues
SELECT * FROM coupon_stats
WHERE used_count > COALESCE(max_uses, 999999)  -- Over-used coupons
OR (is_active = true AND end_date < NOW());     -- Expired but active
```

#### Application Monitoring
- Set up error tracking (Sentry, LogRocket)
- Monitor coupon validation failures
- Track coupon usage patterns
- Alert on unusual activity

### 4. Performance Testing

#### Load Testing
```bash
# Install k6 (load testing tool)
brew install k6  # macOS
# or
choco install k6  # Windows

# Create load test script (test-coupons.js)
# Run load test
k6 run test-coupons.js
```

#### Test Scenarios
1. **Concurrent Coupon Validations**
   - 100 users validating same coupon simultaneously
   - Verify no race conditions
   - Check used_count accuracy

2. **High Volume Orders**
   - 1000 orders with coupons in 1 hour
   - Monitor database performance
   - Check for bottlenecks

3. **Admin Operations**
   - Creating 100 coupons
   - Bulk updates
   - List page performance

---

## Rollback Plan

If issues are detected after deployment:

### 1. Disable Coupon Feature (Quick Fix)

```sql
-- Disable all coupons temporarily
UPDATE coupons SET is_active = false;
```

### 2. Rollback Database Changes

```sql
-- Remove coupon fields from orders
ALTER TABLE orders 
DROP COLUMN IF EXISTS coupon_id,
DROP COLUMN IF EXISTS coupon_code,
DROP COLUMN IF EXISTS coupon_discount;

-- Drop function
DROP FUNCTION IF EXISTS validate_coupon;

-- Drop tables (WARNING: This deletes all data)
DROP TABLE IF EXISTS coupon_usage CASCADE;
DROP TABLE IF EXISTS coupons CASCADE;
```

### 3. Rollback Frontend

```bash
# Revert to previous deployment in Vercel
vercel rollback
```

---

## Troubleshooting

### Issue: Coupon validation fails

**Symptoms:**
- "Invalid coupon code" for valid coupons
- Validation errors in logs

**Solutions:**
1. Check if `validate_coupon` function exists
2. Verify coupon is active and within date range
3. Check RLS policies allow user access
4. Review function logs in Supabase

### Issue: Used count not incrementing

**Symptoms:**
- Coupon used but used_count stays same
- Multiple uses by same user

**Solutions:**
1. Check if coupon_usage records are created
2. Verify increment logic in order creation
3. Check for transaction rollbacks
4. Review database constraints

### Issue: Discount calculation incorrect

**Symptoms:**
- Wrong discount amount applied
- Max discount not enforced

**Solutions:**
1. Review `validate_coupon` function logic
2. Check if tax calculated correctly
3. Verify order total calculation
4. Test with different order amounts

### Issue: Performance degradation

**Symptoms:**
- Slow coupon validation
- Checkout page lag

**Solutions:**
1. Check if indexes are created
2. Review query execution plans
3. Monitor database connections
4. Consider caching active coupons

---

## Maintenance

### Daily Tasks
- Monitor error logs
- Check for unusual coupon usage
- Review new coupon creations

### Weekly Tasks
- Analyze coupon performance
- Disable expired coupons
- Review usage statistics
- Check for abuse patterns

### Monthly Tasks
- Archive old coupon_usage records
- Optimize database indexes
- Review and update RLS policies
- Performance audit

---

## Support Contacts

- **Database Issues**: Supabase Support
- **Deployment Issues**: Vercel Support
- **Application Issues**: Development Team

---

## Checklist

Before marking deployment complete, verify:

- [ ] All migrations applied successfully
- [ ] RLS policies configured
- [ ] Indexes created
- [ ] Frontend deployed to production
- [ ] Environment variables set
- [ ] Sample coupons created
- [ ] Admin can create/edit coupons
- [ ] Customers can apply coupons
- [ ] Orders save coupon data
- [ ] Usage tracking works
- [ ] Monitoring set up
- [ ] Error tracking configured
- [ ] Performance tested
- [ ] Documentation updated
- [ ] Team trained on coupon management

---

*Deployment Date: _______________*  
*Deployed By: _______________*  
*Production URL: _______________*

