import { supabase } from '../lib/supabaseClient';

/**
 * ADMIN: Get all serviceable pincodes
 */
export async function getAllServiceablePincodes() {
  try {
    const { data, error } = await supabase
      .from('serviceable_pincodes')
      .select('*')
      .order('state')
      .order('city')
      .order('pincode');

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching pincodes:', error);
    return { success: false, error: error.message };
  }
}

/**
 * ADMIN: Add new serviceable pincode
 */
export async function addServiceablePincode(pincodeData) {
  try {
    const { data, error } = await supabase
      .from('serviceable_pincodes')
      .insert(pincodeData)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error adding pincode:', error);
    return { success: false, error: error.message };
  }
}

/**
 * ADMIN: Update serviceable pincode
 */
export async function updateServiceablePincode(pincodeId, pincodeData) {
  try {
    const { data, error } = await supabase
      .from('serviceable_pincodes')
      .update(pincodeData)
      .eq('id', pincodeId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating pincode:', error);
    return { success: false, error: error.message };
  }
}

/**
 * ADMIN: Delete serviceable pincode
 */
export async function deleteServiceablePincode(pincodeId) {
  try {
    const { error } = await supabase
      .from('serviceable_pincodes')
      .delete()
      .eq('id', pincodeId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting pincode:', error);
    return { success: false, error: error.message };
  }
}

/**
 * ADMIN: Bulk upload pincodes from CSV
 */
export async function bulkUploadPincodes(pincodesArray) {
  try {
    const { data, error } = await supabase
      .from('serviceable_pincodes')
      .upsert(pincodesArray, {
        onConflict: 'pincode',
        ignoreDuplicates: false,
      })
      .select();

    if (error) throw error;

    return {
      success: true,
      data,
      count: data.length,
    };
  } catch (error) {
    console.error('Error bulk uploading pincodes:', error);
    return { success: false, error: error.message };
  }
}

/**
 * ADMIN: Get pincode check analytics
 */
export async function getPincodeAnalytics() {
  try {
    const { data, error } = await supabase
      .from('pincode_check_analytics')
      .select('*')
      .limit(100);

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return { success: false, error: error.message };
  }
}

/**
 * ADMIN: Get address statistics
 */
export async function getAddressStatistics() {
  try {
    const { data, error } = await supabase
      .from('address_statistics')
      .select('*')
      .limit(50);

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching address statistics:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Search pincodes by city or state
 */
export async function searchPincodes(searchTerm) {
  try {
    const { data, error } = await supabase
      .from('serviceable_pincodes')
      .select('*')
      .or(
        `city.ilike.%${searchTerm}%,state.ilike.%${searchTerm}%,pincode.ilike.%${searchTerm}%`
      )
      .eq('is_active', true)
      .limit(20);

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error searching pincodes:', error);
    return { success: false, error: error.message };
  }
}
