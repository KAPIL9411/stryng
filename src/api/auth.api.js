/**
 * Authentication API using Firebase Auth
 * @module api/auth
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendEmailVerification,
  updateProfile,
} from 'firebase/auth';
import { auth, handleAuthError } from '../lib/firebaseClient';
import { getDocument, setDocument, updateDocument, COLLECTIONS } from '../lib/firestoreHelpers';

/**
 * Sign in with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object>} User object
 */
export const signIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Get user profile from database
    const profile = await getDocument(COLLECTIONS.PROFILES, user.uid);

    return {
      user: {
        id: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        displayName: user.displayName,
        photoURL: user.photoURL,
        ...profile,
      },
      error: null,
    };
  } catch (error) {
    const message = await handleAuthError(error);
    return { user: null, error: message };
  }
};

/**
 * Sign up with email and password
 * @param {string} email
 * @param {string} password
 * @param {string} fullName
 * @returns {Promise<Object>} User object
 */
export const signUp = async (email, password, fullName) => {
  try {
    // Create Firebase user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update display name
    await updateProfile(user, { displayName: fullName });

    // Try to send verification email (non-blocking)
    try {
      await sendEmailVerification(user);
      console.log('✅ Verification email sent to:', email);
    } catch (emailError) {
      console.warn('⚠️ Could not send verification email:', emailError.message);
      // Don't fail signup if email sending fails
    }

    // Create profile in database
    await setDocument(COLLECTIONS.PROFILES, user.uid, {
      email,
      full_name: fullName,
    });

    return {
      user: {
        id: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        displayName: fullName,
        full_name: fullName,
      },
      error: null,
    };
  } catch (error) {
    const message = await handleAuthError(error);
    return { user: null, error: message };
  }
};

/**
 * Sign out
 * @returns {Promise<Object>}
 */
export const logout = async () => {
  try {
    await signOut(auth);
    return { error: null };
  } catch (error) {
    const message = await handleAuthError(error);
    return { error: message };
  }
};

/**
 * Send password reset email
 * @param {string} email
 * @returns {Promise<Object>}
 */
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email, {
      url: `${window.location.origin}/login`,
      handleCodeInApp: false,
    });
    return { error: null };
  } catch (error) {
    const message = await handleAuthError(error);
    return { error: message };
  }
};

/**
 * Update user password
 * @param {string} newPassword
 * @returns {Promise<Object>}
 */
export const updateUserPassword = async (newPassword) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user logged in');
    }

    await updatePassword(user, newPassword);
    return { error: null };
  } catch (error) {
    const message = await handleAuthError(error);
    return { error: message };
  }
};

/**
 * Sign in with Google
 * @returns {Promise<Object>} User object
 */
export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;

    // Check if profile exists, create if not
    const profile = await getDocument(COLLECTIONS.PROFILES, user.uid);

    if (!profile) {
      // Create profile
      await setDocument(COLLECTIONS.PROFILES, user.uid, {
        email: user.email,
        full_name: user.displayName || '',
      });
    }

    return {
      user: {
        id: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        displayName: user.displayName,
        photoURL: user.photoURL,
        full_name: user.displayName || '',
      },
      error: null,
    };
  } catch (error) {
    const message = await handleAuthError(error);
    return { user: null, error: message };
  }
};

/**
 * Resend verification email
 * @returns {Promise<Object>}
 */
export const resendVerificationEmail = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user logged in');
    }

    await sendEmailVerification(user);
    return { error: null };
  } catch (error) {
    const message = await handleAuthError(error);
    return { error: message };
  }
};

/**
 * Get current user
 * @returns {Promise<Object>} User object or null
 */
export const getCurrentUser = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { user: null, error: null };
    }

    // Get profile from database
    const profile = await getDocument(COLLECTIONS.PROFILES, user.uid);

    return {
      user: {
        id: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        displayName: user.displayName,
        photoURL: user.photoURL,
        ...profile,
      },
      error: null,
    };
  } catch (error) {
    const message = await handleAuthError(error);
    return { user: null, error: message };
  }
};

/**
 * Update user profile
 * @param {Object} profileData
 * @returns {Promise<Object>}
 */
export const updateUserProfile = async (profileData) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user logged in');
    }

    // Update Firebase profile if display name changed
    if (profileData.full_name && profileData.full_name !== user.displayName) {
      await updateProfile(user, { displayName: profileData.full_name });
    }

    // Prepare update data
    const updates = {
      email: user.email, // Always include email
    };

    if (profileData.full_name) {
      updates.full_name = profileData.full_name;
    }
    if (profileData.phone) {
      updates.phone = profileData.phone;
    }

    if (Object.keys(updates).length > 0) {
      // Check if profile exists
      const existingProfile = await getDocument(COLLECTIONS.PROFILES, user.uid);
      
      if (existingProfile) {
        // Update existing profile
        await updateDocument(COLLECTIONS.PROFILES, user.uid, updates);
      } else {
        // Create new profile
        await setDocument(COLLECTIONS.PROFILES, user.uid, updates);
      }
    }

    return { error: null };
  } catch (error) {
    const message = await handleAuthError(error);
    return { error: message };
  }
};

/**
 * Check if user is admin
 * @param {string} email
 * @returns {boolean}
 */
export const isAdmin = (email) => {
  const adminEmails = import.meta.env.VITE_ADMIN_EMAILS?.split(',') || [];
  return adminEmails.includes(email);
};
