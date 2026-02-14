
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient';
import { validatePassword } from '../components/auth/PasswordStrength';
import { trackAddToCart, trackRemoveFromCart, trackAddToWishlist, trackSignUp, trackLogin } from '../lib/analytics';
import { validateCartStock, getStockStatus } from '../lib/inventoryManagement';

// Map Supabase error messages to user-friendly messages
const getAuthErrorMessage = (error) => {
    const msg = error?.message || '';
    if (msg.includes('Invalid login credentials')) return 'Email or password is incorrect. Please try again.';
    if (msg.includes('Email not confirmed')) return 'Please verify your email before logging in. Check your inbox.';
    if (msg.includes('User already registered')) return 'An account with this email already exists. Try logging in.';
    if (msg.includes('Password should be at least')) return 'Password must be at least 8 characters long.';
    if (msg.includes('rate limit') || msg.includes('too many requests')) return 'Too many attempts. Please wait a moment and try again.';
    if (msg.includes('Network') || msg.includes('fetch')) return 'Connection error. Please check your internet and try again.';
    if (msg.includes('Email rate limit')) return 'Email already sent. Please wait before requesting another.';
    return msg || 'Something went wrong. Please try again.';
};

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
                const { cart, products } = get();
                
                // Check stock availability
                const currentProduct = products.find(p => p.id === product.id);
                if (currentProduct) {
                    const stockStatus = getStockStatus(currentProduct, size);
                    if (!stockStatus.available) {
                        get().showToast('This product is out of stock', 'error');
                        return;
                    }
                }
                
                const existingItemIndex = cart.findIndex(
                    (item) => item.id === product.id && item.selectedSize === size && item.selectedColor.name === color.name
                );

                if (existingItemIndex > -1) {
                    const newCart = [...cart];
                    newCart[existingItemIndex].quantity += quantity;
                    set({ cart: newCart });
                    get().showToast(`Updated quantity for ${product.name}`, 'success');
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
                    get().showToast(`Added ${product.name} to cart`, 'success');
                }
                
                // Track analytics
                trackAddToCart(product, quantity);
            },

            removeFromCart: (cartId) => {
                const { cart } = get();
                const item = cart.find(item => item.cartId === cartId);
                
                set((state) => ({
                    cart: state.cart.filter((item) => item.cartId !== cartId),
                }));
                get().showToast('Removed item from cart', 'error');
                
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
                return cart.reduce((total, item) => total + item.price * item.quantity, 0);
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

            /* ---- Wishlist State & Actions ---- */
            wishlist: [],

            toggleWishlist: (product) => {
                const { wishlist } = get();
                const isInWishlist = wishlist.some((item) => item.id === product.id);

                if (isInWishlist) {
                    set({ wishlist: wishlist.filter((item) => item.id !== product.id) });
                    get().showToast('Removed from wishlist', 'error');
                } else {
                    set({ wishlist: [...wishlist, product] });
                    get().showToast('Added to wishlist', 'success');
                    
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
                    const mappedProducts = (data || []).map(p => ({
                        ...p,
                        originalPrice: p.original_price,
                        reviewCount: p.reviews_count || 0,
                        isNew: p.is_new || false,
                        isTrending: p.is_trending || false,
                    }));
                    set({ products: mappedProducts, isLoadingProducts: false, productsLoaded: true });
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
                        isLoadingProducts: false 
                    });
                    return productsCache[cacheKey];
                }

                try {
                    const start = (page - 1) * limit;
                    const end = start + limit - 1;

                    // Build query with only needed fields for listing
                    let query = supabase
                        .from('products')
                        .select('id, name, slug, price, original_price, discount, images, brand, category, colors, is_new, is_trending, rating, reviews_count', { count: 'exact' })
                        .range(start, end);

                    // Apply server-side filters
                    if (filters.category && filters.category.length > 0) {
                        query = query.in('category', Array.isArray(filters.category) ? filters.category : [filters.category]);
                    }
                    if (filters.minPrice) {
                        query = query.gte('price', filters.minPrice);
                    }
                    if (filters.maxPrice) {
                        query = query.lte('price', filters.maxPrice);
                    }
                    if (filters.search) {
                        // Use ilike for case-insensitive search
                        query = query.or(`name.ilike.%${filters.search}%,brand.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
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
                    const mappedProducts = (data || []).map(p => ({
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
                        isLoadingProducts: false 
                    });

                    return result;
                } catch (error) {
                    console.error('⚠️ Error fetching products:', error.message);
                    set({ 
                        products: [], 
                        productsPagination: { currentPage: 1, totalPages: 1, totalItems: 0, hasNext: false },
                        isLoadingProducts: false 
                    });
                    return { products: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0, hasNext: false } };
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
                const { data: { session } } = await supabase.auth.getSession();

                if (session?.user) {
                    const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
                    set({
                        user: { ...session.user, ...(profile || {}) },
                        isLoadingAuth: false
                    });
                } else {
                    set({ user: null, isLoadingAuth: false });
                }

                // Listen for changes
                supabase.auth.onAuthStateChange(async (_event, session) => {
                    if (session?.user) {
                        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
                        set({ user: { ...session.user, ...(profile || {}) } });
                    } else {
                        set({ user: null });
                    }
                });
            },

            login: async (email, password) => {
                set({ isAuthLoading: true, authError: null });
                try {
                    const { error } = await supabase.auth.signInWithPassword({ email, password });
                    if (error) {
                        const friendlyMsg = getAuthErrorMessage(error);
                        set({ isAuthLoading: false, authError: friendlyMsg });
                        return { success: false, error: friendlyMsg, needsVerification: error.message.includes('Email not confirmed') };
                    }
                    set({ isAuthLoading: false, authError: null });
                    get().showToast('Welcome back!', 'success');
                    
                    // Track analytics
                    trackLogin('email');
                    
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
                    const { data, error } = await supabase.auth.signUp({ email, password });

                    if (error) {
                        const friendlyMsg = getAuthErrorMessage(error);
                        set({ isAuthLoading: false, authError: friendlyMsg });
                        return { success: false, error: friendlyMsg };
                    }

                    if (data.user) {
                        // Create Profile
                        const { error: profileError } = await supabase.from('profiles').insert([
                            { id: data.user.id, email, full_name: fullName }
                        ]);

                        if (profileError) {
                            console.error('Profile creation failed:', profileError);
                        }

                        // Check if email confirmation is required
                        const needsVerification = data.user.identities?.length === 0 || !data.session;
                        set({ isAuthLoading: false, authError: null });
                        
                        // Track analytics
                        trackSignUp('email');
                        
                        return { success: true, needsVerification };
                    }
                    set({ isAuthLoading: false });
                    return { success: false, error: 'Registration failed. Please try again.' };
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
                    const { error } = await supabase.auth.updateUser({ password: newPassword });
                    if (error) {
                        const friendlyMsg = getAuthErrorMessage(error);
                        set({ isAuthLoading: false, authError: friendlyMsg });
                        return { success: false, error: friendlyMsg };
                    }
                    set({ isAuthLoading: false });
                    get().showToast('Password updated successfully!', 'success');
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
                await supabase.auth.signOut();
                set({ user: null });
                get().showToast('Logged out successfully', 'success');
            },

            // Check if current user is admin
            isAdmin: () => {
                const { user } = get();
                return user?.role === 'admin';
            },

            /* ---- Admin Product Actions ---- */
            createProduct: async (productData) => {
                try {
                    const { data, error } = await supabase
                        .from('products')
                        .insert([productData])
                        .select();

                    if (error) throw error;

                    // Refresh products list
                    await get().fetchProducts();
                    get().showToast('Product created successfully', 'success');
                    return { data, error: null };
                } catch (error) {
                    console.error('Error creating product:', error);
                    get().showToast('Failed to create product', 'error');
                    return { data: null, error };
                }
            },

            updateProduct: async (id, productData) => {
                try {
                    const { data, error } = await supabase
                        .from('products')
                        .update(productData)
                        .eq('id', id)
                        .select();

                    if (error) throw error;

                    // Refresh products list
                    await get().fetchProducts();
                    get().showToast('Product updated successfully', 'success');
                    return { data, error: null };
                } catch (error) {
                    console.error('Error updating product:', error);
                    get().showToast('Failed to update product', 'error');
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

                    // Refresh products list
                    await get().fetchProducts();
                    get().showToast('Product deleted successfully', 'success');
                    return { error: null };
                } catch (error) {
                    console.error('Error deleting product:', error);
                    get().showToast('Failed to delete product', 'error');
                    return { error };
                }
            },

            // Helper: Get product count for a specific category
            getCategoryCount: (categorySlug) => {
                const { products } = get();
                return products.filter(p => p.category === categorySlug).length;
            },

            // Seed Dummy Data
            seedProducts: async () => {
                const { products: existing } = get();
                if (existing.length > 0) {
                    get().showToast('Products already exist. Clear them first if you want to re-seed.', 'info');
                    return;
                }

                get().showToast('Seeding products... this may take a moment', 'info');

                // Dynamic import to avoid circular dependency issues if any
                const { products: dummyProducts } = await import('../lib/dummyData');

                let successCount = 0;

                for (const p of dummyProducts) {
                    // Map to DB shape (snake_case)
                    // Note: ID is auto-generated by DB usually, but we can try to use dummy IDs or let DB handle it.
                    // Let's let DB handle IDs to avoid conflicts, so we drop 'id'.
                    const { id, ...productData } = p;

                    const dbPayload = {
                        ...productData,
                        original_price: p.originalPrice,
                        reviews_count: p.reviewCount,
                        is_new: p.isNew,
                        is_trending: p.isTrending,
                        // Ensure arrays are compatible (Supabase handles JSON/Arrays well)
                    };

                    const { error } = await supabase.from('products').insert([dbPayload]);
                    if (!error) successCount++;
                    else console.error('Failed to seed:', p.name, error);
                }

                await get().fetchProducts();
                get().showToast(`Successfully added ${successCount} products!`, 'success');
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
                    set({ banners: data || [], bannersLoaded: true, isFetchingBanners: false });
                } catch (error) {
                    console.error('Error fetching banners:', error);
                    set({ banners: [], bannersLoaded: true, isFetchingBanners: false });
                }
            },

            createBanner: async (bannerData) => {
                try {
                    const { data, error } = await supabase
                        .from('banners')
                        .insert([bannerData])
                        .select();

                    if (error) throw error;
                    await get().fetchBanners();
                    get().showToast('Banner created', 'success');
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
                    get().showToast('Banner updated', 'success');
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
                    get().showToast('Banner deleted', 'success');
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
                    get().showToast('Please login to place an order', 'error');
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
                    name: String(orderData.address.name || '').trim().slice(0, 100),
                    street: String(orderData.address.street || '').trim().slice(0, 200),
                    city: String(orderData.address.city || '').trim().slice(0, 100),
                    state: String(orderData.address.state || '').trim().slice(0, 100),
                    pin: String(orderData.address.pin || '').trim().slice(0, 10),
                    phone: String(orderData.address.phone || '').trim().slice(0, 15)
                };

                try {
                    const { data, error } = await supabase.from('orders').insert([{
                        id: orderId,
                        user_id: user.id,
                        total: orderData.total,
                        address: sanitizedAddress,
                        payment_method: orderData.paymentMethod,
                        transaction_id: orderData.transactionId ? String(orderData.transactionId).trim().slice(0, 100) : null,
                        payment_status: initialPaymentStatus,
                        status: initialStatus,
                        timeline: orderData.timeline,
                    }]).select();

                    if (error) {
                        console.error('Order creation failed:', error);
                        get().showToast('Failed to place order. Please try again.', 'error');
                        return null;
                    }

                    // Insert items with error handling
                    if (orderData.items && orderData.items.length > 0) {
                        const itemsToInsert = orderData.items.map(item => ({
                            order_id: orderId,
                            product_id: item.id,
                            quantity: item.quantity,
                            size: item.selectedSize,
                            color: item.selectedColor,
                            price: item.price
                        }));

                        const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert);
                        
                        if (itemsError) {
                            console.error('Error inserting order items:', itemsError);
                            // Rollback order if items fail
                            await supabase.from('orders').delete().eq('id', orderId);
                            get().showToast('Failed to save order items. Please try again.', 'error');
                            return null;
                        }
                    }

                    return data[0];
                } catch (err) {
                    console.error('Unexpected error creating order:', err);
                    get().showToast('An unexpected error occurred. Please try again.', 'error');
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
            toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
            closeMobileMenu: () => set({ isMobileMenuOpen: false }),

            toast: null,
            showToast: (message, type = 'info') => {
                set({ toast: { message, type } });
                setTimeout(() => set({ toast: null }), 3000);
            },
            hideToast: () => set({ toast: null }),
        }),
        {
            name: 'stryng-storage',
            partialize: (state) => ({
                cart: state.cart,
                wishlist: state.wishlist,
                // Don't persist user/products heavily, depend on auth listener/bootstrap
            }),
        }
    )
);

export default useStore;
