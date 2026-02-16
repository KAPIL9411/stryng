# Coupon System Deployment Checklist

## Pre-Deployment Checklist

### 1. Code Review ✓
- [ ] All code reviewed and approved
- [ ] No console.log statements in production code
- [ ] Error handling implemented
- [ ] Security validations in place
- [ ] Performance optimizations applied

### 2. Testing ✓
- [ ] All unit tests passing (51/51 tests)
- [ ] All integration tests passing
- [ ] Manual testing completed (20/20 scenarios)
- [ ] Cross-browser testing completed
- [ ] Mobile responsiveness verified
- [ ] Performance testing completed

### 3. Documentation ✓
- [ ] API documentation complete
- [ ] Admin user guide created
- [ ] Database schema documented
- [ ] Deployment guide created
- [ ] Testing guide created

### 4. Database Preparation
- [ ] Backup current production database
- [ ] Review migration scripts
- [ ] Test migrations on staging environment
- [ ] Verify rollback procedures

### 5. Environment Configuration
- [ ] Environment variables configured
- [ ] API endpoints verified
- [ ] Database connection strings updated
- [ ] Supabase project configured

---

## Deployment Steps

### Phase 1: Database Migration (10.1)

**Estimated Time:** 15-30 minutes

#### Step 1.1: Backup Production Database
```bash
# Create backup before any changes
pg_dump -h [host] -U [user] -d [database] > backup_pre_coupon_$(date +%Y%m%d_%H%M%S).sql
```

#### Step 1.2: Run Migrations in Order

**Migration 1: Create coupons table**
```sql
-- File: migrations/001_create_coupons_table.sql
CREATE TABLE IF NOT EXISTS coupons (
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

-- Create indexes
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_active ON coupons(is_active);
CREATE INDEX idx_coupons_dates ON coupons(start_date, end_date);

-- Verify table created
SELECT COUNT(*) FROM coupons;
```

**Migration 2: Create coupon_usage table**
```sql
-- File: migrations/002_create_coupon_usage_table.sql
CREATE TABLE IF NOT EXISTS coupon_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  order_id UUID NOT NULL REFERENCES orders(id),
  discount_amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_coupon_usage_coupon ON coupon_usage(coupon_id);
CREATE INDEX idx_coupon_usage_user ON coupon_usage(user_id);
CREATE INDEX idx_coupon_usage_order ON coupon_usage(order_id);

-- Verify table created
SELECT COUNT(*) FROM coupon_usage;
```

**Migration 3: Add coupon fields to orders table**
```sql
-- File: migrations/003_add_coupon_fields_to_orders.sql
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES coupons(id),
ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS coupon_discount DECIMAL(10, 2) DEFAULT 0;

-- Verify columns added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('coupon_id', 'coupon_code', 'coupon_discount');
```

**Migration 4: Create validate_coupon function**
```sql
-- File: migrations/004_create_validate_coupon_function.sql
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
    RETURN json_build_object('valid', false, 'error', 'This coupon has expired');
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
    RETURN json_build_object('valid', false, 'error', 'This coupon has reached its usage limit');
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

-- Test function
SELECT validate_coupon('TEST', '00000000-0000-0000-0000-000000000000', 1000);
```

#### Step 1.3: Verify Migrations
```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('coupons', 'coupon_usage');

-- Check all indexes exist
SELECT indexname 
FROM pg_indexes 
WHERE tablename IN ('coupons', 'coupon_usage');

-- Check function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'validate_coupon';
```

#### Step 1.4: Set Up Row Level Security (RLS)

```sql
-- Enable RLS on coupons table
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admins can manage coupons"
ON coupons
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Customers can only read active coupons
CREATE POLICY "Customers can view active coupons"
ON coupons
FOR SELECT
TO authenticated
USING (is_active = true AND NOW() BETWEEN start_date AND end_date);

-- Enable RLS on coupon_usage table
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view their coupon usage"
ON coupon_usage
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- System can insert usage records
CREATE POLICY "System can insert coupon usage"
ON coupon_usage
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
```

---

### Phase 2: Deploy API Changes (10.2)

**Estimated Time:** 10-15 minutes

#### Step 2.1: Deploy Backend Code
```bash
# Pull latest code
git pull origin main

# Install dependencies
npm install

# Build production bundle
npm run build

# Verify build
ls -la dist/
```

#### Step 2.2: Verify API Endpoints
Test each endpoint after deployment:

**Admin Endpoints:**
- POST /api/admin/coupons - Create coupon
- GET /api/admin/coupons - List coupons
- GET /api/admin/coupons/:id - Get coupon
- PUT /api/admin/coupons/:id - Update coupon
- DELETE /api/admin/coupons/:id - Delete coupon
- PATCH /api/admin/coupons/:id/toggle - Toggle status

**Customer Endpoints:**
- POST /api/coupons/validate - Validate coupon
- GET /api/coupons/available - Get available coupons

#### Step 2.3: API Health Check
```bash
# Test admin endpoint (requires admin auth)
curl -X GET https://your-domain.com/api/admin/coupons \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Test customer endpoint
curl -X GET https://your-domain.com/api/coupons/available?orderTotal=1000 \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
```

---

### Phase 3: Deploy Frontend Changes (10.3)

**Estimated Time:** 15-20 minutes

#### Step 3.1: Build Frontend
```bash
# Build production frontend
npm run build

# Verify build size
du -sh dist/
```

#### Step 3.2: Deploy to Hosting
```bash
# Example for Vercel
vercel --prod

# Example for Netlify
netlify deploy --prod

# Example for custom server
rsync -avz dist/ user@server:/var/www/html/
```

#### Step 3.3: Verify Frontend Routes
- /admin/coupons - Admin coupon list
- /admin/coupons/new - Create coupon form
- /admin/coupons/:id/edit - Edit coupon form
- /checkout - Checkout with coupon section

---

### Phase 4: Production Testing (10.4)

**Estimated Time:** 30-45 minutes

#### Step 4.1: Admin Functionality Testing
- [ ] Login as admin
- [ ] Create a test coupon
- [ ] Edit the coupon
- [ ] Toggle coupon status
- [ ] View coupon statistics
- [ ] Test filters and search
- [ ] Delete unused coupon

#### Step 4.2: Customer Functionality Testing
- [ ] Login as customer
- [ ] Add items to cart
- [ ] Navigate to checkout
- [ ] View available coupons
- [ ] Apply valid coupon
- [ ] Verify discount calculation
- [ ] Remove coupon
- [ ] Apply different coupon
- [ ] Complete order with coupon

#### Step 4.3: Integration Testing
- [ ] Verify order created with coupon data
- [ ] Check coupon_usage record created
- [ ] Verify used_count incremented
- [ ] Test multiple users using same coupon
- [ ] Test usage limit enforcement
- [ ] Test per-user limit enforcement

#### Step 4.4: Error Scenarios Testing
- [ ] Invalid coupon code
- [ ] Expired coupon
- [ ] Inactive coupon
- [ ] Minimum order not met
- [ ] Usage limit reached
- [ ] Per-user limit reached

---

### Phase 5: Monitoring (10.5)

**Estimated Time:** Ongoing

#### Step 5.1: Set Up Monitoring

**Database Monitoring:**
```sql
-- Monitor coupon usage
SELECT 
  c.code,
  c.used_count,
  c.max_uses,
  COUNT(cu.id) as actual_usage
FROM coupons c
LEFT JOIN coupon_usage cu ON c.id = cu.coupon_id
GROUP BY c.id, c.code, c.used_count, c.max_uses;

-- Monitor discount amounts
SELECT 
  DATE(created_at) as date,
  COUNT(*) as usage_count,
  SUM(discount_amount) as total_discount
FROM coupon_usage
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**Application Monitoring:**
- Monitor API response times
- Track error rates
- Monitor database query performance
- Track coupon application success rate

#### Step 5.2: Error Monitoring
Set up alerts for:
- Failed coupon validations
- Database errors
- API endpoint failures
- High response times (>500ms)

#### Step 5.3: Business Metrics
Track:
- Total coupons created
- Active coupons count
- Coupon usage rate
- Total discount given
- Average discount per order
- Most popular coupons

---

### Phase 6: Create Sample Coupons (10.6)

**Estimated Time:** 10 minutes

#### Step 6.1: Create Welcome Coupons
```sql
-- Welcome coupon for new users
INSERT INTO coupons (
  code, description, discount_type, discount_value,
  max_discount, min_order_value, max_uses_per_user,
  start_date, end_date, is_active
) VALUES (
  'WELCOME10',
  'Welcome! Get 10% off on your first order',
  'percentage',
  10,
  500,
  500,
  1,
  NOW(),
  NOW() + INTERVAL '90 days',
  true
);

-- Flat discount coupon
INSERT INTO coupons (
  code, description, discount_type, discount_value,
  min_order_value, max_uses_per_user,
  start_date, end_date, is_active
) VALUES (
  'SAVE100',
  'Save ₹100 on orders above ₹1000',
  'fixed',
  100,
  1000,
  3,
  NOW(),
  NOW() + INTERVAL '30 days',
  true
);

-- High value coupon
INSERT INTO coupons (
  code, description, discount_type, discount_value,
  max_discount, min_order_value, max_uses_per_user,
  start_date, end_date, is_active
) VALUES (
  'MEGA20',
  'Mega Sale! 20% off on orders above ₹2000',
  'percentage',
  20,
  1000,
  2000,
  2,
  NOW(),
  NOW() + INTERVAL '30 days',
  true
);
```

#### Step 6.2: Verify Sample Coupons
```sql
SELECT code, discount_type, discount_value, min_order_value, is_active
FROM coupons
WHERE code IN ('WELCOME10', 'SAVE100', 'MEGA20');
```

---

## Post-Deployment Checklist

### Immediate (First Hour)
- [ ] All migrations completed successfully
- [ ] API endpoints responding correctly
- [ ] Frontend deployed and accessible
- [ ] Admin can create/manage coupons
- [ ] Customers can apply coupons
- [ ] Orders created with coupon data
- [ ] No critical errors in logs

### First Day
- [ ] Monitor error rates
- [ ] Check database performance
- [ ] Verify coupon usage tracking
- [ ] Review user feedback
- [ ] Monitor discount amounts
- [ ] Check API response times

### First Week
- [ ] Analyze coupon usage patterns
- [ ] Review popular coupons
- [ ] Check for any edge cases
- [ ] Optimize queries if needed
- [ ] Gather user feedback
- [ ] Plan improvements

---

## Rollback Procedure

If critical issues are found:

### Step 1: Stop New Coupon Applications
```sql
-- Disable all coupons temporarily
UPDATE coupons SET is_active = false;
```

### Step 2: Restore Database (if needed)
```bash
# Restore from backup
psql -h [host] -U [user] -d [database] < backup_pre_coupon_YYYYMMDD_HHMMSS.sql
```

### Step 3: Revert Frontend
```bash
# Deploy previous version
git checkout [previous-commit]
npm run build
# Deploy to hosting
```

### Step 4: Notify Users
- Display maintenance message
- Inform about temporary coupon unavailability
- Provide ETA for fix

---

## Support Contacts

**Technical Issues:**
- Development Team: dev@example.com
- Database Admin: dba@example.com

**Business Issues:**
- Product Manager: pm@example.com
- Customer Support: support@example.com

---

## Success Criteria

Deployment is considered successful when:
- ✅ All migrations completed without errors
- ✅ All API endpoints responding correctly
- ✅ Frontend deployed and accessible
- ✅ Admin can manage coupons
- ✅ Customers can apply coupons
- ✅ Orders created with coupon data
- ✅ Coupon usage tracked correctly
- ✅ No critical errors in logs
- ✅ Performance within acceptable limits
- ✅ Sample coupons created and working

---

## Notes

- Always test on staging before production
- Keep database backups for at least 30 days
- Monitor closely for first 24 hours
- Document any issues encountered
- Update this checklist based on learnings

**Deployment Date:** _____________  
**Deployed By:** _____________  
**Sign-off:** _____________
