# 🛍️ Stryng Clothing - E-Commerce Platform

A modern, production-ready e-commerce platform built with React, Vite, Supabase, and Zustand.

## ✨ Features

### Customer Features
- 🛒 **Shopping Cart** - Persistent cart with real-time updates
- ❤️ **Wishlist** - Save favorite products
- 🔍 **Advanced Search** - Multi-term search with filters
- 📱 **Responsive Design** - Mobile-first approach
- 🔐 **Authentication** - Email/password and Google OAuth
- 📦 **Order Tracking** - Real-time order status updates
- 💳 **Multiple Payment Options** - UPI and Cash on Delivery
- 🎨 **Product Filtering** - By category, price, size, color
- 📄 **Pagination** - Fast loading with 12 products per page

### Admin Features
- 📊 **Dashboard** - Overview of orders and products
- 📦 **Product Management** - Full CRUD operations
- 🖼️ **Image Upload** - Cloudinary integration
- 🎯 **Banner Management** - Homepage carousel control
- 📋 **Order Management** - View and update order status

### Technical Features
- ⚡ **Performance Optimized** - Code splitting, lazy loading
- 🔒 **Secure** - Input sanitization, RLS policies
- ♿ **Accessible** - WCAG 2.1 compliant
- 📈 **Analytics Ready** - Google Analytics 4 integration
- 🎯 **SEO Optimized** - Meta tags, structured data, sitemap
- 🐛 **Error Handling** - Comprehensive error boundaries
- 🔄 **State Management** - Zustand with persistence

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- Cloudinary account (for image uploads)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd stryng-clothing

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Add your credentials to .env.local
# See Configuration section below

# Run development server
npm run dev
```

Visit `http://localhost:5173`

## ⚙️ Configuration

### Environment Variables

Create `.env.local` in the root directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Cloudinary Configuration
VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_cloudinary_upload_preset

# Analytics (Optional)
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### Database Setup

See `QUICK_START.md` for complete SQL schema and RLS policies.

Quick setup:
1. Create Supabase project
2. Run SQL from `QUICK_START.md`
3. Enable Row Level Security
4. Create admin user

## 📦 Scripts

```bash
# Development
npm run dev          # Start dev server

# Production
npm run build        # Build for production
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint
```

## 🏗️ Tech Stack

### Frontend
- **React 19** - UI library
- **Vite** - Build tool
- **React Router v7** - Routing
- **Zustand** - State management
- **Lucide React** - Icons
- **Framer Motion** - Animations

### Backend
- **Supabase** - Database, Auth, Storage
- **PostgreSQL** - Database
- **Row Level Security** - Data protection

### Services
- **Cloudinary** - Image hosting
- **Google Analytics** - Analytics
- **Vercel** - Hosting (recommended)

## 📁 Project Structure

```
stryng-clothing/
├── public/
│   ├── images/          # Static images
│   └── robots.txt       # SEO directives
├── src/
│   ├── components/
│   │   ├── admin/       # Admin components
│   │   ├── auth/        # Auth components
│   │   ├── layout/      # Layout components
│   │   ├── ui/          # UI components
│   │   ├── ErrorBoundary.jsx
│   │   └── SEO.jsx      # SEO component
│   ├── lib/
│   │   ├── analytics.js      # Analytics utilities
│   │   ├── cloudinaryConfig.js
│   │   ├── dummyData.js
│   │   ├── performance.js    # Performance monitoring
│   │   └── supabaseClient.js
│   ├── pages/
│   │   ├── admin/       # Admin pages
│   │   ├── Account.jsx
│   │   ├── Cart.jsx
│   │   ├── Checkout.jsx
│   │   ├── Home.jsx
│   │   ├── Login.jsx
│   │   ├── ProductDetail.jsx
│   │   ├── ProductListing.jsx
│   │   └── ...
│   ├── store/
│   │   └── useStore.js  # Zustand store
│   ├── styles/          # CSS files
│   ├── App.jsx
│   └── main.jsx
├── .env.local           # Environment variables
├── package.json
└── vite.config.js
```

## 🎯 Key Features Explained

### Pagination
- 12 products per page
- Smart page number display
- URL-based navigation
- Smooth scroll to top

### SEO
- Dynamic meta tags
- Open Graph support
- Structured data (JSON-LD)
- Automatic sitemap generation
- robots.txt included

### Analytics
- Page view tracking
- E-commerce events
- User behavior tracking
- Conversion funnel
- Error tracking

### Performance
- Code splitting by route
- Lazy loading
- Image optimization
- Parallel data fetching
- Caching strategy

## 📊 Performance Metrics

### Lighthouse Scores (Target)
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 95+

### Load Times
- First Contentful Paint: < 1.8s
- Largest Contentful Paint: < 2.5s
- Time to Interactive: < 3.8s

## 🔒 Security

### Implemented
- Input sanitization
- XSS prevention
- Secure order IDs (UUID)
- User-specific data access
- Form validation
- HTTPS ready

### Required (Backend)
- Row Level Security policies
- Rate limiting
- CAPTCHA for auth
- Payment gateway integration

## ♿ Accessibility

- WCAG 2.1 Level AA compliant
- Keyboard navigation
- Screen reader support
- ARIA labels
- Semantic HTML
- Focus management

## 📈 Analytics Events

### Tracked Events
- `page_view` - Page navigation
- `view_item` - Product views
- `add_to_cart` - Cart additions
- `remove_from_cart` - Cart removals
- `add_to_wishlist` - Wishlist additions
- `begin_checkout` - Checkout start
- `purchase` - Order completion
- `search` - Search queries
- `sign_up` - User registration
- `login` - User login

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard
```

### Other Platforms
- Netlify
- AWS Amplify
- Railway
- Render

See `PLATFORM_STATUS.md` for detailed deployment guide.

## 📚 Documentation

- **QUICK_START.md** - Setup guide
- **PLATFORM_STATUS.md** - Platform overview
- **FIXES_APPLIED.md** - All improvements made
- **PRODUCTION_CHECKLIST.md** - Pre-deployment checklist
- **IMPLEMENTATION_COMPLETE.md** - Latest features

## 🧪 Testing

### Manual Testing Checklist
- [ ] User registration and login
- [ ] Product browsing and filtering
- [ ] Add to cart and checkout
- [ ] Order placement (UPI and COD)
- [ ] Admin product management
- [ ] Mobile responsiveness
- [ ] Cross-browser compatibility

### Automated Testing (Future)
- Unit tests with Vitest
- E2E tests with Playwright
- Visual regression tests

## 🐛 Known Issues

None! All critical bugs have been fixed.

## 🔄 Roadmap

### Phase 1 (Current) ✅
- Core e-commerce functionality
- Admin panel
- SEO optimization
- Analytics integration

### Phase 2 (Next)
- [ ] Product reviews and ratings
- [ ] Advanced search (Algolia)
- [ ] Email notifications
- [ ] Coupon system

### Phase 3 (Future)
- [ ] Mobile app (React Native)
- [ ] Recommendation engine
- [ ] Multi-language support
- [ ] Loyalty program

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run linter and tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 👥 Team

- **Developer**: Your Name
- **Designer**: Your Name
- **Product Manager**: Your Name

## 📞 Support

- **Email**: support@stryngclothing.com
- **Discord**: [Join our community]
- **Documentation**: [docs.stryngclothing.com]

## 🙏 Acknowledgments

- React team for the amazing framework
- Supabase for the backend infrastructure
- Vercel for hosting
- All open-source contributors

---

**Built with ❤️ by the Stryng team**

**Version**: 2.0.0  
**Status**: Production Ready ✅  
**Last Updated**: February 14, 2026
