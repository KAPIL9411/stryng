/**
 * PRELOAD ADDRESSES - Instant Checkout Experience
 * Loads user addresses on app startup for instant checkout
 */

import { queryClient } from './queryClient';
import { getUserAddresses } from '../api/addresses.api';
import { supabase } from './supabaseClient';

/**
 * Setup address preloading on user login
 * Listens for auth state changes and preloads addresses
 */
export function setupAddressPreload() {
  // Listen for auth state changes
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      console.log('🔐 User logged in, preloading addresses...');
      // Preload addresses in background
      setTimeout(() => {
        preloadAddresses();
      }, 100);
    } else if (event === 'SIGNED_OUT') {
      console.log('🔓 User logged out, clearing address cache...');
      clearAddressesCache();
    }
  });
  
  // Check if user is already logged in
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      console.log('🔐 User already logged in, preloading addresses...');
      preloadAddresses();
    }
  });
}

/**
 * Preload addresses into React Query cache
 * Called on app startup after user login
 */
export async function preloadAddresses() {
  try {
    console.log('🏠 Preloading addresses...');
    
    // Fetch addresses
    const response = await getUserAddresses();
    
    if (response.success && response.data) {
      // Store in React Query cache with 10-minute TTL
      queryClient.setQueryData(['addresses'], response.data, {
        cacheTime: 10 * 60 * 1000, // 10 minutes
        staleTime: 5 * 60 * 1000,  // 5 minutes
      });
      
      console.log(`✅ Preloaded ${response.data.length} addresses`);
      
      // Also store in memory for instant access
      if (typeof window !== 'undefined') {
        window.__ADDRESSES_CACHE__ = {
          data: response.data,
          timestamp: Date.now(),
        };
      }
      
      return response.data;
    }
    
    return [];
  } catch (error) {
    console.error('❌ Error preloading addresses:', error);
    return [];
  }
}

/**
 * Get addresses from cache (instant)
 */
export function getCachedAddresses() {
  // Try React Query cache first
  const cached = queryClient.getQueryData(['addresses']);
  if (cached) {
    console.log('✅ Using cached addresses from React Query');
    return cached;
  }
  
  // Try memory cache
  if (typeof window !== 'undefined' && window.__ADDRESSES_CACHE__) {
    const cache = window.__ADDRESSES_CACHE__;
    const age = Date.now() - cache.timestamp;
    
    // Cache valid for 10 minutes
    if (age < 10 * 60 * 1000) {
      console.log('✅ Using cached addresses from memory');
      return cache.data;
    }
  }
  
  return null;
}

/**
 * Clear addresses cache
 */
export function clearAddressesCache() {
  queryClient.removeQueries(['addresses']);
  if (typeof window !== 'undefined') {
    delete window.__ADDRESSES_CACHE__;
  }
}
