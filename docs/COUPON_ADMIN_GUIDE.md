# Coupon System - Admin User Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Accessing Coupon Management](#accessing-coupon-management)
3. [Creating Coupons](#creating-coupons)
4. [Managing Coupons](#managing-coupons)
5. [Monitoring Usage](#monitoring-usage)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Introduction

The Coupon System allows you to create and manage discount codes for your customers. You can offer percentage-based or fixed-amount discounts with various conditions and limits.

### Key Features
- Create percentage or fixed discount coupons
- Set minimum order requirements
- Limit total uses and per-user uses
- Set validity periods
- Track usage statistics
- Enable/disable coupons instantly

---

## Accessing Coupon Management

1. Log in to the admin panel
2. Click on **"Coupons"** in the sidebar navigation
3. You'll see the Coupons Management page with all existing coupons

---

## Creating Coupons

### Step 1: Click "Create Coupon"
Click the **"+ Create Coupon"** button in the top right corner.

### Step 2: Fill in Coupon Details

#### Basic Information
- **Coupon Code** (Required)
  - 4-20 characters
  - Alphanumeric only (A-Z, 0-9)
  - Will be converted to uppercase
  - Must be unique
  - Example: `SAVE20`, `WELCOME10`, `FLASH50`

- **Description** (Optional)
  - Brief description of the offer
  - Shown to customers
  - Example: "20% off on orders above ₹1000"

#### Discount Configuration

**Discount Type:**
- **Percentage**: Discount as a percentage of order value
- **Fixed**: Fixed amount discount

**Discount Value:**
- For Percentage: Enter 0-100 (e.g., 20 for 20% off)
- For Fixed: Enter amount in rupees (e.g., 500 for ₹500 off)

**Maximum Discount** (Percentage only):
- Optional cap on discount amount
- Example: 20% off with max ₹500 discount
- Leave empty for no cap

**Minimum Order Value:**
- Minimum cart value required to use coupon
- Enter 0 for no minimum
- Example: 1000 for ₹1000 minimum order

#### Usage Limits

**Maximum Uses:**
- Total number of times coupon can be used
- Leave empty for unlimited uses
- Example: 100 for first 100 customers

**Maximum Uses Per User:**
- How many times each user can use the coupon
- Default: 1 (one-time use per user)
- Example: 3 for three-time use per user

#### Validity Period

**Start Date:**
- When the coupon becomes active
- Can be set to future date for scheduled campaigns

**End Date:**
- When the coupon expires
- Must be after start date

**Active Status:**
- Toggle to enable/disable coupon
- Disabled coupons cannot be used

### Step 3: Save Coupon
Click **"Create Coupon"** to save. You'll see a success message.

---

## Managing Coupons

### Viewing Coupons

The coupon list shows:
- **Code**: The coupon code
- **Type**: Percentage or Fixed
- **Discount**: Discount value
- **Min Order**: Minimum order requirement
- **Validity**: Start and end dates
- **Usage**: Used count / Max uses
- **Status**: Active, Inactive, or Expired

### Filtering Coupons

Use the filter buttons:
- **All**: Show all coupons
- **Active**: Currently active coupons
- **Expired**: Past end date
- **Inactive**: Manually disabled

### Searching Coupons

Use the search bar to find coupons by code.

### Editing Coupons

1. Click the **Edit** icon (pencil) next to a coupon
2. Modify the fields (code cannot be changed)
3. Click **"Update Coupon"**

**Note:** You cannot reduce max_uses below current used_count.

### Toggling Status

Click the **Toggle** button to quickly enable/disable a coupon without editing.

### Deleting Coupons

1. Click the **Delete** icon (trash) next to a coupon
2. Confirm deletion in the dialog

**Important:** You cannot delete coupons that have been used (used_count > 0). This preserves order history.

---

## Monitoring Usage

### Usage Statistics

For each coupon, you can see:
- **Used Count**: Number of times used
- **Remaining Uses**: If max_uses is set
- **Usage Percentage**: Visual indicator

### Detailed Usage Report

Click on a coupon to view:
- Total discount given
- Number of unique users
- Recent orders using the coupon
- Usage timeline

---

## Best Practices

### Coupon Code Naming
- Keep codes short and memorable
- Use descriptive names (SAVE20, WELCOME10)
- Avoid confusing characters (0 vs O, 1 vs I)

### Discount Strategy

**Percentage Discounts:**
- Good for: Encouraging larger orders
- Set max_discount to control costs
- Example: 20% off, max ₹500

**Fixed Discounts:**
- Good for: Flat offers, first-time users
- Simple and easy to understand
- Example: ₹100 off on first order

### Setting Limits

**Minimum Order Value:**
- Ensures profitability
- Encourages larger purchases
- Typical: 2-3x the discount amount

**Usage Limits:**
- Control campaign budget
- Create urgency (limited uses)
- Prevent abuse

**Per-User Limits:**
- Usually set to 1 for new customer offers
- Can be higher for loyalty programs

### Validity Periods

**Short-term Campaigns:**
- Flash sales: 24-48 hours
- Weekend offers: Friday-Sunday
- Creates urgency

**Long-term Campaigns:**
- Seasonal offers: 1-3 months
- Welcome codes: Always active
- Loyalty programs: Quarterly

### Testing Coupons

Before launching:
1. Create a test coupon
2. Try applying it in checkout
3. Complete a test order
4. Verify discount calculation
5. Check usage tracking

---

## Common Scenarios

### Scenario 1: Welcome Offer
```
Code: WELCOME10
Type: Fixed
Value: ₹100
Min Order: ₹500
Max Uses: Unlimited
Per User: 1
Validity: Always active
```

### Scenario 2: Flash Sale
```
Code: FLASH50
Type: Percentage
Value: 50%
Max Discount: ₹1000
Min Order: ₹2000
Max Uses: 100
Per User: 1
Validity: 24 hours
```

### Scenario 3: Loyalty Reward
```
Code: LOYAL20
Type: Percentage
Value: 20%
Max Discount: ₹500
Min Order: ₹1000
Max Uses: Unlimited
Per User: 3
Validity: 3 months
```

### Scenario 4: Minimum Order Incentive
```
Code: SAVE200
Type: Fixed
Value: ₹200
Min Order: ₹1500
Max Uses: 500
Per User: 1
Validity: 1 month
```

---

## Troubleshooting

### Coupon Not Working for Customers

**Check:**
1. Is the coupon active?
2. Is it within validity period?
3. Has it reached max uses?
4. Does order meet minimum value?
5. Has user already used it (per-user limit)?

### Cannot Delete Coupon

**Reason:** Coupon has been used in orders.

**Solution:** Disable the coupon instead of deleting it. This preserves order history.

### Discount Not Calculating Correctly

**Check:**
1. For percentage: Is max_discount set?
2. Is tax calculated after discount?
3. Is shipping included in calculation?

### Coupon Code Already Exists

**Solution:** Choose a different code. Codes must be unique.

---

## Tips for Success

1. **Plan Campaigns**: Schedule coupons in advance
2. **Monitor Usage**: Check statistics regularly
3. **Set Budgets**: Use max_uses to control costs
4. **Test First**: Always test before announcing
5. **Clear Communication**: Describe offers clearly
6. **Track ROI**: Monitor sales vs. discount given
7. **Seasonal Offers**: Align with holidays/events
8. **Urgency**: Use limited-time offers
9. **Segmentation**: Different codes for different channels
10. **Feedback**: Learn from customer usage patterns

---

## Support

For technical issues or questions:
- Contact: admin@stryng.com
- Documentation: See COUPON_API.md for technical details

---

## Quick Reference

### Coupon Types
| Type | Use Case | Example |
|------|----------|---------|
| Percentage | Encourage larger orders | 20% off |
| Fixed | Simple flat discount | ₹100 off |

### Status Indicators
| Status | Color | Meaning |
|--------|-------|---------|
| Active | Green | Currently usable |
| Inactive | Gray | Manually disabled |
| Expired | Red | Past end date |

### Common Limits
| Limit | Typical Value | Purpose |
|-------|---------------|---------|
| Min Order | 2-3x discount | Ensure profitability |
| Max Uses | 50-500 | Control budget |
| Per User | 1 | Prevent abuse |

---

*Last Updated: January 2024*
