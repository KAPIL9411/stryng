/**
 * Auth Error Handler
 * Handles authentication errors gracefully
 */

import { supabase } from '../lib/supabaseClient';

// Track if we're already handling an error to prevent loops
let isHandling = false;
let lastHandledTime = 0;
const THROTTLE_MS = 5000; // Don't handle same error within 5 seconds

/**
 * Handle invalid refresh token error
 * Clears session and redirects to login
 */
export const handleInvalidRefreshToken = async () => {
  // Throttle to prevent rapid repeated calls
  const now = Date.now();
  if (isHandling || (now - lastHandledTime) < THROTTLE_MS) {
    console.log('⏳ Auth error handling throttled');
    return;
  }
  
  isHandling = true;
  lastHandledTime = now;
  
  try {
    console.warn('⚠️ Handling invalid refresh token...');
    
    // Sign out from Supabase (with error handling)
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Sign out error (non-critical):', e);
    }
    
    // Clear all storage (with error handling)
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('Storage clear error (non-critical):', e);
    }
    
    // Clear IndexedDB caches (with error handling)
    if ('indexedDB' in window) {
      try {
        const dbs = await indexedDB.databases();
        dbs.forEach(db => {
          if (db.name) {
            indexedDB.deleteDatabase(db.name);
          }
        });
      } catch (e) {
        console.warn('Could not clear IndexedDB:', e);
      }
    }
    
    console.log('✅ Session cleared');
    
    // Redirect to login (only if not already there)
    if (!window.location.pathname.includes('/login')) {
      // Use custom event for navigation in production
      window.dispatchEvent(new CustomEvent('requireAuth', { 
        detail: { redirectTo: '/login?session_expired=true' } 
      }));
      
      // Fallback to direct navigation after a delay
      setTimeout(() => {
        if (!window.location.pathname.includes('/login')) {
          window.location.replace('/login?session_expired=true');
        }
      }, 100);
    }
  } catch (error) {
    console.error('Error handling invalid refresh token:', error);
    // Force redirect anyway as last resort
    if (!window.location.pathname.includes('/login')) {
      window.location.replace('/login');
    }
  } finally {
    // Reset flag after a delay
    setTimeout(() => {
      isHandling = false;
    }, 2000);
  }
};

/**
 * Check if error is an auth error
 */
export const isAuthError = (error) => {
  if (!error) return false;
  
  const authErrorMessages = [
    'Invalid Refresh Token',
    'Refresh Token Not Found',
    'JWT expired',
    'invalid claim',
  ];
  
  const errorMessage = error.message || error.error || String(error);
  
  return authErrorMessages.some(msg => 
    errorMessage.toLowerCase().includes(msg.toLowerCase())
  );
};

/**
 * Handle any auth error
 */
export const handleAuthError = async (error) => {
  if (isAuthError(error)) {
    console.warn('⚠️ Auth error detected:', error.message || error);
    await handleInvalidRefreshToken();
    return true;
  }
  return false;
};

/**
 * Setup global error handler for auth errors
 */
export const setupAuthErrorHandler = () => {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', async (event) => {
    if (event.reason && isAuthError(event.reason)) {
      console.log('🔍 Caught unhandled auth error');
      event.preventDefault(); // Prevent error from propagating
      await handleAuthError(event.reason);
    }
  });
  
  // Handle global errors (but don't prevent all errors)
  window.addEventListener('error', async (event) => {
    if (event.error && isAuthError(event.error)) {
      console.log('🔍 Caught global auth error');
      event.preventDefault(); // Prevent error from propagating
      await handleAuthError(event.error);
    }
  });
  
  console.log('✅ Auth error handler initialized');
};
