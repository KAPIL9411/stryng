/**
 * Firestore Helper Functions
 * Simplified database operations for Firebase Firestore
 * @module lib/firestoreHelpers
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from './firebaseClient';

// ============================================================================
// COLLECTION NAMES
// ============================================================================
export const COLLECTIONS = {
  PRODUCTS: 'products',
  ORDERS: 'orders',
  ORDER_ITEMS: 'order_items',
  BANNERS: 'banners',
  PROFILES: 'profiles',
  COUPONS: 'coupons',
  COUPON_USAGE: 'coupon_usage',
  SERVICEABLE_PINCODES: 'serviceable_pincodes',
  ADDRESSES: 'addresses',
};

// ============================================================================
// BASIC CRUD OPERATIONS
// ============================================================================

/**
 * Get a single document by ID
 * @param {string} collectionName - Collection name
 * @param {string} docId - Document ID
 * @returns {Promise<Object>} Document data or null
 */
export const getDocument = async (collectionName, docId) => {
  try {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error(`Error getting document from ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Get all documents from a collection
 * @param {string} collectionName - Collection name
 * @param {Object} options - Query options (where, orderBy, limit)
 * @returns {Promise<Array>} Array of documents
 */
export const getDocuments = async (collectionName, options = {}) => {
  try {
    const collectionRef = collection(db, collectionName);
    let q = collectionRef;

    // Apply where clauses
    if (options.where) {
      options.where.forEach(([field, operator, value]) => {
        q = query(q, where(field, operator, value));
      });
    }

    // Apply orderBy
    if (options.orderBy) {
      options.orderBy.forEach(([field, direction = 'asc']) => {
        q = query(q, orderBy(field, direction));
      });
    }

    // Apply limit
    if (options.limit) {
      q = query(q, limit(options.limit));
    }

    // Apply startAfter for pagination
    if (options.startAfter) {
      q = query(q, startAfter(options.startAfter));
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error(`Error getting documents from ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Add a new document with auto-generated ID
 * @param {string} collectionName - Collection name
 * @param {Object} data - Document data
 * @returns {Promise<string>} New document ID
 */
export const addDocument = async (collectionName, data) => {
  try {
    const collectionRef = collection(db, collectionName);
    const docRef = await addDoc(collectionRef, {
      ...data,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error(`Error adding document to ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Set a document with specific ID (create or overwrite)
 * @param {string} collectionName - Collection name
 * @param {string} docId - Document ID
 * @param {Object} data - Document data
 * @returns {Promise<void>}
 */
export const setDocument = async (collectionName, docId, data) => {
  try {
    const docRef = doc(db, collectionName, docId);
    await setDoc(docRef, {
      ...data,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error setting document in ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Update a document
 * @param {string} collectionName - Collection name
 * @param {string} docId - Document ID
 * @param {Object} data - Fields to update
 * @returns {Promise<void>}
 */
export const updateDocument = async (collectionName, docId, data) => {
  try {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, {
      ...data,
      updated_at: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error updating document in ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Delete a document
 * @param {string} collectionName - Collection name
 * @param {string} docId - Document ID
 * @returns {Promise<void>}
 */
export const deleteDocument = async (collectionName, docId) => {
  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Error deleting document from ${collectionName}:`, error);
    throw error;
  }
};

// ============================================================================
// QUERY HELPERS
// ============================================================================

/**
 * Get documents with pagination
 * @param {string} collectionName - Collection name
 * @param {Object} options - Query options
 * @returns {Promise<Object>} { documents, lastDoc, hasMore }
 */
export const getPaginatedDocuments = async (collectionName, options = {}) => {
  const {
    pageSize = 24,
    lastDoc = null,
    where: whereClause = [],
    orderBy: orderByClause = [],
  } = options;

  try {
    const collectionRef = collection(db, collectionName);
    let q = collectionRef;

    // Apply where clauses
    whereClause.forEach(([field, operator, value]) => {
      q = query(q, where(field, operator, value));
    });

    // Apply orderBy
    orderByClause.forEach(([field, direction = 'asc']) => {
      q = query(q, orderBy(field, direction));
    });

    // Apply pagination
    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }
    q = query(q, limit(pageSize + 1)); // Get one extra to check if there's more

    const querySnapshot = await getDocs(q);
    const documents = [];
    let newLastDoc = null;
    let hasMore = false;

    querySnapshot.docs.forEach((doc, index) => {
      if (index < pageSize) {
        documents.push({ id: doc.id, ...doc.data() });
        newLastDoc = doc;
      } else {
        hasMore = true;
      }
    });

    return { documents, lastDoc: newLastDoc, hasMore };
  } catch (error) {
    console.error(`Error getting paginated documents from ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Count documents matching a query
 * @param {string} collectionName - Collection name
 * @param {Array} whereClause - Where conditions
 * @returns {Promise<number>} Document count
 */
export const countDocuments = async (collectionName, whereClause = []) => {
  try {
    const docs = await getDocuments(collectionName, { where: whereClause });
    return docs.length;
  } catch (error) {
    console.error(`Error counting documents in ${collectionName}:`, error);
    throw error;
  }
};

// ============================================================================
// SPECIAL OPERATIONS
// ============================================================================

/**
 * Increment a numeric field
 * @param {string} collectionName - Collection name
 * @param {string} docId - Document ID
 * @param {string} field - Field name
 * @param {number} value - Increment value (default: 1)
 * @returns {Promise<void>}
 */
export const incrementField = async (collectionName, docId, field, value = 1) => {
  try {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, {
      [field]: increment(value),
      updated_at: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error incrementing field in ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Add item to array field
 * @param {string} collectionName - Collection name
 * @param {string} docId - Document ID
 * @param {string} field - Field name
 * @param {any} value - Value to add
 * @returns {Promise<void>}
 */
export const addToArray = async (collectionName, docId, field, value) => {
  try {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, {
      [field]: arrayUnion(value),
      updated_at: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error adding to array in ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Remove item from array field
 * @param {string} collectionName - Collection name
 * @param {string} docId - Document ID
 * @param {string} field - Field name
 * @param {any} value - Value to remove
 * @returns {Promise<void>}
 */
export const removeFromArray = async (collectionName, docId, field, value) => {
  try {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, {
      [field]: arrayRemove(value),
      updated_at: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error removing from array in ${collectionName}:`, error);
    throw error;
  }
};

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Convert Firestore Timestamp to JavaScript Date
 * @param {Timestamp} timestamp - Firestore Timestamp
 * @returns {Date} JavaScript Date
 */
export const timestampToDate = (timestamp) => {
  if (!timestamp) return null;
  if (timestamp.toDate) return timestamp.toDate();
  return new Date(timestamp);
};

/**
 * Convert JavaScript Date to Firestore Timestamp
 * @param {Date} date - JavaScript Date
 * @returns {Timestamp} Firestore Timestamp
 */
export const dateToTimestamp = (date) => {
  if (!date) return null;
  return Timestamp.fromDate(date);
};

/**
 * Get server timestamp
 * @returns {FieldValue} Server timestamp
 */
export const getServerTimestamp = () => serverTimestamp();

/**
 * Generate a unique ID
 * @returns {string} Unique ID
 */
export const generateId = () => {
  return doc(collection(db, '_temp')).id;
};

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Batch write operations (up to 500 operations)
 * @param {Array} operations - Array of {type, collection, id, data}
 * @returns {Promise<void>}
 */
export const batchWrite = async (operations) => {
  try {
    const { writeBatch } = await import('firebase/firestore');
    const batch = writeBatch(db);

    operations.forEach(({ type, collection: collectionName, id, data }) => {
      const docRef = doc(db, collectionName, id);
      
      switch (type) {
        case 'set':
          batch.set(docRef, { ...data, updated_at: serverTimestamp() });
          break;
        case 'update':
          batch.update(docRef, { ...data, updated_at: serverTimestamp() });
          break;
        case 'delete':
          batch.delete(docRef);
          break;
        default:
          throw new Error(`Unknown batch operation type: ${type}`);
      }
    });

    await batch.commit();
  } catch (error) {
    console.error('Error in batch write:', error);
    throw error;
  }
};

export default {
  COLLECTIONS,
  getDocument,
  getDocuments,
  addDocument,
  setDocument,
  updateDocument,
  deleteDocument,
  getPaginatedDocuments,
  countDocuments,
  incrementField,
  addToArray,
  removeFromArray,
  timestampToDate,
  dateToTimestamp,
  getServerTimestamp,
  generateId,
  batchWrite,
};
