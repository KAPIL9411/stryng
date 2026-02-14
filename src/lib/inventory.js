/**
 * Unified Inventory Management System
 * Combines client-side and database-integrated inventory operations
 * @module lib/inventory
 */

import { supabase } from './supabaseClient';

// ============================================
// STOCK STATUS & VALIDATION
// ============================================

/**
 * Get stock status with color coding
 * Works with both tracked and untracked inventory
 */
export const getStockStatus = (stock, threshold = 10) => {
    // Handle undefined/null stock (inventory not tracked)
    if (stock === undefined || stock === null) {
        return {
            status: 'not_tracked',
            label: 'In Stock',
            color: '#16a34a',
            badge: 'normal',
            available: true,
        };
    }

    if (stock === 0) {
        return {
            status: 'out_of_stock',
            label: 'Out of Stock',
            color: '#dc2626',
            badge: 'critical',
            available: false,
        };
    }

    if (stock <= 5) {
        return {
            status: 'critical_low',
            label: `Only ${stock} left!`,
            color: '#ea580c',
            badge: 'urgent',
            available: true,
        };
    }

    if (stock <= threshold) {
        return {
            status: 'low_stock',
            label: `Low Stock (${stock})`,
            color: '#f59e0b',
            badge: 'warning',
            available: true,
        };
    }

    return {
        status: 'in_stock',
        label: 'In Stock',
        color: '#16a34a',
        badge: 'normal',
        available: true,
    };
};

/**
 * Check if product is in stock (client-side)
 */
export const isInStock = (product, size = null) => {
    if (!product) return false;

    if (product.stock === undefined || product.stock === null) {
        return true; // Assume in stock if not tracked
    }

    if (product.stock <= 0) {
        return false;
    }

    // Check size-specific stock if provided
    if (size && product.stockBySize) {
        return (product.stockBySize[size] || 0) > 0;
    }

    return true;
};

/**
 * Get available stock for a product (client-side)
 */
export const getAvailableStock = (product, size = null) => {
    if (!product) return 0;

    if (size && product.stockBySize) {
        return product.stockBySize[size] || 0;
    }

    return product.stock || 0;
};

/**
 * Check if product is low stock (client-side)
 */
export const isLowStock = (product, threshold = 10) => {
    if (!product || product.stock === undefined) return false;
    return product.stock > 0 && product.stock <= threshold;
};

/**
 * Check stock availability from database
 */
export const checkStockAvailability = async (productId, variantId = null, quantity = 1) => {
    try {
        if (variantId) {
            const { data, error } = await supabase
                .from('product_variants')
                .select('stock, is_active')
                .eq('id', variantId)
                .single();

            if (error) throw error;
            
            return {
                available: data.is_active && data.stock >= quantity,
                currentStock: data.stock,
                requested: quantity,
            };
        } else {
            const { data, error } = await supabase
                .from('products')
                .select('stock, track_inventory')
                .eq('id', productId)
                .single();

            if (error) throw error;

            if (!data.track_inventory) {
                return { available: true, currentStock: Infinity, requested: quantity };
            }

            return {
                available: data.stock >= quantity,
                currentStock: data.stock,
                requested: quantity,
            };
        }
    } catch (error) {
        console.error('Stock availability check failed:', error);
        return { available: false, error: error.message };
    }
};

/**
 * Validate cart items against current stock
 * Works with both client-side products array and database
 */
export const validateCartStock = (cart, products = null) => {
    const issues = [];

    // Client-side validation if products array provided
    if (products && Array.isArray(products)) {
        cart.forEach(cartItem => {
            const product = products.find(p => p.id === cartItem.id);
            
            if (!product) {
                issues.push({
                    item: cartItem,
                    issue: 'product_not_found',
                    message: `${cartItem.name} is no longer available`,
                });
                return;
            }

            const available = getAvailableStock(product, cartItem.selectedSize);

            if (available === 0) {
                issues.push({
                    item: cartItem,
                    issue: 'out_of_stock',
                    message: `${cartItem.name} is out of stock`,
                });
            } else if (available < cartItem.quantity) {
                issues.push({
                    item: cartItem,
                    issue: 'insufficient_stock',
                    message: `Only ${available} of ${cartItem.name} available (you have ${cartItem.quantity} in cart)`,
                    available,
                });
            }
        });

        return {
            isValid: issues.length === 0,
            issues,
        };
    }

    // For database validation, return async function
    return {
        isValid: true,
        issues: [],
        note: 'Use validateCartStockAsync for database validation',
    };
};

/**
 * Validate cart items against database (async)
 */
export const validateCartStockAsync = async (cartItems) => {
    const issues = [];

    for (const item of cartItems) {
        const check = await checkStockAvailability(
            item.productId || item.id,
            item.variantId,
            item.quantity
        );

        if (!check.available) {
            issues.push({
                itemId: item.id,
                productId: item.productId || item.id,
                issue: check.currentStock === 0 ? 'out_of_stock' : 'insufficient_stock',
                message: check.currentStock === 0
                    ? `${item.name} is out of stock`
                    : `Only ${check.currentStock} available (you have ${item.quantity} in cart)`,
                currentStock: check.currentStock,
                requestedQuantity: item.quantity,
            });
        }
    }

    return {
        isValid: issues.length === 0,
        issues,
    };
};

// ============================================
// STOCK OPERATIONS (DATABASE)
// ============================================

/**
 * Deduct stock for completed order
 */
export const deductStockForOrder = async (orderId, items) => {
    try {
        const { data, error } = await supabase.rpc('deduct_stock_for_order', {
            p_order_id: orderId,
            p_items: items,
        });

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Stock deduction failed:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Restore stock for cancelled order
 */
export const restoreStockForOrder = async (orderId) => {
    try {
        const { data, error } = await supabase.rpc('restore_stock_for_order', {
            p_order_id: orderId,
        });

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Stock restoration failed:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Adjust stock manually (admin)
 */
export const adjustStock = async (productId, variantId, newStock, reason, notes, userId) => {
    try {
        const table = variantId ? 'product_variants' : 'products';
        const idField = 'id';
        const idValue = variantId || productId;

        const { data: current, error: fetchError } = await supabase
            .from(table)
            .select('stock')
            .eq(idField, idValue)
            .single();

        if (fetchError) throw fetchError;

        const { error: updateError } = await supabase
            .from(table)
            .update({ stock: newStock })
            .eq(idField, idValue);

        if (updateError) throw updateError;

        await supabase.from('stock_movements').insert({
            product_id: productId,
            variant_id: variantId,
            quantity: newStock - current.stock,
            type: newStock > current.stock ? 'in' : 'out',
            reason,
            stock_before: current.stock,
            stock_after: newStock,
            notes,
            created_by: userId,
        });

        return { success: true, oldStock: current.stock, newStock };
    } catch (error) {
        console.error('Stock adjustment failed:', error);
        return { success: false, error: error.message };
    }
};

// ============================================
// ANALYTICS & REPORTING
// ============================================

/**
 * Get inventory statistics (client-side)
 */
export const getInventoryStats = (products) => {
    const totalProducts = products.length;
    const inStock = products.filter(p => isInStock(p)).length;
    const outOfStock = products.filter(p => !isInStock(p)).length;
    const lowStock = products.filter(p => isLowStock(p)).length;
    const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
    const inventoryValue = products.reduce((total, product) => {
        const stock = product.stock || 0;
        const price = product.price || 0;
        return total + (stock * price);
    }, 0);

    return {
        totalProducts,
        inStock,
        outOfStock,
        lowStock,
        totalStock,
        inventoryValue,
        stockRate: totalProducts > 0 ? (inStock / totalProducts) * 100 : 0,
    };
};

/**
 * Get low stock products (client-side)
 */
export const getLowStockProducts = (products, threshold = 10) => {
    return products.filter(product => isLowStock(product, threshold));
};

/**
 * Get out of stock products (client-side)
 */
export const getOutOfStockProducts = (products) => {
    return products.filter(product => !isInStock(product));
};

/**
 * Get inventory dashboard from database
 */
export const getInventoryDashboard = async () => {
    try {
        const { data, error } = await supabase
            .from('inventory_dashboard')
            .select('*')
            .single();

        if (error) throw error;

        return {
            success: true,
            stats: data,
        };
    } catch (error) {
        console.error('Failed to fetch inventory dashboard:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get low stock products from database
 */
export const getLowStockProductsFromDB = async (limit = 50) => {
    try {
        const { data, error } = await supabase
            .from('low_stock_products')
            .select('*')
            .limit(limit);

        if (error) throw error;

        return {
            success: true,
            products: data,
        };
    } catch (error) {
        console.error('Failed to fetch low stock products:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get stock movement history
 */
export const getStockMovements = async (productId, variantId = null, limit = 100) => {
    try {
        let query = supabase
            .from('stock_movements')
            .select('*, profiles(full_name)')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (productId) {
            query = query.eq('product_id', productId);
        }

        if (variantId) {
            query = query.eq('variant_id', variantId);
        }

        const { data, error } = await query;

        if (error) throw error;

        return {
            success: true,
            movements: data,
        };
    } catch (error) {
        console.error('Failed to fetch stock movements:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Calculate sales velocity (units per day)
 */
export const calculateSalesVelocity = async (productId, days = 30) => {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data, error } = await supabase
            .from('stock_movements')
            .select('quantity')
            .eq('product_id', productId)
            .eq('type', 'out')
            .eq('reason', 'sale')
            .gte('created_at', startDate.toISOString());

        if (error) throw error;

        const totalSold = data.reduce((sum, m) => sum + Math.abs(m.quantity), 0);
        const velocity = totalSold / days;

        return {
            success: true,
            totalSold,
            days,
            velocity: Math.round(velocity * 100) / 100,
            averagePerDay: Math.round(velocity * 100) / 100,
        };
    } catch (error) {
        console.error('Failed to calculate sales velocity:', error);
        return { success: false, error: error.message };
    }
};

// ============================================
// SKU MANAGEMENT
// ============================================

/**
 * Generate unique SKU
 */
export const generateSKU = async (productName, category) => {
    try {
        const { data, error } = await supabase.rpc('generate_sku', {
            product_name: productName,
            category,
        });

        if (error) throw error;

        return { success: true, sku: data };
    } catch (error) {
        console.error('SKU generation failed:', error);
        // Fallback to client-side generation
        const prefix = category.substring(0, 3).toUpperCase();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return { success: true, sku: `${prefix}-${random}` };
    }
};

/**
 * Check if SKU exists
 */
export const checkSKUExists = async (sku) => {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('id')
            .eq('sku', sku)
            .maybeSingle();

        if (error) throw error;

        return { exists: !!data, productId: data?.id };
    } catch (error) {
        console.error('SKU check failed:', error);
        return { exists: false, error: error.message };
    }
};

// ============================================
// STOCK ALERTS
// ============================================

/**
 * Get stock alerts for admin dashboard
 */
export const getStockAlerts = (products) => {
    const alerts = [];

    const outOfStock = getOutOfStockProducts(products);
    if (outOfStock.length > 0) {
        alerts.push({
            type: 'critical',
            title: 'Out of Stock Products',
            message: `${outOfStock.length} products are out of stock`,
            products: outOfStock,
            action: 'restock',
        });
    }

    const lowStock = getLowStockProducts(products);
    if (lowStock.length > 0) {
        alerts.push({
            type: 'warning',
            title: 'Low Stock Alert',
            message: `${lowStock.length} products are running low`,
            products: lowStock,
            action: 'review',
        });
    }

    return alerts;
};

// Export all functions as default
export default {
    // Status & Validation
    getStockStatus,
    isInStock,
    getAvailableStock,
    isLowStock,
    checkStockAvailability,
    validateCartStock,
    validateCartStockAsync,
    
    // Stock Operations
    deductStockForOrder,
    restoreStockForOrder,
    adjustStock,
    
    // Analytics
    getInventoryStats,
    getLowStockProducts,
    getOutOfStockProducts,
    getInventoryDashboard,
    getLowStockProductsFromDB,
    getStockMovements,
    calculateSalesVelocity,
    
    // SKU Management
    generateSKU,
    checkSKUExists,
    
    // Alerts
    getStockAlerts,
};
