/**
 * Inventory Management System
 * Handles stock tracking, low stock alerts, and inventory operations
 */

/**
 * Check if product is in stock
 */
export const isInStock = (product, size = null) => {
    if (!product) return false;

    // Check overall stock
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
 * Get available stock for a product
 */
export const getAvailableStock = (product, size = null) => {
    if (!product) return 0;

    // If size-specific stock tracking
    if (size && product.stockBySize) {
        return product.stockBySize[size] || 0;
    }

    // Overall stock
    return product.stock || 0;
};

/**
 * Check if product is low stock
 */
export const isLowStock = (product, threshold = 10) => {
    if (!product || product.stock === undefined) return false;
    return product.stock > 0 && product.stock <= threshold;
};

/**
 * Get stock status
 */
export const getStockStatus = (product, size = null) => {
    const stock = getAvailableStock(product, size);

    if (stock === 0) {
        return {
            status: 'out_of_stock',
            label: 'Out of Stock',
            color: 'red',
            available: false,
        };
    }

    if (stock <= 5) {
        return {
            status: 'low_stock',
            label: `Only ${stock} left`,
            color: 'orange',
            available: true,
        };
    }

    if (stock <= 20) {
        return {
            status: 'limited_stock',
            label: 'Limited Stock',
            color: 'yellow',
            available: true,
        };
    }

    return {
        status: 'in_stock',
        label: 'In Stock',
        color: 'green',
        available: true,
    };
};

/**
 * Reserve stock for cart items (temporary hold)
 */
export const reserveStock = (product, quantity, size = null) => {
    const available = getAvailableStock(product, size);

    if (available < quantity) {
        return {
            success: false,
            error: `Only ${available} items available`,
            available,
        };
    }

    // In production, this would make an API call to reserve stock
    return {
        success: true,
        reserved: quantity,
        reservationId: `RES-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    };
};

/**
 * Release reserved stock
 */
export const releaseStock = (reservationId) => {
    // In production, this would make an API call to release stock
    console.log('Releasing stock reservation:', reservationId);
    return { success: true };
};

/**
 * Update stock after purchase
 */
export const updateStockAfterPurchase = async (items) => {
    // In production, this would be handled by backend
    // This is a client-side simulation
    
    const updates = items.map(item => ({
        productId: item.id,
        size: item.selectedSize,
        quantity: item.quantity,
        operation: 'decrease',
    }));

    console.log('Stock updates after purchase:', updates);
    
    // TODO: Implement backend API call
    // await fetch('/api/inventory/update', { method: 'POST', body: JSON.stringify(updates) });

    return { success: true, updates };
};

/**
 * Get low stock products (for admin alerts)
 */
export const getLowStockProducts = (products, threshold = 10) => {
    return products.filter(product => isLowStock(product, threshold));
};

/**
 * Get out of stock products
 */
export const getOutOfStockProducts = (products) => {
    return products.filter(product => !isInStock(product));
};

/**
 * Calculate inventory value
 */
export const calculateInventoryValue = (products) => {
    return products.reduce((total, product) => {
        const stock = product.stock || 0;
        const price = product.price || 0;
        return total + (stock * price);
    }, 0);
};

/**
 * Get inventory statistics
 */
export const getInventoryStats = (products) => {
    const totalProducts = products.length;
    const inStock = products.filter(p => isInStock(p)).length;
    const outOfStock = products.filter(p => !isInStock(p)).length;
    const lowStock = products.filter(p => isLowStock(p)).length;
    const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
    const inventoryValue = calculateInventoryValue(products);

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
 * Validate cart against current stock
 */
export const validateCartStock = (cart, products) => {
    const issues = [];

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
};

/**
 * Get stock alerts for admin dashboard
 */
export const getStockAlerts = (products) => {
    const alerts = [];

    // Out of stock alerts
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

    // Low stock alerts
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

/**
 * Predict stock depletion date
 */
export const predictStockDepletion = (product, salesHistory = []) => {
    if (!product.stock || product.stock === 0) {
        return { depleted: true, date: new Date() };
    }

    if (salesHistory.length === 0) {
        return { depleted: false, date: null, message: 'Insufficient sales data' };
    }

    // Calculate average daily sales
    const totalSales = salesHistory.reduce((sum, sale) => sum + sale.quantity, 0);
    const daysOfData = salesHistory.length;
    const avgDailySales = totalSales / daysOfData;

    if (avgDailySales === 0) {
        return { depleted: false, date: null, message: 'No sales activity' };
    }

    // Calculate days until depletion
    const daysUntilDepletion = Math.floor(product.stock / avgDailySales);
    const depletionDate = new Date();
    depletionDate.setDate(depletionDate.getDate() + daysUntilDepletion);

    return {
        depleted: false,
        date: depletionDate,
        daysRemaining: daysUntilDepletion,
        avgDailySales: Math.round(avgDailySales * 10) / 10,
    };
};

/**
 * Generate restock recommendations
 */
export const generateRestockRecommendations = (products, salesHistory = {}) => {
    const recommendations = [];

    products.forEach(product => {
        const productSales = salesHistory[product.id] || [];
        const stockStatus = getStockStatus(product);

        if (stockStatus.status === 'out_of_stock' || stockStatus.status === 'low_stock') {
            const prediction = predictStockDepletion(product, productSales);
            
            // Calculate recommended restock quantity
            const avgDailySales = prediction.avgDailySales || 1;
            const recommendedStock = Math.ceil(avgDailySales * 30); // 30 days worth

            recommendations.push({
                product,
                currentStock: product.stock || 0,
                recommendedStock,
                priority: stockStatus.status === 'out_of_stock' ? 'high' : 'medium',
                reason: stockStatus.label,
            });
        }
    });

    return recommendations.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
};

/**
 * Stock movement tracking
 */
export class StockMovementTracker {
    constructor() {
        this.movements = [];
    }

    recordMovement(productId, quantity, type, reason, metadata = {}) {
        const movement = {
            id: `MOV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            productId,
            quantity,
            type, // 'in' or 'out'
            reason, // 'purchase', 'return', 'restock', 'adjustment', 'damage'
            timestamp: new Date(),
            metadata,
        };

        this.movements.push(movement);
        return movement;
    }

    getMovements(productId = null, startDate = null, endDate = null) {
        let filtered = this.movements;

        if (productId) {
            filtered = filtered.filter(m => m.productId === productId);
        }

        if (startDate) {
            filtered = filtered.filter(m => m.timestamp >= startDate);
        }

        if (endDate) {
            filtered = filtered.filter(m => m.timestamp <= endDate);
        }

        return filtered;
    }

    getStockHistory(productId) {
        const movements = this.getMovements(productId);
        let runningStock = 0;

        return movements.map(movement => {
            if (movement.type === 'in') {
                runningStock += movement.quantity;
            } else {
                runningStock -= movement.quantity;
            }

            return {
                ...movement,
                stockAfter: runningStock,
            };
        });
    }
}
