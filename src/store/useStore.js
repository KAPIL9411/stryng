import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient';
import { validatePassword } from '../components/auth/PasswordStrength';
import {
  trackAddToCart,
  trackRemoveFromCart,
  trackAddToWishlist,
  trackSignUp,
  trackLogin,
} from '../lib/analytics';
import { validateCartStock, getStockStatus } from '../lib/inventory';
import {
  getAuthErrorMessage,
  getDatabaseErrorMessage,
} from '../utils/apiHelpers';

/* 
  Global State Store 
  Includes: Cart, Wishlist, User (Supabase Auth), UI, Products, Orders
*/

const useStore = create(
  persist(
    (set, get) => ({
      /* ---- Cart State & Actions ---- */
      cart: [],

      addToCart: (product, size, color, quantity = 1) => {
        const { cart, products, user } = get();

        // Check if user is logged in
        if (!user) {
          // Save pending cart item to localStorage
          const pendingCartItem = {
            product,
            size,
            color,
            quantity,
            timestamp: Date.now()
          };
          localStorage.setItem('pendingCartItem', JSON.stringify(pendingCartItem));
          
          // Trigger a custom event that the app can listen to for navigation
          window.dispatchEvent(new CustomEvent('requireAuth', { 
            detail: { redirectTo: '/login' } 
          }));
          
          // Fallback: if event doesn't work, use window.location.replace after a delay
          setTimeout(() => {
            const stillPending = localStorage.getItem('pendingCartItem');
            if (stillPending && !window.location.pathname.includes('/login')) {
              window.location.replace('/login');
            }
          }, 100);
          
          return;
        }

        // Check stock availability (only if stock is tracked)
        const currentProduct = products.find((p) => p.id === product.id);
        if (currentProduct && currentProduct.stock !== undefined) {
          const stockStatus = getStockStatus(
            currentProduct.stock,
            currentProduct.lowStockThreshold
          );
          if (!stockStatus.available) {
            return;
          }

          // Check if requested quantity exceeds available stock
          const existingItem = cart.find(
            (item) =>
              item.id === product.id &&
              item.selectedSize === size &&
              item.selectedColor.name === color.name
          );
          const currentCartQty = existingItem ? existingItem.quantity : 0;
          const totalQty = currentCartQty + quantity;

          if (totalQty > currentProduct.stock) {
            return;
          }
        }

        const existingItemIndex = cart.findIndex(
          (item) =>
            item.id === product.id &&
            item.selectedSize === size &&
            item.selectedColor.name === color.name
        );

        if (existingItemIndex > -1) {
          const newCart = [...cart];
          newCart[existingItemIndex].quantity += quantity;
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
                cartId: `${product.id}-${size}-${color.name}-${Date.now()}`,
              },
            ],
          });
        }

        // Track analytics
        trackAddToCart(product, quantity);
      },

      // Process pending cart item after login
      processPendingCartItem: () => {
        const pendingItem = localStorage.getItem('pendingCartItem');
        if (pendingItem) {
          try {
            const { product, size, color, quantity } = JSON.parse(pendingItem);
            // Remove from localStorage
            localStorage.removeItem('pendingCartItem');
            // Add to cart
            get().addToCart(product, size, color, quantity);
          } catch (error) {
            console.error('Error processing pending cart item:', error);
            localStorage.removeItem('pendingCartItem');
          }
        }
      },

      removeFromCart: (cartId) => {
        const { cart } = get();
        const item = cart.find((item) => item.cartId === cartId);

        set((state) => ({
          cart: state.cart.filter((item) => item.cartId !== cartId),
        }));

        // Track analytics
        if (item) {
          trackRemoveFromCart(item, item.quantity);
        }
      },

      updateQuantity: (cartId, delta) => {
        const { cart } = get();
        const newCart = cart.map((item) => {
          if (item.cartId === cartId) {
            const newQty = Math.max(1, item.quantity + delta);
            return { ...item, quantity: newQty };
          }
          return item;
        });
        set({ cart: newCart });
      },

      clearCart: () => set({ cart: [] }),

      getCartTotal: () => {
        const { cart } = get();
        return cart.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        );
      },

      getCartCount: () => {
        const { cart } = get();
        return cart.reduce((count, item) => count + item.quantity, 0);
      },

      // Validate cart stock before checkout
      validateCart: () => {
        const { cart, products } = get();
        return validateCartStock(cart, products);
      },

      /* ---- Coupon State & Actions ---- */
      appliedCoupon: null,
      couponDiscount: 0,

      applyCoupon: (coupon, discount) => set({ 
        appliedCoupon: coupon, 
        couponDiscount: discount 
      }),

      removeCoupon: () => set({ 
        appliedCoupon: null, 
        couponDiscount: 0 
      }),

      clearCoupon: () => set({ 
        appliedCoupon: null, 
        couponDiscount: 0 
      }),

      /* ---- Wishlist State & Actions ---- */
      wishlist: [],

      toggleWishlist: (product) => {
        const { wishlist, user } = get();

        // Check if user is logged in
        if (!user) {
          return;
        }

        const isInWishlist = wishlist.some((item) => item.id === product.id);

        if (isInWishlist) {
          set({ wishlist: wishlist.filter((item) => item.id !== product.id) });
        } else {
          set({ wishlist: [...wishlist, product] });

          // Track analytics
          trackAddToWishlist(product);
        }
      },

      isInWishlist: (productId) => {
        return get().wishlist.some((item) => item.id === productId);
      },

      /* ---- Products State & Actions (Supabase) ---- */
      products: [], // Loaded from DB
      isLoadingProducts: false,
      productsLoaded: false,
      productsPagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        hasNext: false,
      },
      productsCache: {}, // Cache products by page/filters

      // Legacy method for backward compatibility (Home page, etc.)
      fetchProducts: async () => {
        // Prevent duplicate fetches
        const { productsLoaded, isLoadingProducts } = get();
        if (productsLoaded || isLoadingProducts) return;

        set({ isLoadingProducts: true });
        console.log('🔄 Fetching products from Supabase...');
        try {
          const { data, error } = await supabase.from('products').select('*');

          if (error) {
            console.error('❌ Supabase Fetch Error:', error);
            throw error;
          }

          console.log('✅ Products fetched:', data?.length);

          // Map snake_case from DB to camelCase for frontend
          const mappedProducts = (data || []).map((p) => ({
            ...p,
            originalPrice: p.original_price,
            reviewCount: p.reviews_count || 0,
            isNew: p.is_new || false,
            isTrending: p.is_trending || false,
          }));
          set({
            products: mappedProducts,
            isLoadingProducts: false,
            productsLoaded: true,
          });
        } catch (error) {
          console.error('⚠️ Error fetching products:', error.message);
          set({ products: [], isLoadingProducts: false, productsLoaded: true });
        }
      },

      // New paginated fetch method
      fetchProductsPaginated: async (page = 1, limit = 24, filters = {}) => {
        set({ isLoadingProducts: true });

        // Generate cache key
        const cacheKey = `page-${page}-${JSON.stringify(filters)}`;
        const { productsCache } = get();

        // Return cached data if available
        if (productsCache[cacheKey]) {
          console.log('✅ Using cached products for:', cacheKey);
          set({
            products: productsCache[cacheKey].products,
            productsPagination: productsCache[cacheKey].pagination,
            isLoadingProducts: false,
          });
          return productsCache[cacheKey];
        }

        try {
          const start = (page - 1) * limit;
          const end = start + limit - 1;

          // Build query with only needed fields for listing
          let query = supabase
            .from('products')
            .select(
              'id, name, slug, price, original_price, discount, images, brand, category, colors, is_new, is_trending, rating, reviews_count',
              { count: 'exact' }
            )
            .range(start, end);

          // Apply server-side filters
          if (filters.category && filters.category.length > 0) {
            query = query.in(
              'category',
              Array.isArray(filters.category)
                ? filters.category
                : [filters.category]
            );
          }
          if (filters.minPrice) {
            query = query.gte('price', filters.minPrice);
          }
          if (filters.maxPrice) {
            query = query.lte('price', filters.maxPrice);
          }
          if (filters.search) {
            // Use ilike for case-insensitive search
            query = query.or(
              `name.ilike.%${filters.search}%,brand.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
            );
          }
          if (filters.sizes && filters.sizes.length > 0) {
            // Filter by sizes (array contains)
            query = query.contains('sizes', filters.sizes);
          }

          // Apply sorting
          switch (filters.sort) {
            case 'price-low':
              query = query.order('price', { ascending: true });
              break;
            case 'price-high':
              query = query.order('price', { ascending: false });
              break;
            case 'newest':
              query = query.order('created_at', { ascending: false });
              break;
            case 'popularity':
              query = query.order('reviews_count', { ascending: false });
              break;
            default:
              query = query.order('id', { ascending: true });
          }

          const { data, error, count } = await query;

          if (error) {
            console.error('❌ Supabase Fetch Error:', error);
            throw error;
          }

          console.log(`✅ Products fetched: ${data?.length} (Page ${page})`);

          // Map snake_case to camelCase
          const mappedProducts = (data || []).map((p) => ({
            ...p,
            originalPrice: p.original_price,
            reviewCount: p.reviews_count || 0,
            isNew: p.is_new || false,
            isTrending: p.is_trending || false,
          }));

          const pagination = {
            currentPage: page,
            totalItems: count || 0,
            totalPages: Math.ceil((count || 0) / limit),
            hasNext: end < (count || 0) - 1,
          };

          // Cache the result
          const result = { products: mappedProducts, pagination };
          set({
            products: mappedProducts,
            productsPagination: pagination,
            productsCache: { ...productsCache, [cacheKey]: result },
            isLoadingProducts: false,
          });

          return result;
        } catch (error) {
          console.error('⚠️ Error fetching products:', error.message);
          set({
            products: [],
            productsPagination: {
              currentPage: 1,
              totalPages: 1,
              totalItems: 0,
              hasNext: false,
            },
            isLoadingProducts: false,
          });
          return {
            products: [],
            pagination: {
              currentPage: 1,
              totalPages: 1,
              totalItems: 0,
              hasNext: false,
            },
          };
        }
      },

      // Clear products cache (useful when products are updated)
      clearProductsCache: () => set({ productsCache: {} }),

      /* ---- User State & Actions (Supabase Auth) ---- */
      user: null,
      isLoadingAuth: true,
      isAuthLoading: false,
      authError: null,

      clearAuthError: () => set({ authError: null }),

      initializeAuth: async () => {
        set({ isLoadingAuth: true });

        // Get session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();
          set({
            user: { ...session.user, ...(profile || {}) },
            isLoadingAuth: false,
          });
        } else {
          set({ user: null, isLoadingAuth: false });
        }

        // Listen for changes
        supabase.auth.onAuthStateChange(async (_event, session) => {
          if (session?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();
            set({ user: { ...session.user, ...(profile || {}) } });
          } else {
            set({ user: null });
          }
        });
      },

      login: async (email, password) => {
        set({ isAuthLoading: true, authError: null });
        try {
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) {
            const friendlyMsg = getAuthErrorMessage(error);
            set({ isAuthLoading: false, authError: friendlyMsg });
            return {
              success: false,
              error: friendlyMsg,
              needsVerification: error.message.includes('Email not confirmed'),
            };
          }
          set({ isAuthLoading: false, authError: null });

          // Track analytics
          trackLogin('email');

          // Process any pending cart item
          setTimeout(() => {
            get().processPendingCartItem();
          }, 500);

          return { success: true };
        } catch (err) {
          const friendlyMsg = getAuthErrorMessage(err);
          set({ isAuthLoading: false, authError: friendlyMsg });
          return { success: false, error: friendlyMsg };
        }
      },

      register: async (email, password, fullName) => {
        // Client-side password validation
        const { isValid } = validatePassword(password);
        if (!isValid) {
          const msg = 'Password does not meet the requirements.';
          set({ authError: msg });
          return { success: false, error: msg };
        }

        set({ isAuthLoading: true, authError: null });
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
          });

          if (error) {
            const friendlyMsg = getAuthErrorMessage(error);
            set({ isAuthLoading: false, authError: friendlyMsg });
            return { success: false, error: friendlyMsg };
          }

          if (data.user) {
            // Create Profile
            const { error: profileError } = await supabase
              .from('profiles')
              .insert([{ id: data.user.id, email, full_name: fullName }]);

            if (profileError) {
              console.error('Profile creation failed:', profileError);
            }

            // Check if email confirmation is required
            const needsVerification =
              data.user.identities?.length === 0 || !data.session;
            set({ isAuthLoading: false, authError: null });

            // Track analytics
            trackSignUp('email');

            return { success: true, needsVerification };
          }
          set({ isAuthLoading: false });
          return {
            success: false,
            error: 'Registration failed. Please try again.',
          };
        } catch (err) {
          const friendlyMsg = getAuthErrorMessage(err);
          set({ isAuthLoading: false, authError: friendlyMsg });
          return { success: false, error: friendlyMsg };
        }
      },

      resetPassword: async (email) => {
        set({ isAuthLoading: true, authError: null });
        try {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
          });
          if (error) {
            const friendlyMsg = getAuthErrorMessage(error);
            set({ isAuthLoading: false, authError: friendlyMsg });
            return { success: false, error: friendlyMsg };
          }
          set({ isAuthLoading: false });
          return { success: true };
        } catch (err) {
          const friendlyMsg = getAuthErrorMessage(err);
          set({ isAuthLoading: false, authError: friendlyMsg });
          return { success: false, error: friendlyMsg };
        }
      },

      updatePassword: async (newPassword) => {
        const { isValid } = validatePassword(newPassword);
        if (!isValid) {
          const msg = 'Password does not meet the requirements.';
          set({ authError: msg });
          return { success: false, error: msg };
        }

        set({ isAuthLoading: true, authError: null });
        try {
          const { error } = await supabase.auth.updateUser({
            password: newPassword,
          });
          if (error) {
            const friendlyMsg = getAuthErrorMessage(error);
            set({ isAuthLoading: false, authError: friendlyMsg });
            return { success: false, error: friendlyMsg };
          }
          set({ isAuthLoading: false });
          return { success: true };
        } catch (err) {
          const friendlyMsg = getAuthErrorMessage(err);
          set({ isAuthLoading: false, authError: friendlyMsg });
          return { success: false, error: friendlyMsg };
        }
      },

      loginWithGoogle: async () => {
        set({ isAuthLoading: true, authError: null });
        try {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: `${window.location.origin}/account`,
            },
          });
          if (error) {
            const friendlyMsg = getAuthErrorMessage(error);
            set({ isAuthLoading: false, authError: friendlyMsg });
          }
          // Note: on success, browser redirects to Google — no need to set isAuthLoading false
        } catch (err) {
          const friendlyMsg = getAuthErrorMessage(err);
          set({ isAuthLoading: false, authError: friendlyMsg });
        }
      },

      resendVerificationEmail: async (email) => {
        set({ isAuthLoading: true, authError: null });
        try {
          const { error } = await supabase.auth.resend({
            type: 'signup',
            email,
          });
          if (error) {
            const friendlyMsg = getAuthErrorMessage(error);
            set({ isAuthLoading: false, authError: friendlyMsg });
            return { success: false, error: friendlyMsg };
          }
          set({ isAuthLoading: false });
          return { success: true };
        } catch (err) {
          const friendlyMsg = getAuthErrorMessage(err);
          set({ isAuthLoading: false, authError: friendlyMsg });
          return { success: false, error: friendlyMsg };
        }
      },

      logout: async () => {
        try {
          // Clear all user-related state immediately for instant UI update
          set({
            user: null,
            cart: [],
            wishlist: [],
          });

          // Clear React Query cache
          if (typeof window !== 'undefined' && window.queryClient) {
            window.queryClient.clear();
          }

          // Sign out from Supabase
          const { error } = await supabase.auth.signOut();

          if (error) {
            console.error('Logout error:', error);
            // Don't throw - we've already cleared local state
          }

          return { success: true };
        } catch (error) {
          console.error('Logout failed:', error);
          // Still return success since we cleared local state
          return { success: true };
        }
      },

      // Check if current user is admin
      isAdmin: () => {
        const { user } = get();
        return user?.role === 'admin';
      },

      /* ---- Admin Product Actions ---- */
      createProduct: async (productData) => {
        try {
          const { createProduct: apiCreateProduct } = await import('../api/products.api');
          const data = await apiCreateProduct(productData);

          if (!data) {
            throw new Error('Product creation failed');
          }

          return { data, error: null };
        } catch (error) {
          console.error('❌ Error creating product:', error);
          
          // Provide user-friendly error messages
          if (error.code === '23505') {
            if (error.message.includes('slug')) {
              error.message = 'A product with this slug already exists. Please use a different name.';
            } else if (error.message.includes('sku')) {
              error.message = 'A product with this SKU already exists. Please use a different SKU.';
            }
          }
          
          return { data: null, error };
        }
      },

      updateProduct: async (id, productData) => {
        try {
          const { updateProduct: apiUpdateProduct } = await import('../api/products.api');
          const data = await apiUpdateProduct(id, productData);

          if (!data) {
            throw new Error('Product not found or update failed');
          }

          console.log('✅ Product updated successfully:', data);
          return { data, error: null };
        } catch (error) {
          console.error('❌ Error updating product:', error);
          return { data: null, error };
        }
      },

      deleteProduct: async (id) => {
        try {
          const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);

          if (error) throw error;

          // Note: React Query cache invalidation handled in component
          return { error: null };
        } catch (error) {
          console.error('Error deleting product:', error);
          return { error };
        }
      },

      // Helper: Get product count for a specific category
      getCategoryCount: (categorySlug) => {
        const { products } = get();
        return products.filter((p) => p.category === categorySlug).length;
      },

      /* ---- Banner Actions ---- */
      banners: [],
      bannersLoaded: false,
      isFetchingBanners: false,
      fetchBanners: async () => {
        // Prevent duplicate fetches
        const { bannersLoaded, isFetchingBanners } = get();
        if (bannersLoaded || isFetchingBanners) return;

        set({ isFetchingBanners: true });
        try {
          const { data, error } = await supabase
            .from('banners')
            .select('*')
            .order('sort_order', { ascending: true });

          if (error) throw error;
          set({
            banners: data || [],
            bannersLoaded: true,
            isFetchingBanners: false,
          });
        } catch (error) {
          console.error('Error fetching banners:', error);
          set({ banners: [], bannersLoaded: true, isFetchingBanners: false });
        }
      },

      createBanner: async (bannerData) => {
        try {
          const { error } = await supabase
            .from('banners')
            .insert([bannerData])
            .select();

          if (error) throw error;
          await get().fetchBanners();
          return { error: null };
        } catch (error) {
          console.error('Error creating banner:', error);
          return { error };
        }
      },

      updateBanner: async (id, bannerData) => {
        try {
          const { error } = await supabase
            .from('banners')
            .update(bannerData)
            .eq('id', id);

          if (error) throw error;
          await get().fetchBanners();
          return { error: null };
        } catch (error) {
          console.error('Error updating banner:', error);
          return { error };
        }
      },

      deleteBanner: async (id) => {
        try {
          const { error } = await supabase
            .from('banners')
            .delete()
            .eq('id', id);

          if (error) throw error;
          await get().fetchBanners();
          return { error: null };
        } catch (error) {
          console.error('Error deleting banner:', error);
          return { error };
        }
      },

      /* ---- Order Actions ---- */
      createOrder: async (orderData) => {
        const { user } = get();
        if (!user) {
          return null;
        }

        // Generate secure UUID for order ID
        const orderId = orderData.id || crypto.randomUUID();

        // Determine initial payment status
        let initialStatus = 'pending';
        let initialPaymentStatus = 'pending';

        if (orderData.paymentMethod === 'cod') {
          initialStatus = 'placed';
          initialPaymentStatus = 'pending';
        } else if (orderData.paymentMethod === 'upi') {
          initialStatus = 'placed';
          initialPaymentStatus = 'verification_pending';
        }

        // Sanitize address data
        const sanitizedAddress = {
          name: String(orderData.address.name || '')
            .trim()
            .slice(0, 100),
          street: String(orderData.address.street || '')
            .trim()
            .slice(0, 200),
          city: String(orderData.address.city || '')
            .trim()
            .slice(0, 100),
          state: String(orderData.address.state || '')
            .trim()
            .slice(0, 100),
          pin: String(orderData.address.pin || '')
            .trim()
            .slice(0, 10),
          phone: String(orderData.address.phone || '')
            .trim()
            .slice(0, 15),
        };

        try {
          const { data, error } = await supabase
            .from('orders')
            .insert([
              {
                id: orderId,
                user_id: user.id,
                total: orderData.total,
                address: sanitizedAddress,
                payment_method: orderData.paymentMethod,
                transaction_id: orderData.transactionId
                  ? String(orderData.transactionId).trim().slice(0, 100)
                  : null,
                payment_status: initialPaymentStatus,
                status: initialStatus,
                timeline: orderData.timeline,
              },
            ])
            .select();

          if (error) {
            console.error('Order creation failed:', error);
            return null;
          }

          // Insert items with error handling
          if (orderData.items && orderData.items.length > 0) {
            const itemsToInsert = orderData.items.map((item) => ({
              order_id: orderId,
              product_id: item.id,
              quantity: item.quantity,
              size: item.selectedSize,
              color: item.selectedColor,
              price: item.price,
            }));

            const { error: itemsError } = await supabase
              .from('order_items')
              .insert(itemsToInsert);

            if (itemsError) {
              console.error('Error inserting order items:', itemsError);
              // Rollback order if items fail
              await supabase.from('orders').delete().eq('id', orderId);
              return null;
            }
          }

          return data[0];
        } catch (err) {
          console.error('Unexpected error creating order:', err);
          return null;
        }
      },

      fetchUserOrders: async () => {
        const { user } = get();
        if (!user) return [];

        try {
          const { data, error } = await supabase
            .from('orders')
            .select('*, order_items(*, product:products(*))')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (error) {
            console.error('Fetch orders failed:', error);
            return [];
          }
          return data || [];
        } catch (err) {
          console.error('Unexpected error fetching orders:', err);
          return [];
        }
      },

      /* ---- UI State & Actions ---- */
      isMobileMenuOpen: false,
      toggleMobileMenu: () =>
        set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
      closeMobileMenu: () => set({ isMobileMenuOpen: false }),

      // Toast notifications
      toast: null,
      showToast: (message, type = 'success') => {
        set({ toast: { message, type } });
        // Auto-hide after 3 seconds
        setTimeout(() => {
          set({ toast: null });
        }, 3000);
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
        // Don't persist user/products heavily, depend on auth listener/bootstrap
      }),
    }
  )
);

export default useStore;
