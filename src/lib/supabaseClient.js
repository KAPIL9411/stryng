import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase environment variables. Check your .env file.'
  );
  throw new Error(
    'Supabase configuration is required. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env.local file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Track if we're already handling an auth error to prevent loops
let isHandlingAuthError = false;

// Suppress Supabase auth errors in console
const originalConsoleError = console.error;
console.error = (...args) => {
  // Check if this is a Supabase auth error we want to suppress
  const errorString = args.join(' ');
  if (
    errorString.includes('AuthApiError') ||
    errorString.includes('Invalid Refresh Token') ||
    errorString.includes('Refresh Token Not Found')
  ) {
    // Silently ignore these errors - they're handled by our error handler
    return;
  }
  // Log all other errors normally
  originalConsoleError.apply(console, args);
};

// Handle auth errors globally
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('✅ Token refreshed successfully');
    isHandlingAuthError = false; // Reset flag on successful refresh
  }
  
  if (event === 'SIGNED_OUT') {
    console.log('👋 User signed out');
    // Clear any cached data
    try {
      localStorage.removeItem('stryng-storage');
    } catch (e) {
      console.warn('Could not clear storage:', e);
    }
    isHandlingAuthError = false; // Reset flag
  }
  
  if (event === 'USER_UPDATED') {
    console.log('👤 User updated');
  }
});

// Handle refresh token errors with safety checks
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  try {
    const response = await originalFetch(...args);
    
    // Only handle auth token errors, and only once
    if (
      !isHandlingAuthError &&
      response.status === 400 && 
      args[0]?.includes?.('auth/v1/token')
    ) {
      const clonedResponse = response.clone();
      try {
        const data = await clonedResponse.json();
        if (data.error && data.error.includes('Invalid Refresh Token')) {
          isHandlingAuthError = true; // Set flag to prevent loops
          
          // Silently handle the error - don't log to console
          // Use setTimeout to avoid blocking the current request
          setTimeout(async () => {
            try {
              // Clear session
              await supabase.auth.signOut();
              // Clear storage
              localStorage.clear();
              sessionStorage.clear();
              // Redirect to login if not already there
              if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login?session_expired=true';
              }
            } catch (e) {
              // Silently handle cleanup errors
            } finally {
              isHandlingAuthError = false;
            }
          }, 100);
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }
    
    return response;
  } catch (error) {
    // Only log non-auth errors
    if (!error.message?.includes('Invalid Refresh Token')) {
      console.error('Fetch error:', error);
    }
    throw error;
  }
};
