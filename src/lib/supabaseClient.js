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

// Handle auth errors globally
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('✅ Token refreshed successfully');
  }
  
  if (event === 'SIGNED_OUT') {
    console.log('👋 User signed out');
    // Clear any cached data
    localStorage.removeItem('stryng-storage');
  }
  
  if (event === 'USER_UPDATED') {
    console.log('👤 User updated');
  }
});

// Handle refresh token errors
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  try {
    const response = await originalFetch(...args);
    
    // Check for auth errors
    if (response.status === 400 && args[0]?.includes?.('auth/v1/token')) {
      const clonedResponse = response.clone();
      try {
        const data = await clonedResponse.json();
        if (data.error === 'Invalid Refresh Token: Refresh Token Not Found') {
          console.warn('⚠️ Invalid refresh token detected - clearing session');
          // Clear session
          await supabase.auth.signOut();
          // Clear storage
          localStorage.clear();
          sessionStorage.clear();
          // Redirect to login if not already there
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }
    
    return response;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
};
