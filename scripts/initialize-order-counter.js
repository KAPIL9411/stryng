/**
 * Initialize Order Counter in Firestore
 * Run this script once to set up the order counter
 * 
 * Usage: node scripts/initialize-order-counter.js [starting_number]
 * Example: node scripts/initialize-order-counter.js 1
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

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

async function initializeCounter() {
  try {
    // Get starting number from command line argument, default to 1
    const startingNumber = parseInt(process.argv[2]) || 1;
    
    console.log('🔧 Initializing order counter...');
    console.log(`📊 Starting number: ${startingNumber}`);
    
    const counterRef = doc(db, 'counters', 'orders');
    
    // Check if counter already exists
    const counterDoc = await getDoc(counterRef);
    
    if (counterDoc.exists()) {
      const currentValue = counterDoc.data().current;
      console.log(`⚠️  Counter already exists with value: ${currentValue}`);
      console.log('');
      console.log('Options:');
      console.log('1. Keep existing counter (recommended)');
      console.log('2. Reset counter (will cause duplicate order numbers!)');
      console.log('');
      console.log('To reset, delete the counter document from Firebase Console first.');
      return;
    }
    
    // Create counter document
    await setDoc(counterRef, {
      current: startingNumber - 1, // Subtract 1 because first order will increment to startingNumber
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      description: 'Sequential order number counter',
    });
    
    console.log('✅ Order counter initialized successfully!');
    console.log(`📝 Next order will be: ORD-${new Date().getFullYear()}-${String(startingNumber).padStart(5, '0')}`);
    console.log('');
    console.log('Counter document created at: counters/orders');
    
  } catch (error) {
    console.error('❌ Error initializing counter:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the initialization
initializeCounter();
