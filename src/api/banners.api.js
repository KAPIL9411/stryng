/**
 * Banners API - Firebase Firestore
 * Simple, no caching - always fresh data
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
 * Fetch active banners for homepage
 */
export const fetchActiveBanners = async () => {
  try {
    console.log('🔄 Fetching active banners from Firebase...');
    
    const banners = await getDocuments(COLLECTIONS.BANNERS, {
      where: [['active', '==', true]],
      orderBy: [['sort_order', 'asc']],
    });

    console.log('✅ Fetched active banners:', banners.length);
    return banners;
  } catch (error) {
    console.error('❌ Error fetching active banners:', error);
    throw error;
  }
};

/**
 * Fetch all banners (admin only)
 */
export const fetchAllBanners = async () => {
  try {
    console.log('🔄 Fetching all banners from Firebase...');
    
    const banners = await getDocuments(COLLECTIONS.BANNERS, {
      orderBy: [['sort_order', 'asc']],
    });

    console.log('✅ Fetched all banners:', banners.length);
    return banners;
  } catch (error) {
    console.error('❌ Error fetching all banners:', error);
    throw error;
  }
};

/**
 * Create new banner (admin only)
 */
export const createBanner = async (bannerData) => {
  try {
    console.log('🔄 Creating banner...', bannerData);
    
    const bannerId = await addDocument(COLLECTIONS.BANNERS, {
      title: bannerData.title || '',
      description: bannerData.description || '',
      image_url: bannerData.image_url,
      cta_text: bannerData.cta_text || 'Shop Now',
      cta_link: bannerData.cta_link,
      sort_order: bannerData.sort_order || 0,
      active: bannerData.active !== false,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });

    console.log('✅ Banner created:', bannerId);
    return bannerId;
  } catch (error) {
    console.error('❌ Error creating banner:', error);
    throw error;
  }
};

/**
 * Update banner (admin only)
 */
export const updateBanner = async (bannerId, bannerData) => {
  try {
    console.log('🔄 Updating banner:', bannerId);
    
    await updateDocument(COLLECTIONS.BANNERS, bannerId, {
      ...bannerData,
      updated_at: serverTimestamp(),
    });

    console.log('✅ Banner updated:', bannerId);
  } catch (error) {
    console.error('❌ Error updating banner:', error);
    throw error;
  }
};

/**
 * Delete banner (admin only)
 */
export const deleteBanner = async (bannerId) => {
  try {
    console.log('🔄 Deleting banner:', bannerId);
    
    await deleteDocument(COLLECTIONS.BANNERS, bannerId);

    console.log('✅ Banner deleted:', bannerId);
  } catch (error) {
    console.error('❌ Error deleting banner:', error);
    throw error;
  }
};
