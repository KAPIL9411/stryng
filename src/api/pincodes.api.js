/**
 * Pincodes API - Firebase Firestore
 * Manages serviceable pincodes for delivery
 * @module api/pincodes
 */

import { serverTimestamp } from 'firebase/firestore';
import {
  COLLECTIONS,
  getDocuments,
  addDocument,
  updateDocument,
  deleteDocument,
} from '../lib/firestoreHelpers';

/**
 * Check if a pincode is serviceable
 * @param {string} pincode - Pincode to check
 * @returns {Promise<Object>} Serviceability result
 */
export const checkPincode = async (pincode) => {
  try {
    // Fetch from Firestore
    const pincodes = await getDocuments(COLLECTIONS.SERVICEABLE_PINCODES, {
      where: [
        ['pincode', '==', pincode],
        ['is_active', '==', true],
      ],
      limit: 1,
    });

    if (pincodes.length === 0) {
      return {
        success: true,
        serviceable: false,
        message: "Sorry, we don't deliver to this pincode yet",
      };
    }

    const pincodeData = pincodes[0];

    return {
      success: true,
      serviceable: true,
      message: `Delivery available to ${pincodeData.city}, ${pincodeData.state}`,
      data: {
        pincode: pincodeData.pincode,
        city: pincodeData.city,
        state: pincodeData.state,
        delivery_days: pincodeData.delivery_days || 5,
      },
    };
  } catch (error) {
    console.error('Error checking pincode:', error);
    return {
      success: false,
      serviceable: false,
      message: 'Unable to check pincode. Please try again.',
    };
  }
};

/**
 * Search pincodes by city/state
 * @param {string} query - Search query
 * @returns {Promise<Array>} Matching pincodes
 */
export const searchPincodes = async (query) => {
  try {
    if (!query || query.length < 2) return [];

    // Use cache if available
    if (pincodesCache && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_TTL) {
      const searchTerm = query.toLowerCase();
      return Object.values(pincodesCache)
        .filter(
          (p) =>
            p.city?.toLowerCase().includes(searchTerm) ||
            p.state?.toLowerCase().includes(searchTerm) ||
            p.pincode.includes(searchTerm)
        )
        .slice(0, 20);
    }

    // Fetch from Firestore
    const allPincodes = await getDocuments(COLLECTIONS.SERVICEABLE_PINCODES, {
      where: [['is_active', '==', true]],
      limit: 100,
    });

    const searchTerm = query.toLowerCase();
    return allPincodes
      .filter(
        (p) =>
          p.city?.toLowerCase().includes(searchTerm) ||
          p.state?.toLowerCase().includes(searchTerm) ||
          p.pincode.includes(searchTerm)
      )
      .slice(0, 20);
  } catch (error) {
    console.error('Error searching pincodes:', error);
    return [];
  }
};

/**
 * Get all serviceable pincodes (Admin only)
 * @returns {Promise<Object>} All pincodes with success flag
 */
export const getAllServiceablePincodes = async () => {
  try {
    const pincodes = await getDocuments(COLLECTIONS.SERVICEABLE_PINCODES, {
      orderBy: [['pincode', 'asc']],
    });
    return { success: true, data: pincodes };
  } catch (error) {
    console.error('Error fetching all pincodes:', error);
    return { success: false, data: [] };
  }
};

/**
 * Get all serviceable pincodes (Admin only) - Alias
 * @returns {Promise<Array>} All pincodes
 */
export const getAllPincodes = async () => {
  const result = await getAllServiceablePincodes();
  return result.data;
};

/**
 * Add a new serviceable pincode (Admin only)
 * @param {Object} pincodeData - Pincode data
 * @returns {Promise<Object>} Result with success flag
 */
export const addServiceablePincode = async (pincodeData) => {
  try {
    const pincodeId = await addDocument(COLLECTIONS.SERVICEABLE_PINCODES, {
      ...pincodeData,
      is_active: pincodeData.is_active !== false,
      delivery_days: pincodeData.estimated_delivery_days || pincodeData.delivery_days || 5,
      estimated_delivery_days: pincodeData.estimated_delivery_days || pincodeData.delivery_days || 5,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });

    // Clear cache
    pincodesCache = null;

    return { success: true, id: pincodeId };
  } catch (error) {
    console.error('Error adding pincode:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Add a new serviceable pincode (Admin only) - Alias
 * @param {Object} pincodeData - Pincode data
 * @returns {Promise<string>} New pincode ID
 */
export const addPincode = async (pincodeData) => {
  const result = await addServiceablePincode(pincodeData);
  if (!result.success) throw new Error(result.error);
  return result.id;
};

/**
 * Update a pincode (Admin only)
 * @param {string} pincodeId - Pincode ID
 * @param {Object} pincodeData - Updated pincode data
 * @returns {Promise<Object>} Result with success flag
 */
export const updateServiceablePincode = async (pincodeId, pincodeData) => {
  try {
    await updateDocument(COLLECTIONS.SERVICEABLE_PINCODES, pincodeId, {
      ...pincodeData,
      delivery_days: pincodeData.estimated_delivery_days || pincodeData.delivery_days || 5,
      estimated_delivery_days: pincodeData.estimated_delivery_days || pincodeData.delivery_days || 5,
      updated_at: serverTimestamp(),
    });

    // Clear cache
    pincodesCache = null;

    return { success: true };
  } catch (error) {
    console.error('Error updating pincode:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update a pincode (Admin only) - Alias
 * @param {string} pincodeId - Pincode ID
 * @param {Object} pincodeData - Updated pincode data
 * @returns {Promise<void>}
 */
export const updatePincode = async (pincodeId, pincodeData) => {
  const result = await updateServiceablePincode(pincodeId, pincodeData);
  if (!result.success) throw new Error(result.error);
};

/**
 * Delete a pincode (Admin only)
 * @param {string} pincodeId - Pincode ID
 * @returns {Promise<Object>} Result with success flag
 */
export const deleteServiceablePincode = async (pincodeId) => {
  try {
    await deleteDocument(COLLECTIONS.SERVICEABLE_PINCODES, pincodeId);

    // Clear cache
    pincodesCache = null;

    return { success: true };
  } catch (error) {
    console.error('Error deleting pincode:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete a pincode (Admin only) - Alias
 * @param {string} pincodeId - Pincode ID
 * @returns {Promise<void>}
 */
export const deletePincode = async (pincodeId) => {
  const result = await deleteServiceablePincode(pincodeId);
  if (!result.success) throw new Error(result.error);
};

/**
 * Bulk upload pincodes (Admin only)
 * @param {Array} pincodesArray - Array of pincode objects
 * @returns {Promise<Object>} Result with count
 */
export const bulkUploadPincodes = async (pincodesArray) => {
  try {
    let successCount = 0;
    const errors = [];

    for (const pincodeData of pincodesArray) {
      try {
        await addDocument(COLLECTIONS.SERVICEABLE_PINCODES, {
          ...pincodeData,
          is_active: pincodeData.is_active !== false,
          delivery_days: pincodeData.estimated_delivery_days || pincodeData.delivery_days || 5,
          estimated_delivery_days: pincodeData.estimated_delivery_days || pincodeData.delivery_days || 5,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
        successCount++;
      } catch (error) {
        errors.push({ pincode: pincodeData.pincode, error: error.message });
      }
    }

    // Clear cache
    pincodesCache = null;

    return {
      success: true,
      count: successCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error('Error bulk uploading pincodes:', error);
    return { success: false, error: error.message, count: 0 };
  }
};

/**
 * Clear pincodes cache
 */
export const clearPincodesCache = () => {
  pincodesCache = null;
  cacheTimestamp = null;
};

export default {
  checkPincode,
  searchPincodes,
  getAllPincodes,
  getAllServiceablePincodes,
  addPincode,
  addServiceablePincode,
  updatePincode,
  updateServiceablePincode,
  deletePincode,
  deleteServiceablePincode,
  bulkUploadPincodes,
};
