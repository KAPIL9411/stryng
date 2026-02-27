/**
 * Orders API - Firebase Firestore
 * Handles order creation, retrieval, and management
 * @module api/orders
 */

import { serverTimestamp } from 'firebase/firestore';
import {
  COLLECTIONS,
  getDocument,
  getDocuments,
  addDocument,
  updateDocument,
  batchWrite,
  generateId,
} from '../lib/firestoreHelpers';
import { updateProductStock } from './products.api';

/**
 * Get next order number using Firestore counter
 * @returns {Promise<string>} Sequential order number (e.g., ORD-2024-00001)
 */
const getNextOrderNumber = async () => {
  const { db } = await import('../lib/firebaseClient');
  const { doc, getDoc, setDoc, updateDoc, runTransaction } = await import('firebase/firestore');
  
  try {
    // Use transaction to ensure atomicity
    const counterRef = doc(db, 'counters', 'orders');
    
    const orderNumber = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      
      let nextNumber = 1;
      
      if (counterDoc.exists()) {
        nextNumber = (counterDoc.data().current || 0) + 1;
      }
      
      // Update counter
      if (counterDoc.exists()) {
        transaction.update(counterRef, { 
          current: nextNumber,
          updated_at: new Date().toISOString()
        });
      } else {
        transaction.set(counterRef, { 
          current: nextNumber,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
      
      // Format: ORD-2024-00001
      const year = new Date().getFullYear();
      const paddedNumber = String(nextNumber).padStart(5, '0');
      return `ORD-${year}-${paddedNumber}`;
    });
    
    console.log('✅ Generated order number:', orderNumber);
    return orderNumber;
    
  } catch (error) {
    console.error('❌ Error generating order number:', error);
    // Fallback to timestamp-based if transaction fails
    const timestamp = Date.now();
    const fallbackNumber = `ORD-${new Date().getFullYear()}-${timestamp}`;
    console.log('⚠️ Using fallback order number:', fallbackNumber);
    return fallbackNumber;
  }
};

/**
 * Create a new order
 * @param {Object} orderData - Order data
 * @returns {Promise<Object>} Created order
 */
export const createOrder = async (orderData) => {
  try {
    const {
      user_id,
      items,
      shipping_address,
      payment_method,
      coupon = null,
      subtotal,
      shipping_cost = 0,
      tax = 0,
      coupon_discount = 0,
      total,
    } = orderData;

    // Validate required fields
    if (!user_id || !items || items.length === 0) {
      throw new Error('Invalid order data');
    }

    // Generate sequential order number
    const order_number = await getNextOrderNumber();

    // Create order document
    const order = {
      user_id,
      order_number,
      status: 'pending',
      
      // Pricing
      subtotal,
      shipping_cost,
      tax,
      coupon_discount,
      total,
      
      // Coupon
      coupon_id: coupon?.id || null,
      coupon_code: coupon?.code || null,
      
      // Payment
      payment_method,
      payment_status: payment_method === 'cod' ? 'pending' : 'verification_pending',
      payment_id: null,
      upi_transaction_id: null,
      
      // Shipping
      shipping_name: shipping_address.name,
      shipping_phone: shipping_address.phone,
      shipping_address_line1: shipping_address.address_line1,
      shipping_address_line2: shipping_address.address_line2 || '',
      shipping_city: shipping_address.city,
      shipping_state: shipping_address.state,
      shipping_pincode: shipping_address.pincode,
      shipping_landmark: shipping_address.landmark || '',
      
      // Tracking
      tracking_number: null,
      estimated_delivery_date: null,
      delivered_at: null,
      
      // Notes
      customer_notes: orderData.customer_notes || '',
      admin_notes: '',
      
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    };

    // Create order
    const orderId = await addDocument(COLLECTIONS.ORDERS, order);

    // Create order items
    const orderItemsPromises = items.map(async (item) => {
      return addDocument(COLLECTIONS.ORDER_ITEMS, {
        order_id: orderId,
        product_id: item.product_id,
        product_name: item.name,
        product_slug: item.slug,
        product_image: item.images?.[0] || '',
        product_sku: item.sku || '',
        quantity: item.quantity,
        size: item.size || '',
        color: item.color || '',
        price: item.price,
        subtotal: item.price * item.quantity,
        created_at: serverTimestamp(),
      });
    });

    await Promise.all(orderItemsPromises);

    // Update product stock
    const stockUpdates = items.map((item) =>
      updateProductStock(item.product_id, -item.quantity)
    );
    await Promise.all(stockUpdates);

    // Record coupon usage if applicable
    if (coupon) {
      await addDocument(COLLECTIONS.COUPON_USAGE, {
        coupon_id: coupon.id,
        user_id,
        order_id: orderId,
        discount_amount: coupon_discount,
        created_at: serverTimestamp(),
      });
    }

    return {
      id: orderId,
      ...order,
      order_number,
    };
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
};

/**
 * Get order by ID
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Response with order data and items
 */
export const getOrderById = async (orderId) => {
  try {
    console.log('📦 Fetching order:', orderId);
    const order = await getDocument(COLLECTIONS.ORDERS, orderId);
    
    if (!order) {
      console.log('❌ Order not found:', orderId);
      return { success: false, error: 'Order not found', data: null };
    }

    // Get order items
    const items = await getDocuments(COLLECTIONS.ORDER_ITEMS, {
      where: [['order_id', '==', orderId]],
    });

    console.log('✅ Order found with', items.length, 'items');

    return {
      success: true,
      data: {
        ...order,
        order_items: items,
        items, // Keep both for compatibility
      },
    };
  } catch (error) {
    console.error('Error fetching order:', error);
    return { success: false, error: error.message, data: null };
  }
};

/**
 * Get orders by user ID
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} User orders
 */
export const getOrdersByUserId = async (userId, options = {}) => {
  try {
    const { limit: limitResults = 50, status = null } = options;

    const whereClause = [['user_id', '==', userId]];
    if (status) {
      whereClause.push(['status', '==', status]);
    }

    const orders = await getDocuments(COLLECTIONS.ORDERS, {
      where: whereClause,
      orderBy: [['created_at', 'desc']],
      limit: limitResults,
    });

    // Get items for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await getDocuments(COLLECTIONS.ORDER_ITEMS, {
          where: [['order_id', '==', order.id]],
        });
        return { ...order, items };
      })
    );

    return ordersWithItems;
  } catch (error) {
    console.error('Error fetching user orders:', error);
    return [];
  }
};

/**
 * Get user orders with pagination (for OrderHistory page)
 * @param {number} page - Page number
 * @param {number} pageSize - Items per page
 * @returns {Promise<Object>} Orders with pagination
 */
export const getUserOrders = async (page = 1, pageSize = 10) => {
  try {
    const { auth } = await import('../lib/firebaseClient');
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      return {
        success: false,
        error: 'User not authenticated',
        data: [],
        pagination: {
          currentPage: page,
          pageSize,
          totalItems: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };
    }

    const userId = currentUser.uid;

    // Get all orders for this user to calculate total
    const allOrders = await getDocuments(COLLECTIONS.ORDERS, {
      where: [['user_id', '==', userId]],
      orderBy: [['created_at', 'desc']],
    });

    const totalItems = allOrders.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedOrders = allOrders.slice(startIndex, endIndex);

    // Get items for each order
    const ordersWithItems = await Promise.all(
      paginatedOrders.map(async (order) => {
        const items = await getDocuments(COLLECTIONS.ORDER_ITEMS, {
          where: [['order_id', '==', order.id]],
        });
        return { ...order, items, order_items: items };
      })
    );

    return {
      success: true,
      data: ordersWithItems,
      pagination: {
        currentPage: page,
        pageSize,
        totalItems,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  } catch (error) {
    console.error('Error fetching user orders:', error);
    return {
      success: false,
      error: error.message,
      data: [],
      pagination: {
        currentPage: page,
        pageSize,
        totalItems: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    };
  }
};

/**
 * Get all orders (Admin only)
 * @param {Object} filters - Filter options
 * @param {number} page - Page number
 * @param {number} pageSize - Items per page
 * @returns {Promise<Object>} All orders with pagination
 */
export const getAllOrders = async (filters = {}, page = 1, pageSize = 20) => {
  try {
    const whereClause = [];
    
    if (filters.status) {
      whereClause.push(['status', '==', filters.status]);
    }
    if (filters.payment_status) {
      whereClause.push(['payment_status', '==', filters.payment_status]);
    }

    // Get all orders for stats
    const allOrders = await getDocuments(COLLECTIONS.ORDERS, {
      where: whereClause,
      orderBy: [['created_at', 'desc']],
    });

    // Calculate pagination
    const totalItems = allOrders.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedOrders = allOrders.slice(startIndex, endIndex);

    // Get order items for each order
    const ordersWithItems = await Promise.all(
      paginatedOrders.map(async (order) => {
        const items = await getDocuments(COLLECTIONS.ORDER_ITEMS, {
          where: [['order_id', '==', order.id]],
        });
        
        // Get address from order fields
        const address = {
          full_name: order.shipping_name,
          phone: order.shipping_phone,
          address_line1: order.shipping_address_line1,
          address_line2: order.shipping_address_line2,
          city: order.shipping_city,
          state: order.shipping_state,
          pincode: order.shipping_pincode,
          landmark: order.shipping_landmark,
        };
        
        return { ...order, order_items: items, address };
      })
    );

    return {
      success: true,
      data: ordersWithItems,
      pagination: {
        currentPage: page,
        pageSize,
        totalItems,
        totalPages,
      },
    };
  } catch (error) {
    console.error('Error fetching all orders:', error);
    return {
      success: false,
      data: [],
      pagination: {
        currentPage: 1,
        pageSize,
        totalItems: 0,
        totalPages: 0,
      },
    };
  }
};

/**
 * Update order status (Admin only)
 * @param {string} orderId - Order ID
 * @param {string} status - New status
 * @param {Object} additionalData - Additional data to update
 * @returns {Promise<Object>} Result
 */
export const updateOrderStatus = async (orderId, status, additionalData = {}) => {
  try {
    const updateData = {
      status,
      updated_at: serverTimestamp(),
      ...additionalData,
    };

    // If status is delivered, set delivered_at
    if (status === 'delivered') {
      updateData.delivered_at = serverTimestamp();
    }

    await updateDocument(COLLECTIONS.ORDERS, orderId, updateData);
    
    return { success: true };
  } catch (error) {
    console.error('Error updating order status:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update payment status
 * @param {string} orderId - Order ID
 * @param {string} paymentStatus - New payment status
 * @param {Object} paymentData - Payment data (payment_id, upi_transaction_id)
 * @returns {Promise<void>}
 */
export const updatePaymentStatus = async (orderId, paymentStatus, paymentData = {}) => {
  try {
    await updateDocument(COLLECTIONS.ORDERS, orderId, {
      payment_status: paymentStatus,
      ...paymentData,
      updated_at: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    throw error;
  }
};

/**
 * Mark payment as paid (for customer payment confirmation)
 * @param {string} orderId - Order ID
 * @param {string} transactionId - UPI transaction ID
 * @returns {Promise<Object>} Result
 */
export const markPaymentAsPaid = async (orderId, transactionId) => {
  try {
    await updateDocument(COLLECTIONS.ORDERS, orderId, {
      payment_status: 'verification_pending',
      upi_transaction_id: transactionId,
      status: 'pending',
      updated_at: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error marking payment as paid:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Add tracking information
 * @param {string} orderId - Order ID
 * @param {string} trackingNumber - Tracking number
 * @param {Date} estimatedDelivery - Estimated delivery date
 * @returns {Promise<void>}
 */
export const addTrackingInfo = async (orderId, trackingNumber, estimatedDelivery = null) => {
  try {
    await updateDocument(COLLECTIONS.ORDERS, orderId, {
      tracking_number: trackingNumber,
      estimated_delivery_date: estimatedDelivery,
      updated_at: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error adding tracking info:', error);
    throw error;
  }
};

/**
 * Cancel order
 * @param {string} orderId - Order ID
 * @param {string} reason - Cancellation reason
 * @returns {Promise<Object>} Result
 */
export const cancelOrder = async (orderId, reason = '') => {
  try {
    // Get order to restore stock
    const result = await getOrderById(orderId);
    if (!result.success || !result.data) {
      throw new Error('Order not found');
    }

    const order = result.data;

    // Restore product stock
    const stockRestores = (order.items || order.order_items || []).map((item) =>
      updateProductStock(item.product_id, item.quantity)
    );
    await Promise.all(stockRestores);

    // Update order status
    await updateDocument(COLLECTIONS.ORDERS, orderId, {
      status: 'cancelled',
      admin_notes: reason,
      updated_at: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error cancelling order:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get order statistics (Admin only)
 * @returns {Promise<Object>} Order statistics
 */
export const getOrderStatistics = async () => {
  try {
    const allOrders = await getDocuments(COLLECTIONS.ORDERS);

    const stats = {
      total: allOrders.length,
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      totalRevenue: 0,
    };

    allOrders.forEach((order) => {
      stats[order.status] = (stats[order.status] || 0) + 1;
      if (order.status !== 'cancelled') {
        stats.totalRevenue += order.total || 0;
      }
    });

    return stats;
  } catch (error) {
    console.error('Error fetching order statistics:', error);
    return {
      total: 0,
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      totalRevenue: 0,
    };
  }
};

/**
 * Get dashboard statistics (Admin only)
 * @returns {Promise<Object>} Dashboard stats
 */
export const getDashboardStats = async () => {
  try {
    const allOrders = await getDocuments(COLLECTIONS.ORDERS);

    console.log('📊 Dashboard Stats - Total orders in DB:', allOrders.length);
    console.log('📊 Order IDs:', allOrders.map(o => ({ id: o.id, order_number: o.order_number, created_at: o.created_at })));

    let totalRevenue = 0;
    let pendingOrders = 0;

    allOrders.forEach((order) => {
      if (order.status !== 'cancelled') {
        totalRevenue += order.total || 0;
      }
      if (order.status === 'pending' || order.status === 'confirmed') {
        pendingOrders++;
      }
    });

    return {
      success: true,
      data: {
        totalOrders: allOrders.length,
        totalRevenue,
        pendingOrders,
      },
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
      success: false,
      data: {
        totalOrders: 0,
        totalRevenue: 0,
        pendingOrders: 0,
      },
    };
  }
};

/**
 * Get recent orders (Admin only)
 * @param {number} limit - Number of orders to fetch
 * @returns {Promise<Object>} Recent orders
 */
export const getRecentOrders = async (limit = 5) => {
  try {
    const orders = await getDocuments(COLLECTIONS.ORDERS, {
      orderBy: [['created_at', 'desc']],
      limit,
    });

    return {
      success: true,
      data: orders,
    };
  } catch (error) {
    console.error('Error fetching recent orders:', error);
    return {
      success: false,
      data: [],
    };
  }
};

/**
 * Verify payment (Admin only)
 * @param {string} orderId - Order ID
 * @param {boolean} isVerified - Whether payment is verified
 * @returns {Promise<Object>} Result
 */
export const verifyPayment = async (orderId, isVerified) => {
  try {
    if (isVerified) {
      // Mark payment as paid and confirm order
      await updateDocument(COLLECTIONS.ORDERS, orderId, {
        payment_status: 'paid',
        status: 'confirmed',
        updated_at: serverTimestamp(),
      });
    } else {
      // Reject payment and cancel order
      await cancelOrder(orderId, 'Payment verification failed');
    }

    return { success: true };
  } catch (error) {
    console.error('Error verifying payment:', error);
    return { success: false, error: error.message };
  }
};

export default {
  createOrder,
  getOrderById,
  getOrdersByUserId,
  getUserOrders,
  getAllOrders,
  updateOrderStatus,
  updatePaymentStatus,
  markPaymentAsPaid,
  addTrackingInfo,
  cancelOrder,
  getOrderStatistics,
  getDashboardStats,
  getRecentOrders,
  verifyPayment,
};
