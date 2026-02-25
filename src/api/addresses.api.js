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
    // Validate pincode format
    if (!pincode || !/^\d{6}$/.test(pincode)) {
      return {
        success: false,
        error: 'Please enter a valid 6-digit pincode',
      };
    }

    const { data, error } = await supabase.rpc('check_pincode_serviceability', {
      p_pincode: pincode,
    });

    // If function doesn't exist (PGRST202), skip check and allow all pincodes
    if (error && error.code === 'PGRST202') {
      console.warn('Pincode serviceability function not found in database. Please run the SQL migration.');
      return {
        success: true,
        data: {
          is_serviceable: true,
          message: 'Pincode validation temporarily unavailable - proceeding with order',
        },
      };
    }

    if (error) throw error;

    // The function returns an array with one result
    const result = data && data.length > 0 ? data[0] : null;

    if (!result) {
      return {
        success: true,
        data: {
          is_serviceable: false,
          message: 'Sorry, we do not deliver to this pincode yet',
        },
      };
    }

    // Log the check
    await logPincodeCheck(pincode, result.is_serviceable);

    return {
      success: true,
      data: {
        is_serviceable: result.is_serviceable,
        message: result.message,
        city: result.city,
        state: result.state,
        delivery_days: result.delivery_days,
      },
    };
  } catch (error) {
    console.error('Error checking pincode:', error);
    // On any error, allow the pincode (fail open for better UX)
    return {
      success: true,
      data: {
        is_serviceable: true,
        message: 'Pincode check unavailable - proceeding with order',
      },
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
    console.log('addAddress called with data:', addressData);
    
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    console.log('User:', user);
    
    if (!user) {
      console.error('User not authenticated');
      throw new Error('User not authenticated');
    }

    // Validate required fields
    const requiredFields = ['full_name', 'phone', 'pincode', 'address_line1', 'city', 'state'];
    const missingFields = requiredFields.filter(field => !addressData[field] || addressData[field].trim() === '');
    
    console.log('Missing fields:', missingFields);
    
    if (missingFields.length > 0) {
      const error = `Missing required fields: ${missingFields.join(', ')}`;
      console.error(error);
      return {
        success: false,
        error,
      };
    }

    // Validate phone number (10-15 digits for international support)
    const phoneRegex = /^[0-9]{10,15}$/;
    const cleanPhone = addressData.phone.replace(/\s/g, '');
    console.log('Phone validation:', cleanPhone, 'Length:', cleanPhone.length, 'Valid:', phoneRegex.test(cleanPhone));
    
    if (!phoneRegex.test(cleanPhone)) {
      const error = `Please enter a valid phone number (10-15 digits). You entered ${cleanPhone.length} digits: ${cleanPhone}`;
      console.error(error);
      return {
        success: false,
        error,
      };
    }

    // Validate pincode (6 digits)
    const pincodeRegex = /^[0-9]{6}$/;
    console.log('Pincode validation:', addressData.pincode, pincodeRegex.test(addressData.pincode));
    
    if (!pincodeRegex.test(addressData.pincode)) {
      const error = 'Please enter a valid 6-digit pincode';
      console.error(error);
      return {
        success: false,
        error,
      };
    }

    // Check if pincode is serviceable (optional check)
    console.log('Checking pincode serviceability...');
    const serviceabilityCheck = await checkPincodeServiceability(
      addressData.pincode
    );
    
    console.log('Serviceability check result:', serviceabilityCheck);
    
    // Only block if explicitly not serviceable (not on errors)
    if (
      serviceabilityCheck.success &&
      serviceabilityCheck.data.is_serviceable === false
    ) {
      const error = serviceabilityCheck.data.message || 
        'This pincode is not serviceable. Please try a different address.';
      console.error(error);
      return {
        success: false,
        error,
      };
    }

    // If this is the first address or is_default is true, unset other defaults
    if (addressData.is_default) {
      console.log('Unsetting other default addresses...');
      await supabase
        .from('customer_addresses')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('is_active', true);
    }

    // Prepare clean address data
    const cleanAddressData = {
      user_id: user.id,
      full_name: addressData.full_name.trim(),
      phone: cleanPhone,
      pincode: addressData.pincode.trim(),
      address_line1: addressData.address_line1.trim(),
      address_line2: addressData.address_line2 ? addressData.address_line2.trim() : null,
      landmark: addressData.landmark ? addressData.landmark.trim() : null,
      city: addressData.city.trim(),
      state: addressData.state.trim(),
      address_type: addressData.address_type || 'home',
      is_default: addressData.is_default || false,
      is_active: true,
    };

    console.log('Clean address data:', cleanAddressData);
    console.log('Inserting into database...');

    const { data, error } = await supabase
      .from('customer_addresses')
      .insert(cleanAddressData)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    console.log('Address saved successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error adding address:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to save address. Please try again.' 
    };
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

    // Validate required fields
    const requiredFields = ['full_name', 'phone', 'pincode', 'address_line1', 'city', 'state'];
    const missingFields = requiredFields.filter(field => !addressData[field] || addressData[field].trim() === '');
    
    if (missingFields.length > 0) {
      return {
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`,
      };
    }

    // Validate phone number (10-15 digits for international support)
    const phoneRegex = /^[0-9]{10,15}$/;
    const cleanPhone = addressData.phone.replace(/\s/g, '');
    
    if (!phoneRegex.test(cleanPhone)) {
      return {
        success: false,
        error: `Please enter a valid phone number (10-15 digits). You entered ${cleanPhone.length} digits: ${cleanPhone}`,
      };
    }

    // Validate pincode (6 digits)
    const pincodeRegex = /^[0-9]{6}$/;
    if (!pincodeRegex.test(addressData.pincode)) {
      return {
        success: false,
        error: 'Please enter a valid 6-digit pincode',
      };
    }

    // If pincode is being updated, check serviceability (optional check)
    if (addressData.pincode) {
      const serviceabilityCheck = await checkPincodeServiceability(
        addressData.pincode
      );
      
      // Only block if explicitly not serviceable (not on errors)
      if (
        serviceabilityCheck.success &&
        serviceabilityCheck.data.is_serviceable === false
      ) {
        return {
          success: false,
          error:
            serviceabilityCheck.data.message || 
            'This pincode is not serviceable. Please try a different address.',
        };
      }
    }

    // If setting as default, unset other defaults
    if (addressData.is_default) {
      await supabase
        .from('customer_addresses')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('is_active', true)
        .neq('id', addressId);
    }

    // Prepare clean address data
    const cleanAddressData = {
      full_name: addressData.full_name.trim(),
      phone: addressData.phone.replace(/\s/g, ''),
      pincode: addressData.pincode.trim(),
      address_line1: addressData.address_line1.trim(),
      address_line2: addressData.address_line2 ? addressData.address_line2.trim() : null,
      landmark: addressData.landmark ? addressData.landmark.trim() : null,
      city: addressData.city.trim(),
      state: addressData.state.trim(),
      address_type: addressData.address_type || 'home',
      is_default: addressData.is_default || false,
    };

    const { data, error } = await supabase
      .from('customer_addresses')
      .update(cleanAddressData)
      .eq('id', addressId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error updating address:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to update address. Please try again.' 
    };
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

    // First, unset all other defaults
    await supabase
      .from('customer_addresses')
      .update({ is_default: false })
      .eq('user_id', user.id)
      .eq('is_active', true);

    // Then set the selected address as default
    const { data, error } = await supabase
      .from('customer_addresses')
      .update({ is_default: true })
      .eq('id', addressId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error setting default address:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to set default address. Please try again.' 
    };
  }
}
