/**
 * Addresses API - Firebase Firestore
 * Manages user delivery addresses
 * @module api/addresses
 */

import { serverTimestamp } from 'firebase/firestore';
import {
  COLLECTIONS,
  getDocument,
  getDocuments,
  addDocument,
  updateDocument,
  deleteDocument,
} from '../lib/firestoreHelpers';

/**
 * Get all addresses for a user
 * @param {string} userId - User ID (optional, will use current user if not provided)
 * @returns {Promise<Object>} Response with addresses
 */
export const getUserAddresses = async (userId = null) => {
  try {
    // If no userId provided, get from auth
    if (!userId) {
      const { auth } = await import('../lib/firebaseClient');
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return { success: false, error: 'User not authenticated', data: [] };
      }
      userId = currentUser.uid;
    }

    const addresses = await getDocuments(COLLECTIONS.ADDRESSES, {
      where: [['user_id', '==', userId]],
      orderBy: [['created_at', 'desc']],
    });

    return { success: true, data: addresses };
  } catch (error) {
    console.error('Error fetching user addresses:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Get a single address by ID
 * @param {string} addressId - Address ID
 * @returns {Promise<Object>} Response with address data
 */
export const getAddressById = async (addressId) => {
  try {
    const address = await getDocument(COLLECTIONS.ADDRESSES, addressId);
    return { success: true, data: address };
  } catch (error) {
    console.error('Error fetching address:', error);
    return { success: false, error: error.message, data: null };
  }
};

/**
 * Create a new address
 * @param {Object} addressData - Address data (userId optional, will use current user)
 * @returns {Promise<Object>} Response with new address ID
 */
export const createAddress = async (addressData) => {
  try {
    // Get current user if userId not provided
    let userId = addressData.user_id;
    if (!userId) {
      const { auth } = await import('../lib/firebaseClient');
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return { success: false, error: 'User not authenticated' };
      }
      userId = currentUser.uid;
    }

    const addressId = await addDocument(COLLECTIONS.ADDRESSES, {
      user_id: userId,
      ...addressData,
      is_default: addressData.is_default || false,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });

    // If this is set as default, unset other defaults
    if (addressData.is_default) {
      await setDefaultAddress(userId, addressId);
    }

    return { success: true, data: { id: addressId } };
  } catch (error) {
    console.error('Error creating address:', error);
    return { success: false, error: error.message };
  }
};

// Alias for backward compatibility
export const addAddress = createAddress;

/**
 * Update an address
 * @param {string} addressId - Address ID
 * @param {Object} addressData - Updated address data
 * @returns {Promise<Object>} Response
 */
export const updateAddress = async (addressId, addressData) => {
  try {
    await updateDocument(COLLECTIONS.ADDRESSES, addressId, {
      ...addressData,
      updated_at: serverTimestamp(),
    });

    // If this is set as default, unset other defaults
    if (addressData.is_default) {
      const addressResponse = await getAddressById(addressId);
      const address = addressResponse.success ? addressResponse.data : null;
      if (address) {
        await setDefaultAddress(address.user_id, addressId);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating address:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete an address
 * @param {string} addressId - Address ID
 * @returns {Promise<Object>} Response
 */
export const deleteAddress = async (addressId) => {
  try {
    await deleteDocument(COLLECTIONS.ADDRESSES, addressId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting address:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Set an address as default (and unset others)
 * @param {string} userId - User ID (optional, will use current user)
 * @param {string} addressId - Address ID to set as default
 * @returns {Promise<Object>} Response
 */
export const setDefaultAddress = async (userId, addressId) => {
  try {
    // If userId is actually addressId (single param call)
    if (!addressId && userId) {
      addressId = userId;
      const { auth } = await import('../lib/firebaseClient');
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return { success: false, error: 'User not authenticated' };
      }
      userId = currentUser.uid;
    }

    // Get all user addresses
    const response = await getUserAddresses(userId);
    if (!response.success) {
      return response;
    }

    const addresses = response.data;

    // Update all addresses
    const updates = addresses.map((addr) =>
      updateDocument(COLLECTIONS.ADDRESSES, addr.id, {
        is_default: addr.id === addressId,
        updated_at: serverTimestamp(),
      })
    );

    await Promise.all(updates);
    return { success: true };
  } catch (error) {
    console.error('Error setting default address:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get default address for a user
 * @param {string} userId - User ID (optional, will use current user)
 * @returns {Promise<Object>} Response with default address
 */
export const getDefaultAddress = async (userId = null) => {
  try {
    // If no userId provided, get from auth
    if (!userId) {
      const { auth } = await import('../lib/firebaseClient');
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return { success: false, error: 'User not authenticated', data: null };
      }
      userId = currentUser.uid;
    }

    const addresses = await getDocuments(COLLECTIONS.ADDRESSES, {
      where: [
        ['user_id', '==', userId],
        ['is_default', '==', true],
      ],
      limit: 1,
    });

    return { success: true, data: addresses[0] || null };
  } catch (error) {
    console.error('Error fetching default address:', error);
    return { success: false, error: error.message, data: null };
  }
};

export default {
  getUserAddresses,
  getAddressById,
  createAddress,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getDefaultAddress,
};
