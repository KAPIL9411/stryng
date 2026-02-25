/**
 * Sync Serviceable Pincodes to Vercel Edge Config
 * Run this script to update Edge Config with latest pincodes
 * 
 * Usage:
 * node scripts/sync-pincodes-to-edge.js
 * 
 * Or add to package.json:
 * "sync:pincodes": "node scripts/sync-pincodes-to-edge.js"
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

async function syncPincodesToEdge() {
  try {
    console.log('📡 Fetching pincodes from Supabase...');
    
    // Fetch all serviceable pincodes
    const { data: pincodes, error } = await supabase
      .from('serviceable_pincodes')
      .select('*')
      .order('pincode', { ascending: true });

    if (error) {
      throw error;
    }

    console.log(`✅ Found ${pincodes.length} pincodes`);

    // Convert array to object for fast lookup
    const pincodesMap = {};
    pincodes.forEach(p => {
      pincodesMap[p.pincode] = {
        city: p.city,
        state: p.state,
        is_active: p.is_active !== false,
        delivery_days: p.delivery_days || 5,
      };
    });

    // Calculate size
    const dataSize = JSON.stringify(pincodesMap).length;
    const sizeKB = (dataSize / 1024).toFixed(2);
    console.log(`📊 Data size: ${sizeKB} KB`);

    if (dataSize > 500 * 1024) {
      console.warn('⚠️  Warning: Data size exceeds 500 KB. Edge Config limit is 512 KB.');
    }

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
              key: 'pincodes',
              value: pincodesMap,
            },
            {
              operation: 'upsert',
              key: 'pincodes_updated_at',
              value: new Date().toISOString(),
            },
            {
              operation: 'upsert',
              key: 'pincodes_count',
              value: pincodes.length,
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
    console.log(`📊 Synced ${pincodes.length} pincodes (${sizeKB} KB)`);
    console.log('⚡ Pincode checking will now be instant (1-5ms) worldwide');

  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

// Run the sync
syncPincodesToEdge();
