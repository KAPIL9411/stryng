/**
 * Auth Error Handler
 * Handles authentication errors gracefully
 */

import { supabase } from '../lib/supabaseClient';

/**
 * Handle invalid refresh token error
 * Clears session and redirects to login
 */
export const handleInvalidRefreshToken = async () => {
  try {
    console.warn('⚠️ Handling invalid refresh token...');
    
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    // Clear all storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear IndexedDB caches
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
    
    // Redirect to login
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login?session_expired=true';
    }
  } catch (error) {
    console.error('Error handling invalid refresh token:', error);
    // Force redirect anyway
    window.location.href = '/login';
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
    'Invalid login credentials',
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
    console.warn('⚠️ Auth error detected:', error);
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
      event.preventDefault();
      await handleAuthError(event.reason);
    }
  });
  
  // Handle global errors
  window.addEventListener('error', async (event) => {
    if (event.error && isAuthError(event.error)) {
      event.preventDefault();
      await handleAuthError(event.error);
    }
  });
  
  console.log('✅ Auth error handler initialized');
};
