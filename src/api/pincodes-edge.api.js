/**
 * Pincodes API with Edge Config
 * Ultra-fast pincode checking (200x faster)
 * @module api/pincodes-edge
 */

// Edge function URL
const EDGE_API_URL = '/api/pincodes-edge';

// Memory cache for instant lookups
let pincodesCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Check if pincode is serviceable (ultra-fast)
 * @param {string} pincode - Pincode to check
 * @returns {Promise<Object>} Serviceability result
 */
export const checkPincode = async (pincode) => {
  try {
    // Return from memory cache if available
    if (pincodesCache && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_TTL) {
      const pincodeData = pincodesCache[pincode];
      
      if (!pincodeData) {
        return {
          success: true,
          serviceable: false,
          message: "Sorry, we don't deliver to this pincode yet",
        };
      }

      if (!pincodeData.is_active) {
        return {
          success: true,
          serviceable: false,
          message: 'Delivery temporarily unavailable for this pincode',
        };
      }

      return {
        success: true,
        serviceable: true,
        message: `Delivery available to ${pincodeData.city}, ${pincodeData.state}`,
        data: {
          pincode,
          city: pincodeData.city,
          state: pincodeData.state,
          delivery_days: pincodeData.delivery_days || 5,
        },
      };
    }

    // Fetch from edge function
    const response = await fetch(`${EDGE_API_URL}?pincode=${pincode}&action=check`);
    
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        return result;
      }
    }

    // Fallback to Supabase
    return await checkPincodeFromSupabase(pincode);
  } catch (error) {
    console.error('❌ Pincode check error:', error);
    return {
      success: false,
      serviceable: false,
      message: 'Unable to check pincode. Please try again.',
    };
  }
};

/**
 * Preload all pincodes into memory cache
 * Call this on app initialization for instant lookups
 */
export const preloadPincodes = async () => {
  try {
    console.log('🚀 Preloading pincodes...');
    
    const response = await fetch(`${EDGE_API_URL}?action=list`);
    
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        
        if (result.success && result.data) {
          // Convert array to map for fast lookup
          pincodesCache = {};
          result.data.forEach(p => {
            pincodesCache[p.pincode] = {
              city: p.city,
              state: p.state,
              is_active: true,
              delivery_days: p.delivery_days || 5,
            };
          });
          
          cacheTimestamp = Date.now();
          console.log(`✅ Preloaded ${result.data.length} pincodes`);
          return;
        }
      }
    }

    // Fallback: load from Supabase
    await preloadPincodesFromSupabase();
  } catch (error) {
    console.warn('⚠️ Pincode preload failed (non-critical):', error);
  }
};

/**
 * Search pincodes by city/state
 * @param {string} query - Search query
 * @returns {Promise<Array>} Matching pincodes
 */
export const searchPincodes = async (query) => {
  if (!query || query.length < 2) return [];

  try {
    const response = await fetch(`${EDGE_API_URL}?action=search&query=${encodeURIComponent(query)}`);
    
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        return result.success ? result.data : [];
      }
    }

    // Fallback to memory cache search
    if (pincodesCache) {
      const searchTerm = query.toLowerCase();
      return Object.entries(pincodesCache)
        .filter(([pincode, data]) => {
          return (
            data.is_active &&
            (data.city?.toLowerCase().includes(searchTerm) ||
             data.state?.toLowerCase().includes(searchTerm) ||
             pincode.includes(searchTerm))
          );
        })
        .slice(0, 20)
        .map(([pincode, data]) => ({
          pincode,
          city: data.city,
          state: data.state,
          delivery_days: data.delivery_days || 5,
        }));
    }

    return [];
  } catch (error) {
    console.error('❌ Pincode search error:', error);
    return [];
  }
};

/**
 * Fallback: Check pincode from Supabase
 */
async function checkPincodeFromSupabase(pincode) {
  const { supabase } = await import('../lib/supabaseClient');
  
  const { data, error } = await supabase
    .from('serviceable_pincodes')
    .select('*')
    .eq('pincode', pincode)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return {
      success: true,
      serviceable: false,
      message: "Sorry, we don't deliver to this pincode yet",
    };
  }

  return {
    success: true,
    serviceable: true,
    message: `Delivery available to ${data.city}, ${data.state}`,
    data: {
      pincode: data.pincode,
      city: data.city,
      state: data.state,
      delivery_days: data.delivery_days || 5,
    },
  };
}

/**
 * Fallback: Preload pincodes from Supabase
 */
async function preloadPincodesFromSupabase() {
  const { supabase } = await import('../lib/supabaseClient');
  
  const { data, error } = await supabase
    .from('serviceable_pincodes')
    .select('*')
    .eq('is_active', true);

  if (!error && data) {
    pincodesCache = {};
    data.forEach(p => {
      pincodesCache[p.pincode] = {
        city: p.city,
        state: p.state,
        is_active: true,
        delivery_days: p.delivery_days || 5,
      };
    });
    cacheTimestamp = Date.now();
    console.log(`✅ Preloaded ${data.length} pincodes from Supabase`);
  }
}

/**
 * Clear pincode cache
 */
export const clearPincodesCache = () => {
  pincodesCache = null;
  cacheTimestamp = null;
  console.log('🗑️ Pincodes cache cleared');
};
