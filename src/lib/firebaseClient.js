/**
 * Firebase Client Configuration
 * Handles authentication and real-time features
 * @module lib/firebaseClient
 */

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  connectAuthEmulator,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Validate configuration
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('Missing Firebase configuration. Check your .env.local file.');
  throw new Error(
    'Firebase configuration is required. Please add VITE_FIREBASE_* variables to your .env.local file.'
  );
}

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

// Set persistence to LOCAL (survives browser restarts)
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Failed to set auth persistence:', error);
});

// Connect to Emulators in development
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
  console.log('🔧 Connected to Firebase Emulators');
}

// Initialize Analytics (only in production)
let analytics = null;
if (import.meta.env.PROD) {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
      console.log('📊 Firebase Analytics initialized');
    }
  }).catch((error) => {
    console.warn('Analytics not supported:', error);
  });
}

export { analytics };

// Auth error handler
let isHandlingAuthError = false;

export const handleAuthError = async (error) => {
  if (isHandlingAuthError) return;
  
  const errorCode = error?.code || '';
  const errorMessage = error?.message || '';

  // Map Firebase errors to user-friendly messages
  const errorMap = {
    'auth/invalid-email': 'Invalid email address.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/operation-not-allowed': 'This operation is not allowed.',
    'auth/invalid-credential': 'Invalid credentials. Please try again.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
    'auth/popup-closed-by-user': 'Sign-in popup was closed.',
    'auth/cancelled-popup-request': 'Sign-in was cancelled.',
    'auth/requires-recent-login': 'Please sign in again to continue.',
  };

  const friendlyMessage = errorMap[errorCode] || errorMessage || 'An error occurred. Please try again.';

  // Handle session expiration
  if (errorCode === 'auth/requires-recent-login') {
    isHandlingAuthError = true;
    try {
      await auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
      
      // Dispatch custom event for navigation
      window.dispatchEvent(new CustomEvent('requireAuth', { 
        detail: { redirectTo: '/login?session_expired=true' } 
      }));
      
      setTimeout(() => {
        if (!window.location.pathname.includes('/login')) {
          window.location.replace('/login?session_expired=true');
        }
      }, 100);
    } catch (e) {
      console.error('Error during auth cleanup:', e);
    } finally {
      isHandlingAuthError = false;
    }
  }

  return friendlyMessage;
};

// Listen for auth state changes globally
auth.onAuthStateChanged((user) => {
  // Auth state changes are handled by the store
  // No console logs needed here
});

// Suppress Firebase auth errors in console (they're handled by our error handler)
const originalConsoleError = console.error;
console.error = (...args) => {
  const errorString = args.join(' ');
  
  // Suppress Firebase auth errors (handled by our error handler)
  if (
    errorString.includes('Firebase:') ||
    errorString.includes('auth/') ||
    errorString.includes('FirebaseError')
  ) {
    return;
  }
  
  // Suppress browser extension errors
  if (
    errorString.includes('runtime.lastError') ||
    errorString.includes('message port closed') ||
    errorString.includes('Extension context invalidated')
  ) {
    return;
  }
  
  // Log all other errors normally
  originalConsoleError.apply(console, args);
};

console.log('🔥 Firebase initialized successfully');
console.log('📦 Firestore database ready');
