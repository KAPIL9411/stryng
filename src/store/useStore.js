/**
 * Global State Store - Firebase Version
 * Optimized for performance with Firebase Firestore
 * @module store/useStore
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { auth } from '../lib/firebaseClient';
import { onAuthStateChanged } from 'firebase/auth';

// Import Firebase APIs
import * as authAPI from '../api/auth.api';
import * as productsAPI from '../api/products.api';
import * as ordersAPI from '../api/orders.api';
import * as bannersAPI from '../api/banners.api';
import * as couponsAPI from '../api/coupons.api';
import * as addressesAPI from '../api/addresses.api';
import * as pincodesAPI from '../api/pincodes.api';

// Import utilities
import { validatePassword } from '../components/auth/PasswordStrength';
import {
  trackAddToCart,
  trackRemoveFromCart,
  trackAddToWishlist,
  trackSignUp,
  trackLogin,
} from '../lib/analytics';

const useStore = create(
  persist(
    (set, get) => ({
      // ============================================================================
      // CART STATE & ACTIONS
      // ============================================================================
      cart: [],

      addToCart: (product, size, color, quantity = 1) => {
        const { cart, user } = get();

        // Check if user is logged in
        if (!user) {
          localStorage.setItem('pendingCartItem', JSON.stringify({
            product, size, color, quantity, timestamp: Date.now()
          }));
          window.dispatchEvent(new CustomEvent('requireAuth', { 
            detail: { redirectTo: '/login' } 
          }));
          return;
        }

        // Check stock
        if (product.stock !== undefined && product.stock <= 0) {
          get().showToast('Product is out of stock', 'error');
          return;
        }

        const existingItemIndex = cart.findIndex(
          (item) =>
            item.id === product.id &&
            item.selectedSize === size &&
            item.selectedColor?.name === color?.name
        );

        if (existingItemIndex > -1) {
          const newCart = [...cart];
          const newQty = newCart[existingItemIndex].quantity + quantity;
          
          if (product.stock && newQty > product.stock) {
            get().showToast(`Only ${product.stock} items available`, 'error');
            return;
          }
          
          newCart[existingItemIndex].quantity = newQty;
          set({ cart: newCart });
        } else {
          set({
            cart: [
              ...cart,
              {
                ...product,
                selectedSize: size,
                selectedColor: color,
                quantity,
              },
            ],
          });
        }

        trackAddToCart(product, quantity);
        get().showToast('Added to cart', 'success');
      },

      removeFromCart: (productId, size, colorName) => {
        const { cart } = get();
        const item = cart.find(
          (item) =>
            item.id === productId &&
            item.selectedSize === size &&
            item.selectedColor?.name === colorName
        );

        set({
          cart: cart.filter(
            (item) =>
              !(
                item.id === productId &&
                item.selectedSize === size &&
                item.selectedColor?.name === colorName
              )
          ),
        });

        if (item) {
          trackRemoveFromCart(item);
        }
        get().showToast('Removed from cart', 'success');
      },

      updateCartItemQuantity: (productId, size, colorName, quantity) => {
        const { cart } = get();
        const newCart = cart.map((item) =>
          item.id === productId &&
          item.selectedSize === size &&
          item.selectedColor?.name === colorName
            ? { ...item, quantity: Math.max(1, quantity) }
            : item
        );
        set({ cart: newCart });
      },

      clearCart: () => set({ cart: [] }),

      getCartTotal: () => {
        const { cart } = get();
        return cart.reduce((total, item) => total + item.price * item.quantity, 0);
      },

      getCartCount: () => {
        const { cart } = get();
        return cart.reduce((count, item) => count + item.quantity, 0);
      },

      // ============================================================================
      // WISHLIST STATE & ACTIONS
      // ============================================================================
      wishlist: [],

      addToWishlist: (product) => {
        const { wishlist, user } = get();

        if (!user) {
          window.dispatchEvent(new CustomEvent('requireAuth', { 
            detail: { redirectTo: '/login' } 
          }));
          return;
        }

        if (wishlist.find((item) => item.id === product.id)) {
          get().showToast('Already in wishlist', 'info');
          return;
        }

        set({ wishlist: [...wishlist, product] });
        trackAddToWishlist(product);
        get().showToast('Added to wishlist', 'success');
      },

      removeFromWishlist: (productId) => {
        const { wishlist } = get();
        set({ wishlist: wishlist.filter((item) => item.id !== productId) });
        get().showToast('Removed from wishlist', 'success');
      },

      clearWishlist: () => set({ wishlist: [] }),

      isInWishlist: (productId) => {
        const { wishlist } = get();
        return wishlist.some((item) => item.id === productId);
      },

      toggleWishlist: (product) => {
        const { wishlist, user } = get();

        if (!user) {
          window.dispatchEvent(new CustomEvent('requireAuth', { 
            detail: { redirectTo: '/login' } 
          }));
          return;
        }

        const isInWishlist = wishlist.some((item) => item.id === product.id);
        
        if (isInWishlist) {
          set({ wishlist: wishlist.filter((item) => item.id !== product.id) });
          get().showToast('Removed from wishlist', 'success');
        } else {
          set({ wishlist: [...wishlist, product] });
          trackAddToWishlist(product);
          get().showToast('Added to wishlist', 'success');
        }
      },

      // ============================================================================
      // USER STATE & AUTH ACTIONS
      // ============================================================================
      user: null,
      isAuthLoading: true, // Start as true
      authError: null,
      authInitialized: false, // Track if auth is initialized

      initializeAuth: () => {
        return new Promise((resolve) => {
          set({ isAuthLoading: true, authInitialized: false });
          
          // Listen for auth state changes
          const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
              try {
                const { user } = await authAPI.getCurrentUser();
                set({ user, isAuthLoading: false, authInitialized: true });
              } catch (error) {
                console.error('Error getting current user:', error);
                set({ user: null, isAuthLoading: false, authInitialized: true });
              }
            } else {
              set({ user: null, isAuthLoading: false, authInitialized: true });
            }
            
            // Resolve on first auth state change
            if (!get().authInitialized) {
              resolve();
            }
          });
          
          // Store unsubscribe function
          set({ authUnsubscribe: unsubscribe });
        });
      },

      login: async (email, password) => {
        set({ isAuthLoading: true, authError: null });
        const { user, error } = await authAPI.signIn(email, password);
        
        if (error) {
          set({ authError: error, isAuthLoading: false });
          return { error };
        }

        set({ user, isAuthLoading: false, authError: null });
        trackLogin('email');
        return { user };
      },

      signup: async (email, password, fullName) => {
        set({ isAuthLoading: true, authError: null });
        
        // Validate password
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
          const error = passwordValidation.errors[0];
          set({ authError: error, isAuthLoading: false });
          return { error };
        }

        const { user, error } = await authAPI.signUp(email, password, fullName);
        
        if (error) {
          set({ authError: error, isAuthLoading: false });
          return { error };
        }

        set({ user, isAuthLoading: false, authError: null });
        trackSignUp('email');
        return { user };
      },

      loginWithGoogle: async () => {
        set({ isAuthLoading: true, authError: null });
        const { user, error } = await authAPI.signInWithGoogle();
        
        if (error) {
          set({ authError: error, isAuthLoading: false });
          return { error };
        }

        set({ user, isAuthLoading: false, authError: null });
        trackLogin('google');
        return { user };
      },

      logout: async () => {
        set({ isAuthLoading: true });
        await authAPI.logout();
        set({
          user: null,
          cart: [],
          wishlist: [],
          isAuthLoading: false,
          authError: null,
        });
        localStorage.clear();
      },

      resetPassword: async (email) => {
        set({ isAuthLoading: true, authError: null });
        const { error } = await authAPI.resetPassword(email);
        set({ isAuthLoading: false, authError: error });
        return { error };
      },

      updatePassword: async (newPassword) => {
        set({ isAuthLoading: true, authError: null });
        const { error } = await authAPI.updateUserPassword(newPassword);
        set({ isAuthLoading: false, authError: error });
        return { error };
      },

      resendVerificationEmail: async () => {
        set({ isAuthLoading: true, authError: null });
        const { error } = await authAPI.resendVerificationEmail();
        set({ isAuthLoading: false, authError: error });
        return { error };
      },

      clearAuthError: () => set({ authError: null }),

      // Check if user is admin
      isAdmin: () => {
        const { user } = get();
        if (!user || !user.email) return false;
        return authAPI.isAdmin(user.email);
      },

      // Process pending cart item after login
      processPendingCartItem: () => {
        const pendingItem = localStorage.getItem('pendingCartItem');
        if (pendingItem) {
          try {
            const { product, size, color, quantity } = JSON.parse(pendingItem);
            get().addToCart(product, size, color, quantity);
            localStorage.removeItem('pendingCartItem');
          } catch (e) {
            console.error('Error processing pending cart item:', e);
            localStorage.removeItem('pendingCartItem');
          }
        }
      },

      // ============================================================================
      // PRODUCTS STATE & ACTIONS
      // ============================================================================
      products: [],
      isLoadingProducts: false,
      productsError: null,

      fetchProducts: async (options = {}) => {
        set({ isLoadingProducts: true, productsError: null });
        const { products, pagination } = await productsAPI.fetchProducts(options);
        set({ products, isLoadingProducts: false });
        return { products, pagination };
      },

      fetchProductBySlug: async (slug) => {
        const product = await productsAPI.fetchProductBySlug(slug);
        return product;
      },

      searchProducts: async (searchTerm) => {
        set({ isLoadingProducts: true });
        const products = await productsAPI.searchProducts(searchTerm);
        set({ products, isLoadingProducts: false });
        return products;
      },

      // ============================================================================
      // ORDERS STATE & ACTIONS
      // ============================================================================
      orders: [],
      isLoadingOrders: false,

      createOrder: async (orderData) => {
        set({ isLoadingOrders: true });
        try {
          const order = await ordersAPI.createOrder(orderData);
          // Clear cart and coupon after successful order
          set({ 
            isLoadingOrders: false, 
            cart: [], 
            appliedCoupon: null, 
            couponDiscount: 0 
          });
          return { order, error: null };
        } catch (error) {
          set({ isLoadingOrders: false });
          return { order: null, error: error.message };
        }
      },

      fetchUserOrders: async () => {
        const { user } = get();
        if (!user) return [];

        set({ isLoadingOrders: true });
        const orders = await ordersAPI.getOrdersByUserId(user.id);
        set({ orders, isLoadingOrders: false });
        return orders;
      },

      // ============================================================================
      // BANNERS STATE & ACTIONS
      // ============================================================================
      banners: [],
      isLoadingBanners: false,

      fetchBanners: async () => {
        set({ isLoadingBanners: true });
        const banners = await bannersAPI.fetchBanners();
        set({ banners, isLoadingBanners: false });
        return banners;
      },

      // ============================================================================
      // ADMIN ACTIONS
      // ============================================================================
      
      // Products
      createProduct: async (productData) => {
        try {
          const productId = await productsAPI.createProduct(productData);
          return { success: true, productId };
        } catch (error) {
          console.error('Error creating product:', error);
          return { success: false, error: error.message };
        }
      },

      updateProduct: async (productId, productData) => {
        try {
          await productsAPI.updateProduct(productId, productData);
          return { success: true };
        } catch (error) {
          console.error('Error updating product:', error);
          return { success: false, error: error.message };
        }
      },

      deleteProduct: async (productId) => {
        await productsAPI.deleteProduct(productId);
      },

      // Banners
      createBanner: async (bannerData) => {
        return await bannersAPI.createBanner(bannerData);
      },

      updateBanner: async (bannerId, bannerData) => {
        await bannersAPI.updateBanner(bannerId, bannerData);
      },

      deleteBanner: async (bannerId) => {
        await bannersAPI.deleteBanner(bannerId);
      },

      // Orders
      updateOrderStatus: async (orderId, status, additionalData) => {
        await ordersAPI.updateOrderStatus(orderId, status, additionalData);
      },

      // ============================================================================
      // COUPON STATE & ACTIONS
      // ============================================================================
      appliedCoupon: null,
      couponDiscount: 0,

      applyCoupon: (coupon, discountAmount) => {
        set({ 
          appliedCoupon: coupon, 
          couponDiscount: discountAmount 
        });
      },

      removeCoupon: () => {
        set({ 
          appliedCoupon: null, 
          couponDiscount: 0 
        });
      },

      clearCoupon: () => {
        set({ 
          appliedCoupon: null, 
          couponDiscount: 0 
        });
      },

      // ============================================================================
      // UI STATE & ACTIONS
      // ============================================================================
      toast: null,

      showToast: (message, type = 'info') => {
        set({ toast: { message, type, id: Date.now() } });
        setTimeout(() => set({ toast: null }), 3000);
      },

      hideToast: () => set({ toast: null }),
    }),
    {
      name: 'stryng-storage',
      partialize: (state) => ({
        cart: state.cart,
        wishlist: state.wishlist,
        appliedCoupon: state.appliedCoupon,
        couponDiscount: state.couponDiscount,
      }),
    }
  )
);

export default useStore;
