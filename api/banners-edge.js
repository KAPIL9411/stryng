/**
 * Vercel Edge Function for Ultra-Fast Banner Loading
 * Uses Edge Config for instant global delivery
 * 
 * Setup:
 * 1. Create Edge Config in Vercel Dashboard
 * 2. Add EDGE_CONFIG environment variable
 * 3. Deploy this function
 */

import { get } from '@vercel/edge-config';

export const config = {
  runtime: 'edge',
};

// Cache duration: 1 hour (3600 seconds)
const CACHE_DURATION = 3600;

export default async function handler(request) {
  try {
    // Try to get banners from Edge Config (ultra-fast)
    const banners = await get('banners');

    if (banners) {
      console.log('✅ Banners served from Edge Config');
      
      return new Response(JSON.stringify({
        success: true,
        data: banners,
        source: 'edge-config',
        cached: true,
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `public, s-maxage=${CACHE_DURATION}, stale-while-revalidate`,
          'CDN-Cache-Control': `public, s-maxage=${CACHE_DURATION}`,
          'Vercel-CDN-Cache-Control': `public, s-maxage=${CACHE_DURATION}`,
        },
      });
    }

    // Fallback: Fetch from Supabase if Edge Config is empty
    console.log('⚠️ Edge Config empty, fetching from Supabase...');
    
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/banners?active=eq.true&order=sort_order.asc`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase fetch failed: ${response.statusText}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify({
      success: true,
      data,
      source: 'supabase',
      cached: false,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, s-maxage=${CACHE_DURATION}, stale-while-revalidate`,
      },
    });

  } catch (error) {
    console.error('❌ Edge function error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      data: [],
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
