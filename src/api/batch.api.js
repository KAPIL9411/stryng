/**
 * Batch API Operations
 * Provides batch query utilities to avoid N+1 patterns
 * @module api/batch
 */

import { supabase } from '../lib/supabaseClient';

/**
 * Batch decrement stock for multiple products
 * Uses a single RPC call instead of multiple individual calls
 * @param {Array<{product_id: string, quantity: number}>} items - Items to decrement
 * @returns {Promise<Object>} Result
 */
export async function batchDecrementStock(items) {
  try {
    // Call batch RPC function
    const { data, error } = await supabase.rpc('batch_decrement_stock', {
      items: items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
      })),
    });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error batch decrementing stock:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Batch check stock availability for multiple products
 * Uses a single query with IN clause instead of multiple queries
 * @param {Array<{product_id: string, quantity: number}>} items - Items to check
 * @returns {Promise<Object>} Stock availability results
 */
export async function batchCheckStock(items) {
  try {
    const productIds = items.map((item) => item.product_id);

    // Single query to fetch all products
    const { data: products, error } = await supabase
      .from('products')
      .select('id, stock, name')
      .in('id', productIds);

    if (error) throw error;

    // Create a map for quick lookup
    const stockMap = new Map(products.map((p) => [p.id, p]));

    // Check availability for each item
    const results = items.map((item) => {
      const product = stockMap.get(item.product_id);

      if (!product) {
        return {
          product_id: item.product_id,
          available: false,
          current_stock: 0,
          requested: item.quantity,
          message: 'Product not found',
        };
      }

      const available = product.stock >= item.quantity;

      return {
        product_id: item.product_id,
        product_name: product.name,
        available,
        current_stock: product.stock,
        requested: item.quantity,
        message: available
          ? 'Available'
          : product.stock === 0
            ? 'Out of stock'
            : `Only ${product.stock} available`,
      };
    });

    return { success: true, data: results };
  } catch (error) {
    console.error('Error batch checking stock:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Batch reserve inventory for multiple products
 * Uses a single RPC call instead of multiple individual calls
 * @param {string} userId - User ID
 * @param {Array<{product_id: string, quantity: number}>} items - Items to reserve
 * @param {number} timeoutMinutes - Reservation timeout in minutes
 * @returns {Promise<Object>} Reservation results
 */
export async function batchReserveInventory(userId, items, timeoutMinutes = 15) {
  try {
    const { data, error } = await supabase.rpc('batch_reserve_inventory', {
      p_user_id: userId,
      p_items: items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
      })),
      p_timeout_minutes: timeoutMinutes,
    });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error batch reserving inventory:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Batch release inventory reservations
 * Uses a single query with IN clause instead of multiple queries
 * @param {Array<string>} reservationIds - Reservation IDs to release
 * @returns {Promise<Object>} Result
 */
export async function batchReleaseReservations(reservationIds) {
  try {
    const { error } = await supabase
      .from('inventory_reservations')
      .delete()
      .in('id', reservationIds);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error batch releasing reservations:', error);
    return { success: false, error: error.message };
  }
}
