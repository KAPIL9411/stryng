# Production Deployment Guide - Stryng Clothing

## Pre-Deployment Checklist

### 1. Environment Configuration

#### Update `.env.production` file:
```env
# Firebase Configuration (Production)
VITE_FIREBASE_API_KEY=your_production_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_production_domain
VITE_FIREBASE_PROJECT_ID=your_production_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_production_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_production_sender_id
VITE_FIREBASE_APP_ID=your_production_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_production_measurement_id

# Cloudinary Configuration
VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset

# Admin Emails (comma-separated)
VITE_ADMIN_EMAILS=kurmikapil154@gmail.com,admin@stryng.com

# UPI Payment Configuration
VITE_MERCHANT_UPI_ID=your_upi_id@bank
```

### 2. Deploy Firestore Rules

**CRITICAL: Deploy production rules before going live!**

```bash
# Copy production rules to main rules file
cp firestore.rules.production firestore.rules

# Deploy to Firebase
firebase deploy --only firestore:rules

# Verify deployment
firebase firestore:rules:get
```

### 3. Deploy Firestore Indexes

```bash
# Deploy indexes
firebase deploy --only firestore:indexes

# Check index status in Firebase Console
# https://console.firebase.google.com/project/YOUR_PROJECT/firestore/indexes
```

### 4. Initialize Order Counter

Run this script ONCE before accepting orders:

```bash
node scripts/initialize-order-counter.js
```

This creates the counter document at `counters/orders` with `current: 0`.

### 5. Build for Production

```bash
# Install dependencies
npm install

# Build production bundle
npm run build

# Preview production build locally
npm run preview
```

### 6. Deploy to Hosting

#### Option A: Firebase Hosting
```bash
# Deploy to Firebase Hosting
firebase deploy --only hosting

# Or deploy everything at once
firebase deploy
```

#### Option B: Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

#### Option C: Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

---

## Firestore Security Rules Overview

### Admin Access
- Admins identified by email: `kurmikapil154@gmail.com`, `admin@stryng.com`
- Full access to all collections
- Can manage products, orders, banners, coupons, pincodes

### User Access
- **Profiles**: Users can create/update their own profile
- **Orders**: Users can create orders and view their own orders
- **Addresses**: Users can manage their own addresses
- **Coupons**: Public read for validation
- **Products**: Public read access
- **Banners**: Public read access
- **Pincodes**: Public read for delivery check

### Data Validation
- Email format validation
- Phone number validation (Indian format)
- Pincode validation (6 digits)
- Price and stock must be >= 0
- Required fields enforcement
- Order status validation

---

## Post-Deployment Verification

### 1. Test User Flows
- [ ] User registration and login
- [ ] Browse products
- [ ] Add to cart
- [ ] Apply coupon
- [ ] Checkout process
- [ ] Order placement
- [ ] Order tracking
- [ ] Profile update
- [ ] Address management

### 2. Test Admin Flows
- [ ] Admin login
- [ ] Product management (CRUD)
- [ ] Order management
- [ ] Payment verification
- [ ] Banner management
- [ ] Coupon management
- [ ] Pincode management

### 3. Test Security
- [ ] Non-admin cannot access admin routes
- [ ] Users cannot view other users' orders
- [ ] Users cannot modify other users' addresses
- [ ] Invalid data is rejected by Firestore rules

### 4. Performance Checks
- [ ] Page load times < 3 seconds
- [ ] Images are optimized and loading
- [ ] Search autocomplete is responsive
- [ ] No console errors

---

## Monitoring and Maintenance

### Firebase Console Monitoring
1. **Authentication**: Monitor user signups and logins
2. **Firestore**: Check read/write operations and costs
3. **Storage**: Monitor image uploads and storage usage
4. **Hosting**: Check bandwidth and requests

### Regular Tasks
- **Weekly**: Review order statistics
- **Monthly**: Check Firebase usage and costs
- **Quarterly**: Review and update security rules
- **As needed**: Add new pincodes for delivery expansion

---

## Rollback Plan

If issues occur after deployment:

### 1. Revert Firestore Rules
```bash
# Copy development rules
cp firestore.rules.dev firestore.rules

# Deploy
firebase deploy --only firestore:rules
```

### 2. Revert Code Deployment
```bash
# Firebase Hosting
firebase hosting:rollback

# Vercel
vercel rollback

# Netlify
netlify rollback
```

---

## Important Notes

### Admin Email Configuration
- Admin access is controlled by email in Firestore rules
- To add/remove admins, update `firestore.rules.production` and redeploy
- Current admins: `kurmikapil154@gmail.com`, `admin@stryng.com`

### Order Numbers
- Sequential format: `ORD-YYYY-NNNNN` (e.g., ORD-2024-00001)
- Counter stored in `counters/orders` document
- Atomic transactions prevent duplicates
- Initialize counter before first order

### Payment Verification
- UPI payments require manual verification
- Admin must verify transaction ID in bank account
- Approve/reject payment in admin panel
- Order status updates automatically

### Data Backup
- Firebase automatically backs up Firestore data
- Export data regularly for additional safety:
  ```bash
  gcloud firestore export gs://YOUR_BUCKET/backups
  ```

---

## Support and Troubleshooting

### Common Issues

**Issue**: Users can't place orders
- Check Firestore rules are deployed
- Verify user is authenticated
- Check order counter exists

**Issue**: Admin can't access admin panel
- Verify email matches admin list in rules
- Check user is logged in with correct email
- Redeploy Firestore rules if needed

**Issue**: Images not loading
- Check Cloudinary configuration
- Verify upload preset is correct
- Check image URLs in Firestore

**Issue**: Search not working
- Check products collection has data
- Verify Firestore indexes are deployed
- Check browser console for errors

---

## Contact

For deployment support or issues:
- Email: kurmikapil154@gmail.com
- Project: Stryng Clothing E-commerce Platform
