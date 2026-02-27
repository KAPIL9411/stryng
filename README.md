# Stryng Clothing - E-commerce Platform

A modern, full-featured e-commerce platform built with React, Firebase, and Vite. Features include product management, shopping cart, checkout, order tracking, admin panel, and more.

## 🚀 Features

### Customer Features
- **Product Browsing**: Browse products by category with filters and sorting
- **Smart Search**: Autocomplete search with recent and trending searches
- **Shopping Cart**: Add/remove items, update quantities
- **Wishlist**: Save favorite products
- **Checkout**: Secure checkout with address management
- **Coupon System**: Apply discount coupons at checkout
- **Multiple Payment Methods**: UPI/QR Code and Cash on Delivery
- **Order Tracking**: Track order status in real-time
- **User Profile**: Manage personal information and addresses
- **Order History**: View past orders with detailed information
- **Pincode Checker**: Check delivery availability

### Admin Features
- **Dashboard**: Overview of orders, revenue, and statistics
- **Product Management**: CRUD operations for products with image upload
- **Order Management**: View, update order status, verify payments
- **Banner Management**: Manage homepage banners
- **Coupon Management**: Create and manage discount coupons
- **Pincode Management**: Manage serviceable pincodes
- **Payment Verification**: Manual verification for UPI payments

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **State Management**: Zustand
- **Routing**: React Router v6
- **Styling**: CSS3 with CSS Variables
- **Image Optimization**: Cloudinary
- **Icons**: Lucide React
- **Data Fetching**: React Query

## 📋 Prerequisites

- Node.js 16+ and npm
- Firebase account
- Cloudinary account (for image uploads)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/stryng-clothing.git
   cd stryng-clothing
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create `.env.local` file:
   ```env
   # Firebase Configuration
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

   # Cloudinary Configuration
   VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
   VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset

   # Admin Emails (comma-separated)
   VITE_ADMIN_EMAILS=admin@example.com

   # UPI Payment Configuration
   VITE_MERCHANT_UPI_ID=your_upi_id@bank
   ```

4. **Initialize Firebase**
   ```bash
   # Login to Firebase
   firebase login

   # Initialize project
   firebase init

   # Deploy Firestore rules and indexes
   firebase deploy --only firestore
   ```

5. **Initialize order counter**
   ```bash
   node scripts/initialize-order-counter.js
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

## 📦 Build for Production

```bash
# Build
npm run build

# Preview production build
npm run preview

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

## 🔐 Security

### Firestore Rules
Production-ready security rules are in `firestore.rules.production`. Key features:
- Admin access control by email
- Users can only access their own data
- Public read for products, banners, coupons
- Data validation (email, phone, pincode formats)
- Required fields enforcement

### Admin Access
Admins are identified by email in Firestore rules. Update the admin email list in:
- `firestore.rules.production`
- `.env.local` (VITE_ADMIN_EMAILS)

## 📱 Project Structure

```
stryng-clothing/
├── public/              # Static assets
├── scripts/             # Utility scripts
├── src/
│   ├── api/            # API functions
│   ├── components/     # React components
│   ├── hooks/          # Custom hooks
│   ├── lib/            # Utilities and helpers
│   ├── pages/          # Page components
│   ├── store/          # State management
│   ├── styles/         # CSS files
│   └── utils/          # Utility functions
├── firestore.rules.production  # Production Firestore rules
├── firestore-indexes.json      # Firestore indexes
└── PRODUCTION_DEPLOYMENT.md    # Deployment guide
```

## 🎨 Key Features Implementation

### Order System
- Sequential order numbers: `ORD-YYYY-NNNNN`
- Atomic counter using Firestore transactions
- Order status tracking
- Payment verification workflow

### Search Functionality
- Real-time autocomplete
- Recent searches (localStorage)
- Trending searches
- Smart matching (starts with, contains)

### Image Optimization
- Cloudinary integration
- Lazy loading
- Progressive image loading
- Responsive images

### Coupon System
- Percentage and fixed discounts
- Minimum order value
- Usage limits per user
- Expiry dates
- Admin management

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📊 Performance

- Lighthouse Score: 90+
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Code splitting and lazy loading
- Optimized images
- Efficient state management

## 🚀 Deployment

See [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy
```bash
# Build and deploy
npm run build
firebase deploy
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 👥 Authors

- **Kapil Kurmi** - *Initial work* - kurmikapil154@gmail.com

## 🙏 Acknowledgments

- React team for the amazing framework
- Firebase for backend services
- Cloudinary for image optimization
- All contributors and testers

## 📞 Support

For support, email kurmikapil154@gmail.com or open an issue in the repository.

---

**Note**: This is a production-ready e-commerce platform. Make sure to review and update security rules, environment variables, and configurations before deploying to production.
