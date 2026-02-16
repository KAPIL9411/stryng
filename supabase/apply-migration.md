# How to Apply the Coupon System Migrations

Since we don't have Supabase CLI linked to the project, you can apply the migrations manually.

## Important: Drop Old Table First

There's an existing `coupons` table with a different schema. We need to drop it first.

## Step-by-Step Instructions

### Step 1: Drop Old Tables

1. Go to your Supabase project dashboard: https://gztnpezilwunmjocjglk.supabase.co
2. Navigate to the **SQL Editor**
3. Copy and run the contents of `supabase/migrations/00000000000000_drop_old_coupons.sql`

```sql
DROP TABLE IF EXISTS coupons CASCADE;
DROP TABLE IF EXISTS coupon_usage CASCADE;
```

### Step 2: Create New Tables

Run these migrations **in order**:

#### 2.1 Create Coupons Table
Copy and run: `supabase/migrations/20240101000000_create_coupons_table.sql`

#### 2.2 Create Coupon Usage Table
Copy and run: `supabase/migrations/20240101000001_create_coupon_usage_table.sql`

#### 2.3 Create Validate Coupon Function
Copy and run: `supabase/migrations/20240101000002_create_validate_coupon_function.sql`

### Step 3: Reload Schema Cache

**IMPORTANT:** After applying all migrations, you MUST reload the PostgREST schema cache:

**Option A: Using Dashboard**
1. Go to **Settings** → **API**
2. Click **"Reload schema cache"** button

**Option B: Using SQL**
```sql
NOTIFY pgrst, 'reload schema';
```

## Verify the Setup

After applying all migrations and reloading the cache, run this SQL to verify:

```sql
-- Check table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'coupons';

-- Test the function
SELECT validate_coupon('TEST20', '00000000-0000-0000-0000-000000000000'::uuid, 2000);
```

The function should return a JSON object with `{"valid": false, "error": "Invalid coupon code"}`.
