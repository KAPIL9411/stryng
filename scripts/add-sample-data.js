/**
 * Add Sample Data to Firestore
 * Run this script to populate your database with sample products and banners
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Sample Products with Cloudinary images
const sampleProducts = [
  {
    name: 'Classic White T-Shirt',
    slug: 'classic-white-tshirt',
    description: 'Premium 100% cotton t-shirt with a classic fit. Perfect for everyday wear.',
    price: 999,
    originalPrice: 1499,
    discount: 33,
    images: [
      'https://res.cloudinary.com/demo/image/upload/v1/products/white-tshirt.jpg',
    ],
    brand: 'Stryng',
    category: 'tshirts',
    fabric: '100% Cotton',
    colors: [
      { name: 'White', hex: '#FFFFFF' },
      { name: 'Black', hex: '#000000' },
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    stock: 50,
    lowStockThreshold: 10,
    sku: 'TSH-WHT-001',
    isNew: true,
    isTrending: true,
    rating: 4.5,
    reviewCount: 120,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },
  {
    name: 'Slim Fit Blue Jeans',
    slug: 'slim-fit-blue-jeans',
    description: 'Comfortable slim fit jeans with stretch fabric. Perfect for casual and semi-formal occasions.',
    price: 1999,
    originalPrice: 2999,
    discount: 33,
    images: [
      'https://res.cloudinary.com/demo/image/upload/v1/products/blue-jeans.jpg',
    ],
    brand: 'Stryng',
    category: 'jeans',
    fabric: '98% Cotton, 2% Elastane',
    colors: [
      { name: 'Blue', hex: '#4169E1' },
      { name: 'Black', hex: '#000000' },
    ],
    sizes: ['28', '30', '32', '34', '36'],
    stock: 35,
    lowStockThreshold: 10,
    sku: 'JNS-BLU-001',
    isNew: false,
    isTrending: true,
    rating: 4.7,
    reviewCount: 89,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },
  {
    name: 'Formal White Shirt',
    slug: 'formal-white-shirt',
    description: 'Crisp white formal shirt perfect for office and formal events. Easy care fabric.',
    price: 1499,
    originalPrice: 2499,
    discount: 40,
    images: [
      'https://res.cloudinary.com/demo/image/upload/v1/products/white-shirt.jpg',
    ],
    brand: 'Stryng',
    category: 'shirts',
    fabric: '100% Cotton',
    colors: [
      { name: 'White', hex: '#FFFFFF' },
      { name: 'Light Blue', hex: '#ADD8E6' },
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    stock: 42,
    lowStockThreshold: 10,
    sku: 'SHT-WHT-001',
    isNew: true,
    isTrending: false,
    rating: 4.6,
    reviewCount: 67,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },
  {
    name: 'Casual Khaki Trousers',
    slug: 'casual-khaki-trousers',
    description: 'Comfortable khaki trousers for casual and smart-casual wear. Wrinkle-resistant fabric.',
    price: 1799,
    originalPrice: 2499,
    discount: 28,
    images: [
      'https://res.cloudinary.com/demo/image/upload/v1/products/khaki-trousers.jpg',
    ],
    brand: 'Stryng',
    category: 'trousers',
    fabric: '65% Polyester, 35% Cotton',
    colors: [
      { name: 'Khaki', hex: '#C3B091' },
      { name: 'Navy', hex: '#000080' },
    ],
    sizes: ['28', '30', '32', '34', '36'],
    stock: 28,
    lowStockThreshold: 10,
    sku: 'TRS-KHK-001',
    isNew: false,
    isTrending: true,
    rating: 4.4,
    reviewCount: 54,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },
];

// Sample Banners with Cloudinary images
const sampleBanners = [
  {
    title: 'Summer Sale',
    subtitle: 'Up to 50% off on all items',
    image_url: 'https://res.cloudinary.com/demo/image/upload/v1/banners/summer-sale.jpg',
    mobile_image_url: 'https://res.cloudinary.com/demo/image/upload/v1/banners/summer-sale-mobile.jpg',
    cta_text: 'Shop Now',
    cta_link: '/products',
    active: true,
    sort_order: 1,
    createdAt: Timestamp.now(),
  },
  {
    title: 'New Arrivals',
    subtitle: 'Check out our latest collection',
    image_url: 'https://res.cloudinary.com/demo/image/upload/v1/banners/new-arrivals.jpg',
    mobile_image_url: 'https://res.cloudinary.com/demo/image/upload/v1/banners/new-arrivals-mobile.jpg',
    cta_text: 'Explore',
    cta_link: '/products?filter=new',
    active: true,
    sort_order: 2,
    createdAt: Timestamp.now(),
  },
];

// Sample Pincodes
const samplePincodes = [
  { pincode: '400001', city: 'Mumbai', state: 'Maharashtra', deliveryDays: 2, isActive: true },
  { pincode: '110001', city: 'New Delhi', state: 'Delhi', deliveryDays: 3, isActive: true },
  { pincode: '560001', city: 'Bangalore', state: 'Karnataka', deliveryDays: 3, isActive: true },
  { pincode: '600001', city: 'Chennai', state: 'Tamil Nadu', deliveryDays: 4, isActive: true },
  { pincode: '700001', city: 'Kolkata', state: 'West Bengal', deliveryDays: 4, isActive: true },
];

// Sample Coupon
const sampleCoupon = {
  code: 'WELCOME10',
  discountType: 'percentage',
  discountValue: 10,
  minOrderValue: 999,
  maxUses: 100,
  usedCount: 0,
  maxUsesPerUser: 1,
  startDate: Timestamp.now(),
  endDate: Timestamp.fromDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)), // 1 year from now
  isActive: true,
  createdAt: Timestamp.now(),
};

async function addSampleData() {
  try {
    console.log('🚀 Adding sample data to Firestore...\n');

    // Add Products
    console.log('📦 Adding products...');
    for (const product of sampleProducts) {
      const docRef = await addDoc(collection(db, 'products'), product);
      console.log(`  ✅ Added: ${product.name} (${docRef.id})`);
    }

    // Add Banners
    console.log('\n🎨 Adding banners...');
    for (const banner of sampleBanners) {
      const docRef = await addDoc(collection(db, 'banners'), banner);
      console.log(`  ✅ Added: ${banner.title} (${docRef.id})`);
    }

    // Add Pincodes
    console.log('\n📍 Adding pincodes...');
    for (const pincode of samplePincodes) {
      const docRef = await addDoc(collection(db, 'pincodes'), pincode);
      console.log(`  ✅ Added: ${pincode.pincode} - ${pincode.city}`);
    }

    // Add Coupon
    console.log('\n🎟️  Adding coupon...');
    const couponRef = await addDoc(collection(db, 'coupons'), sampleCoupon);
    console.log(`  ✅ Added: ${sampleCoupon.code} (${couponRef.id})`);

    console.log('\n✨ Sample data added successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - ${sampleProducts.length} products`);
    console.log(`  - ${sampleBanners.length} banners`);
    console.log(`  - ${samplePincodes.length} pincodes`);
    console.log(`  - 1 coupon`);
    console.log('\n🎉 Your app is now ready to use!');
    console.log('\nNext steps:');
    console.log('  1. Refresh your browser');
    console.log('  2. You should see products and banners');
    console.log('  3. Use coupon code: WELCOME10 for 10% off');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding sample data:', error);
    process.exit(1);
  }
}

// Run the script
addSampleData();
