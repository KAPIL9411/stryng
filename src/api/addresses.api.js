import { supabase } from '../lib/supabaseClient';
import { handleAPIError } from '../utils/apiHelpers';

/**
 * Require authentication helper
 */
async function requireAuth() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('User not authenticated');
  }
  return user;
}

/**
 * Format Supabase response
 */
function formatResponse(response, context = 'operation') {
  if (response.error) {
    return handleAPIError(response.error, context);
  }
  return {
    success: true,
    data: response.data,
  };
}

/**
 * Check if a pincode is serviceable
 * @param {string} pincode - 6 digit pincode
 * @returns {Promise<Object>} Serviceability details
 */
export async function checkPincodeServiceability(pincode) {
  try {
    const { data, error } = await supabase.rpc('check_pincode_serviceability', {
      p_pincode: pincode,
    });

    if (error) throw error;

    // Log the check
    await logPincodeCheck(pincode, data[0]?.is_serviceable || false);

    return {
      success: true,
      data: data[0] || {
        is_serviceable: false,
        message: 'Sorry, we do not deliver to this pincode yet',
      },
    };
  } catch (error) {
    console.error('Error checking pincode:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Log pincode check for analytics
 */
async function logPincodeCheck(pincode, isServiceable, productId = null) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from('pincode_check_logs').insert({
      pincode,
      is_serviceable: isServiceable,
      user_id: user?.id || null,
      product_id: productId,
    });
  } catch (error) {
    console.error('Error logging pincode check:', error);
  }
}

/**
 * Get all addresses for current user
 */
export async function getUserAddresses() {
  try {
    const user = await requireAuth();

    const response = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    return formatResponse(response, 'fetching addresses');
  } catch (error) {
    return handleAPIError(error, 'fetching addresses');
  }
}

/**
 * Get default address for current user
 */
export async function getDefaultAddress() {
  try {
    const user = await requireAuth();

    const response = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .eq('is_default', true)
      .single();

    // PGRST116 = no rows, which is not an error in this case
    if (response.error && response.error.code !== 'PGRST116') {
      throw response.error;
    }

    return formatResponse(response, 'fetching default address');
  } catch (error) {
    return handleAPIError(error, 'fetching default address');
  }
}

/**
 * Add new address
 */
export async function addAddress(addressData) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if pincode is serviceable
    const serviceabilityCheck = await checkPincodeServiceability(
      addressData.pincode
    );
    if (
      !serviceabilityCheck.success ||
      !serviceabilityCheck.data.is_serviceable
    ) {
      return {
        success: false,
        error:
          'This pincode is not serviceable. Please try a different address.',
      };
    }

    const { data, error } = await supabase
      .from('customer_addresses')
      .insert({
        ...addressData,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error adding address:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update existing address
 */
export async function updateAddress(addressId, addressData) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // If pincode is being updated, check serviceability
    if (addressData.pincode) {
      const serviceabilityCheck = await checkPincodeServiceability(
        addressData.pincode
      );
      if (
        !serviceabilityCheck.success ||
        !serviceabilityCheck.data.is_serviceable
      ) {
        return {
          success: false,
          error:
            'This pincode is not serviceable. Please try a different address.',
        };
      }
    }

    const { data, error } = await supabase
      .from('customer_addresses')
      .update(addressData)
      .eq('id', addressId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating address:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete address (soft delete)
 */
export async function deleteAddress(addressId) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('customer_addresses')
      .update({ is_active: false })
      .eq('id', addressId)
      .eq('user_id', user.id);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting address:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Set address as default
 */
export async function setDefaultAddress(addressId) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('customer_addresses')
      .update({ is_default: true })
      .eq('id', addressId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error setting default address:', error);
    return { success: false, error: error.message };
  }
}
