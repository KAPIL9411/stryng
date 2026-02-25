/**
 * Sync Banners to Vercel Edge Config
 * Run this script to update Edge Config with latest banners
 * 
 * Usage:
 * node scripts/sync-banners-to-edge.js
 * 
 * Or add to package.json:
 * "sync:banners": "node scripts/sync-banners-to-edge.js"
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const edgeConfigId = process.env.EDGE_CONFIG_ID;
const vercelToken = process.env.VERCEL_TOKEN;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

if (!edgeConfigId || !vercelToken) {
  console.error('❌ Missing Vercel Edge Config credentials');
  console.log('ℹ️  Set EDGE_CONFIG_ID and VERCEL_TOKEN in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncBannersToEdge() {
  try {
    console.log('📡 Fetching banners from Supabase...');
    
    // Fetch active banners
    const { data: banners, error } = await supabase
      .from('banners')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      throw error;
    }

    console.log(`✅ Found ${banners.length} active banners`);

    // Update Edge Config
    console.log('🚀 Updating Vercel Edge Config...');
    
    const response = await fetch(
      `https://api.vercel.com/v1/edge-config/${edgeConfigId}/items`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${vercelToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [
            {
              operation: 'upsert',
              key: 'banners',
              value: banners,
            },
            {
              operation: 'upsert',
              key: 'banners_updated_at',
              value: new Date().toISOString(),
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Edge Config update failed: ${error}`);
    }

    console.log('✅ Edge Config updated successfully!');
    console.log(`📊 Synced ${banners.length} banners`);
    console.log('⚡ Banners will now load instantly from edge locations worldwide');

  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

// Run the sync
syncBannersToEdge();
