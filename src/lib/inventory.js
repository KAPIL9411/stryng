/**
 * Simple Inventory Utilities - Firebase Version
 * Basic stock status helpers
 * @module lib/inventory
 */

/**
 * Get stock status with color coding
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
 * Check if product is in stock
 */
export const isInStock = (product) => {
  if (!product) return false;
  if (product.stock === undefined || product.stock === null) return true;
  return product.stock > 0;
};

/**
 * Get available stock for a product
 */
export const getAvailableStock = (product) => {
  if (!product) return 0;
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
 * Validate cart items against current stock
 */
export const validateCartStock = (cart, products = []) => {
  const issues = [];

  cart.forEach((cartItem) => {
    const product = products.find((p) => p.id === cartItem.id);

    if (!product) {
      issues.push({
        item: cartItem,
        issue: 'product_not_found',
        message: `${cartItem.name} is no longer available`,
      });
      return;
    }

    const available = getAvailableStock(product);

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
 * Get inventory statistics
 */
export const getInventoryStats = (products) => {
  const totalProducts = products.length;
  const inStock = products.filter((p) => isInStock(p)).length;
  const outOfStock = products.filter((p) => !isInStock(p)).length;
  const lowStock = products.filter((p) => isLowStock(p)).length;
  const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const inventoryValue = products.reduce((total, product) => {
    const stock = product.stock || 0;
    const price = product.price || 0;
    return total + stock * price;
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
 * Get low stock products
 */
export const getLowStockProducts = (products, threshold = 10) => {
  return products.filter((product) => isLowStock(product, threshold));
};

/**
 * Get out of stock products
 */
export const getOutOfStockProducts = (products) => {
  return products.filter((product) => !isInStock(product));
};

export default {
  getStockStatus,
  isInStock,
  getAvailableStock,
  isLowStock,
  validateCartStock,
  getInventoryStats,
  getLowStockProducts,
  getOutOfStockProducts,
};
