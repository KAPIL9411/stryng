/**
 * Enterprise-Level Dashboard API
 * Uses materialized views for Amazon-level performance
 * @module api/dashboard.enterprise
 */

import { supabase } from '../lib/supabaseClient';
import { inMemoryCache } from '../services/InMemoryCacheService';

/**
 * Get dashboard statistics from materialized view
 * Amazon-level optimization: Pre-computed aggregations
 * @returns {Promise<Object>} Dashboard statistics
 */
export async function getDashboardStatsEnterprise() {
  const startTime = performance.now();
  const cacheKey = 'enterprise:dashboard:stats';

  try {
    // Try cache first (1-minute TTL since materialized view refreshes every 5 min)
    const cached = inMemoryCache.get(cacheKey);
    if (cached) {
      const duration = performance.now() - startTime;
      console.log(`⚡ Dashboard Stats Cache HIT (${duration.toFixed(2)}ms)`);
      return cached;
    }

    // Query materialized view (extremely fast - no aggregation needed)
    const { data, error } = await supabase
      .from('dashboard_stats')
      .select('*')
      .single();

    if (error) {
      // Fallback to regular query if materialized view doesn't exist
      console.warn('Materialized view not found, using fallback query');
      return await getDashboardStatsFallback();
    }

    const result = {
      totalOrders: data.total_orders || 0,
      totalRevenue: data.total_revenue || 0,
      pendingOrders: data.pending_orders || 0,
      processingOrders: data.processing_orders || 0,
      shippedOrders: data.shipped_orders || 0,
      deliveredOrders: data.delivered_orders || 0,
      avgOrderValue: data.avg_order_value || 0,
      lastOrderDate: data.last_order_date,
      refreshedAt: data.refreshed_at,
    };

    // Cache for 1 minute (materialized view refreshes every 5 minutes)
    inMemoryCache.set(cacheKey, result, 60);

    const duration = performance.now() - startTime;
    console.log(`⚡ Dashboard Stats from Materialized View (${duration.toFixed(2)}ms)`);

    return result;
  } catch (error) {
    console.error('❌ getDashboardStatsEnterprise error:', error);
    // Fallback to regular query
    return await getDashboardStatsFallback();
  }
}

/**
 * Fallback function if materialized view doesn't exist
 * @private
 */
async function getDashboardStatsFallback() {
  console.log('⚠️ Using fallback query (slower)');
  
  // Get orders with minimal fields
  const { data: orderData } = await supabase
    .from('orders')
    .select('total, payment_status, status');

  const totalOrders = orderData ? orderData.length : 0;
  const totalRevenue = orderData
    ? orderData
        .filter(o => ['paid', 'success', 'completed'].includes(o.payment_status))
        .reduce((sum, o) => sum + (Number(o.total) || 0), 0)
    : 0;

  const pendingOrders = orderData
    ? orderData.filter(o => ['pending', 'processing'].includes(o.status)).length
    : 0;

  return {
    totalOrders,
    totalRevenue,
    pendingOrders,
    processingOrders: 0,
    shippedOrders: 0,
    deliveredOrders: 0,
    avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    lastOrderDate: null,
    refreshedAt: new Date().toISOString(),
  };
}

/**
 * Get recent orders from materialized view
 * Amazon-level optimization: Pre-joined data
 * @param {number} limit - Number of orders to fetch
 * @returns {Promise<Array>} Recent orders
 */
export async function getRecentOrdersEnterprise(limit = 10) {
  const startTime = performance.now();
  const cacheKey = `enterprise:recent:orders:${limit}`;

  try {
    // Try cache first
    const cached = inMemoryCache.get(cacheKey);
    if (cached) {
      const duration = performance.now() - startTime;
      console.log(`⚡ Recent Orders Cache HIT (${duration.toFixed(2)}ms)`);
      return cached;
    }

    // Query materialized view (pre-joined, extremely fast)
    const { data, error } = await supabase
      .from('recent_orders_view')
      .select('*')
      .limit(limit);

    if (error) {
      // Fallback to regular query if materialized view doesn't exist
      console.warn('Materialized view not found, using fallback query');
      return await getRecentOrdersFallback(limit);
    }

    // Transform to match expected format
    const orders = data.map(order => ({
      id: order.id,
      user_id: order.user_id,
      status: order.status,
      payment_status: order.payment_status,
      payment_method: order.payment_method,
      total: order.total,
      created_at: order.created_at,
      profiles: {
        email: order.user_email,
        full_name: order.user_name,
      },
    }));

    // Cache for 2 minutes
    inMemoryCache.set(cacheKey, orders, 120);

    const duration = performance.now() - startTime;
    console.log(`⚡ Recent Orders from Materialized View (${duration.toFixed(2)}ms)`);

    return orders;
  } catch (error) {
    console.error('❌ getRecentOrdersEnterprise error:', error);
    return await getRecentOrdersFallback(limit);
  }
}

/**
 * Fallback function for recent orders
 * @private
 */
async function getRecentOrdersFallback(limit) {
  console.log('⚠️ Using fallback query for recent orders (slower)');
  
  const { data } = await supabase
    .from('orders')
    .select(`
      id,
      user_id,
      status,
      payment_status,
      payment_method,
      total,
      created_at,
      profiles!orders_user_id_fkey (
        email,
        full_name
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  return data || [];
}

/**
 * Get total customer count (cached)
 * @returns {Promise<number>} Total customers
 */
export async function getTotalCustomersEnterprise() {
  const cacheKey = 'enterprise:customers:count';

  try {
    const cached = inMemoryCache.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Cache for 5 minutes
    inMemoryCache.set(cacheKey, count || 0, 300);

    return count || 0;
  } catch (error) {
    console.error('❌ getTotalCustomersEnterprise error:', error);
    return 0;
  }
}

/**
 * Refresh materialized views manually
 * Should be called after bulk data changes
 * @returns {Promise<boolean>} Success status
 */
export async function refreshDashboardViews() {
  try {
    const { error } = await supabase.rpc('refresh_dashboard_views');

    if (error) throw error;

    // Clear cache after refresh
    inMemoryCache.invalidatePattern('enterprise:*');

    console.log('✅ Dashboard views refreshed successfully');
    return true;
  } catch (error) {
    console.error('❌ refreshDashboardViews error:', error);
    return false;
  }
}

/**
 * Get complete dashboard data (all stats + recent orders)
 * Single function call for dashboard page
 * @returns {Promise<Object>} Complete dashboard data
 */
export async function getCompleteDashboardData() {
  const startTime = performance.now();

  try {
    // Fetch all data in parallel
    const [stats, recentOrders, totalCustomers] = await Promise.all([
      getDashboardStatsEnterprise(),
      getRecentOrdersEnterprise(5),
      getTotalCustomersEnterprise(),
    ]);

    const duration = performance.now() - startTime;
    console.log(`⚡ Complete Dashboard Data (${duration.toFixed(2)}ms)`);

    return {
      stats: {
        ...stats,
        totalCustomers,
      },
      recentOrders,
    };
  } catch (error) {
    console.error('❌ getCompleteDashboardData error:', error);
    throw error;
  }
}
