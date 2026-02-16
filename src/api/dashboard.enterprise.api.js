/**
 * Enterprise-Level Dashboard API - Optimized & Bug-Fixed
 * Uses materialized views for Amazon-level performance
 * Improvements: Better error handling, faster timeouts, graceful degradation
 * @module api/dashboard.enterprise
 */

import { supabase } from '../lib/supabaseClient';
import { inMemoryCache } from '../services/InMemoryCacheService';
import { withRetry } from '../utils/apiClient';

// Cache TTL Configuration
const CACHE_TTL = {
  DASHBOARD_STATS: 60,      // 1 minute (materialized view refreshes every 5 min)
  RECENT_ORDERS: 120,       // 2 minutes
  CUSTOMER_COUNT: 300,      // 5 minutes
  COMPLETE_DASHBOARD: 90,   // 1.5 minutes
};

// Timeout Configuration (faster failures)
const TIMEOUTS = {
  MATERIALIZED_VIEW: 8000,  // 8 seconds for pre-computed data
  FALLBACK_QUERY: 15000,    // 15 seconds for aggregation queries
  REFRESH_VIEWS: 30000,     // 30 seconds for refresh operation
};

/**
 * Get dashboard statistics from materialized view
 * FIX: Added timeout, better error handling, stale-while-revalidate
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

    // FIX: Add timeout and retry logic for materialized view query
    const result = await withRetry(
      async () => {
        const { data, error } = await supabase
          .from('dashboard_stats')
          .select('*')
          .single();

        if (error) {
          // FIX: Specific error handling for missing materialized view
          if (error.code === '42P01' || error.message?.includes('does not exist')) {
            throw new Error('MATERIALIZED_VIEW_NOT_FOUND');
          }
          throw error;
        }

        if (!data) {
          throw new Error('No data returned from dashboard_stats view');
        }

        return data;
      },
      {
        maxRetries: 2,
        timeout: TIMEOUTS.MATERIALIZED_VIEW,
        retryDelay: 300,
        exponentialBackoff: true,
        deduplicationKey: cacheKey,
      }
    );

    // FIX: Safe data transformation with defaults
    const stats = {
      totalOrders: Number(result.total_orders) || 0,
      totalRevenue: Number(result.total_revenue) || 0,
      pendingOrders: Number(result.pending_orders) || 0,
      processingOrders: Number(result.processing_orders) || 0,
      shippedOrders: Number(result.shipped_orders) || 0,
      deliveredOrders: Number(result.delivered_orders) || 0,
      avgOrderValue: Number(result.avg_order_value) || 0,
      lastOrderDate: result.last_order_date || null,
      refreshedAt: result.refreshed_at || new Date().toISOString(),
      source: 'materialized_view', // FIX: Track data source
    };

    // Cache for 1 minute
    inMemoryCache.set(cacheKey, stats, CACHE_TTL.DASHBOARD_STATS);

    const duration = performance.now() - startTime;
    console.log(`⚡ Dashboard Stats from Materialized View (${duration.toFixed(2)}ms)`);

    return stats;
  } catch (error) {
    console.error('❌ getDashboardStatsEnterprise error:', error);

    // FIX: Return stale cache on error
    const staleCache = inMemoryCache.get(cacheKey, true);
    if (staleCache) {
      console.warn('⚠️ Returning stale dashboard stats cache');
      return { ...staleCache, stale: true };
    }

    // FIX: Fallback to regular query
    if (error.message === 'MATERIALIZED_VIEW_NOT_FOUND') {
      console.warn('⚠️ Materialized view not found, using fallback query');
      return await getDashboardStatsFallback();
    }

    // FIX: For other errors, try fallback
    console.warn('⚠️ Error fetching dashboard stats, trying fallback');
    return await getDashboardStatsFallback();
  }
}

/**
 * Fallback function if materialized view doesn't exist
 * FIX: Added timeout, better error handling, optimized query
 * @private
 */
async function getDashboardStatsFallback() {
  const startTime = performance.now();
  const cacheKey = 'enterprise:dashboard:stats:fallback';

  try {
    console.log('⚠️ Using fallback query (slower)');

    // FIX: Check if we have cached fallback data
    const cached = inMemoryCache.get(cacheKey);
    if (cached) {
      console.log('⚡ Using cached fallback data');
      return cached;
    }

    // FIX: Add timeout to prevent hanging
    const result = await withRetry(
      async () => {
        // FIX: Optimized query - only fetch needed fields
        const { data, error } = await supabase
          .from('orders')
          .select('total, payment_status, status, created_at');

        if (error) {
          throw new Error(error.message || 'Failed to fetch orders');
        }

        return data;
      },
      {
        maxRetries: 2,
        timeout: TIMEOUTS.FALLBACK_QUERY,
        retryDelay: 500,
        exponentialBackoff: true,
        deduplicationKey: cacheKey,
      }
    );

    const orderData = result || [];

    // FIX: Safer calculations with validation
    const paidStatuses = ['paid', 'success', 'completed'];
    const paidOrders = orderData.filter(o => 
      paidStatuses.includes(o.payment_status?.toLowerCase())
    );

    const totalOrders = orderData.length;
    const totalRevenue = paidOrders.reduce((sum, o) => {
      const amount = Number(o.total);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    // FIX: More accurate status counting
    const statusCounts = orderData.reduce((acc, o) => {
      const status = o.status?.toLowerCase() || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    // FIX: Find last order date safely
    const lastOrderDate = orderData.length > 0
      ? orderData
          .map(o => o.created_at)
          .filter(Boolean)
          .sort((a, b) => new Date(b) - new Date(a))[0] || null
      : null;

    const stats = {
      totalOrders,
      totalRevenue,
      pendingOrders: (statusCounts.pending || 0) + (statusCounts.payment_pending || 0),
      processingOrders: statusCounts.processing || 0,
      shippedOrders: statusCounts.shipped || 0,
      deliveredOrders: statusCounts.delivered || 0,
      avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      lastOrderDate,
      refreshedAt: new Date().toISOString(),
      source: 'fallback_query', // FIX: Track data source
    };

    // FIX: Cache fallback data for 2 minutes (less aggressive than materialized view)
    inMemoryCache.set(cacheKey, stats, 120);

    const duration = performance.now() - startTime;
    console.log(`⚡ Dashboard Stats from Fallback Query (${duration.toFixed(2)}ms)`);

    return stats;
  } catch (error) {
    console.error('❌ getDashboardStatsFallback error:', error);

    // FIX: Return safe empty state instead of throwing
    return {
      totalOrders: 0,
      totalRevenue: 0,
      pendingOrders: 0,
      processingOrders: 0,
      shippedOrders: 0,
      deliveredOrders: 0,
      avgOrderValue: 0,
      lastOrderDate: null,
      refreshedAt: new Date().toISOString(),
      source: 'empty_state',
      error: 'Failed to load dashboard statistics',
    };
  }
}

/**
 * Get recent orders from materialized view
 * FIX: Added timeout, better error handling, data validation
 * @param {number} limit - Number of orders to fetch
 * @returns {Promise<Array>} Recent orders
 */
export async function getRecentOrdersEnterprise(limit = 10) {
  const startTime = performance.now();
  const cacheKey = `enterprise:recent:orders:${limit}`;

  try {
    // FIX: Validate limit parameter
    const validLimit = Math.max(1, Math.min(limit, 100)); // Between 1-100

    // Try cache first
    const cached = inMemoryCache.get(cacheKey);
    if (cached) {
      const duration = performance.now() - startTime;
      console.log(`⚡ Recent Orders Cache HIT (${duration.toFixed(2)}ms)`);
      return cached;
    }

    // FIX: Add timeout and retry logic
    const result = await withRetry(
      async () => {
        const { data, error } = await supabase
          .from('recent_orders_view')
          .select('*')
          .limit(validLimit);

        if (error) {
          if (error.code === '42P01' || error.message?.includes('does not exist')) {
            throw new Error('MATERIALIZED_VIEW_NOT_FOUND');
          }
          throw error;
        }

        return data;
      },
      {
        maxRetries: 2,
        timeout: TIMEOUTS.MATERIALIZED_VIEW,
        retryDelay: 300,
        exponentialBackoff: true,
        deduplicationKey: cacheKey,
      }
    );

    const data = result || [];

    // FIX: Safe transformation with validation
    const orders = data.map(order => ({
      id: order.id || null,
      user_id: order.user_id || null,
      status: order.status || 'unknown',
      payment_status: order.payment_status || 'unknown',
      payment_method: order.payment_method || 'unknown',
      total: Number(order.total) || 0,
      created_at: order.created_at || new Date().toISOString(),
      profiles: {
        email: order.user_email || 'N/A',
        full_name: order.user_name || 'Unknown User',
      },
    }));

    // Cache for 2 minutes
    inMemoryCache.set(cacheKey, orders, CACHE_TTL.RECENT_ORDERS);

    const duration = performance.now() - startTime;
    console.log(`⚡ Recent Orders from Materialized View (${duration.toFixed(2)}ms) - ${orders.length} orders`);

    return orders;
  } catch (error) {
    console.error('❌ getRecentOrdersEnterprise error:', error);

    // FIX: Return stale cache on error
    const staleCache = inMemoryCache.get(cacheKey, true);
    if (staleCache) {
      console.warn('⚠️ Returning stale recent orders cache');
      return staleCache;
    }

    // FIX: Fallback to regular query
    if (error.message === 'MATERIALIZED_VIEW_NOT_FOUND') {
      console.warn('⚠️ Materialized view not found, using fallback query');
      return await getRecentOrdersFallback(limit);
    }

    // FIX: For other errors, try fallback
    console.warn('⚠️ Error fetching recent orders, trying fallback');
    return await getRecentOrdersFallback(limit);
  }
}

/**
 * Fallback function for recent orders
 * FIX: Added timeout, better error handling, optimized query
 * @private
 */
async function getRecentOrdersFallback(limit) {
  const startTime = performance.now();
  const cacheKey = `enterprise:recent:orders:fallback:${limit}`;

  try {
    console.log('⚠️ Using fallback query for recent orders (slower)');

    // FIX: Validate limit
    const validLimit = Math.max(1, Math.min(limit, 100));

    // FIX: Check cache for fallback data
    const cached = inMemoryCache.get(cacheKey);
    if (cached) {
      console.log('⚡ Using cached fallback orders');
      return cached;
    }

    // FIX: Add timeout to prevent hanging
    const result = await withRetry(
      async () => {
        const { data, error } = await supabase
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
          .limit(validLimit);

        if (error) {
          throw new Error(error.message || 'Failed to fetch recent orders');
        }

        return data;
      },
      {
        maxRetries: 2,
        timeout: TIMEOUTS.FALLBACK_QUERY,
        retryDelay: 500,
        exponentialBackoff: true,
        deduplicationKey: cacheKey,
      }
    );

    const orders = result || [];

    // FIX: Cache fallback data for 2 minutes
    inMemoryCache.set(cacheKey, orders, 120);

    const duration = performance.now() - startTime;
    console.log(`⚡ Recent Orders from Fallback Query (${duration.toFixed(2)}ms) - ${orders.length} orders`);

    return orders;
  } catch (error) {
    console.error('❌ getRecentOrdersFallback error:', error);

    // FIX: Return empty array instead of throwing
    return [];
  }
}

/**
 * Get total customer count (cached)
 * FIX: Added timeout, better error handling
 * @returns {Promise<number>} Total customers
 */
export async function getTotalCustomersEnterprise() {
  const cacheKey = 'enterprise:customers:count';

  try {
    // FIX: Check cache properly (handle 0 as valid value)
    const cached = inMemoryCache.get(cacheKey);
    if (cached !== null && cached !== undefined) {
      console.log('⚡ Customer Count Cache HIT');
      return cached;
    }

    // FIX: Add timeout to count query
    const result = await withRetry(
      async () => {
        const { count, error } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        if (error) {
          throw new Error(error.message || 'Failed to count customers');
        }

        return count;
      },
      {
        maxRetries: 2,
        timeout: 10000, // 10 seconds for count query
        retryDelay: 500,
        exponentialBackoff: true,
        deduplicationKey: cacheKey,
      }
    );

    const totalCustomers = Number(result) || 0;

    // Cache for 5 minutes
    inMemoryCache.set(cacheKey, totalCustomers, CACHE_TTL.CUSTOMER_COUNT);

    console.log(`⚡ Total Customers: ${totalCustomers}`);
    return totalCustomers;
  } catch (error) {
    console.error('❌ getTotalCustomersEnterprise error:', error);

    // FIX: Return stale cache or 0
    const staleCache = inMemoryCache.get(cacheKey, true);
    if (staleCache !== null && staleCache !== undefined) {
      console.warn('⚠️ Returning stale customer count cache');
      return staleCache;
    }

    return 0;
  }
}

/**
 * Refresh materialized views manually
 * FIX: Added timeout, better error handling, validation
 * @returns {Promise<Object>} Success status with details
 */
export async function refreshDashboardViews() {
  const startTime = performance.now();

  try {
    console.log('🔄 Refreshing dashboard materialized views...');

    // FIX: Add timeout for refresh operation
    const result = await withRetry(
      async () => {
        const { data, error } = await supabase.rpc('refresh_dashboard_views');

        if (error) {
          // FIX: Better error handling for missing function
          if (error.code === '42883' || error.message?.includes('does not exist')) {
            throw new Error('REFRESH_FUNCTION_NOT_FOUND');
          }
          throw error;
        }

        return data;
      },
      {
        maxRetries: 1, // Only retry once for refresh operations
        timeout: TIMEOUTS.REFRESH_VIEWS,
        retryDelay: 1000,
        exponentialBackoff: false,
        deduplicationKey: 'refresh-dashboard-views',
      }
    );

    // Clear cache after successful refresh
    inMemoryCache.invalidatePattern('enterprise:*');

    const duration = performance.now() - startTime;
    console.log(`✅ Dashboard views refreshed successfully (${duration.toFixed(2)}ms)`);

    return {
      success: true,
      duration: duration.toFixed(2),
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ refreshDashboardViews error:', error);

    // FIX: Provide detailed error information
    if (error.message === 'REFRESH_FUNCTION_NOT_FOUND') {
      return {
        success: false,
        error: 'Refresh function not found. Please create the refresh_dashboard_views() database function.',
        timestamp: new Date().toISOString(),
      };
    }

    if (error.message?.includes('timeout')) {
      return {
        success: false,
        error: 'Refresh operation timed out. The views may still be refreshing in the background.',
        timestamp: new Date().toISOString(),
      };
    }

    return {
      success: false,
      error: error.message || 'Failed to refresh dashboard views',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Get complete dashboard data (all stats + recent orders)
 * FIX: Better error handling, partial data return, performance tracking
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Complete dashboard data
 */
export async function getCompleteDashboardData(options = {}) {
  const startTime = performance.now();
  const {
    recentOrdersLimit = 5,
    includeCustomerCount = true,
  } = options;

  const cacheKey = `enterprise:complete:dashboard:${recentOrdersLimit}:${includeCustomerCount}`;

  try {
    // FIX: Check cache first
    const cached = inMemoryCache.get(cacheKey);
    if (cached) {
      const duration = performance.now() - startTime;
      console.log(`⚡ Complete Dashboard Cache HIT (${duration.toFixed(2)}ms)`);
      return cached;
    }

    // FIX: Fetch all data in parallel with individual error handling
    const results = await Promise.allSettled([
      getDashboardStatsEnterprise(),
      getRecentOrdersEnterprise(recentOrdersLimit),
      includeCustomerCount ? getTotalCustomersEnterprise() : Promise.resolve(0),
    ]);

    // FIX: Handle partial failures gracefully
    const stats = results[0].status === 'fulfilled' 
      ? results[0].value 
      : {
          totalOrders: 0,
          totalRevenue: 0,
          pendingOrders: 0,
          processingOrders: 0,
          shippedOrders: 0,
          deliveredOrders: 0,
          avgOrderValue: 0,
          lastOrderDate: null,
          refreshedAt: new Date().toISOString(),
          source: 'error_state',
          error: 'Failed to load statistics',
        };

    const recentOrders = results[1].status === 'fulfilled' 
      ? results[1].value 
      : [];

    const totalCustomers = results[2].status === 'fulfilled' 
      ? results[2].value 
      : 0;

    // FIX: Track which queries succeeded/failed
    const failedQueries = results
      .map((result, index) => {
        if (result.status === 'rejected') {
          return ['stats', 'orders', 'customers'][index];
        }
        return null;
      })
      .filter(Boolean);

    if (failedQueries.length > 0) {
      console.warn(`⚠️ Some dashboard queries failed: ${failedQueries.join(', ')}`);
    }

    const dashboardData = {
      stats: {
        ...stats,
        totalCustomers,
      },
      recentOrders,
      metadata: {
        loadedAt: new Date().toISOString(),
        partialData: failedQueries.length > 0,
        failedQueries,
      },
    };

    // FIX: Only cache if we have complete data
    if (failedQueries.length === 0) {
      inMemoryCache.set(cacheKey, dashboardData, CACHE_TTL.COMPLETE_DASHBOARD);
    }

    const duration = performance.now() - startTime;
    console.log(`⚡ Complete Dashboard Data (${duration.toFixed(2)}ms)`);

    return dashboardData;
  } catch (error) {
    console.error('❌ getCompleteDashboardData error:', error);

    // FIX: Return stale cache on complete failure
    const staleCache = inMemoryCache.get(cacheKey, true);
    if (staleCache) {
      console.warn('⚠️ Returning stale complete dashboard cache');
      return {
        ...staleCache,
        metadata: {
          ...staleCache.metadata,
          stale: true,
        },
      };
    }

    // FIX: Return safe empty state
    return {
      stats: {
        totalOrders: 0,
        totalRevenue: 0,
        pendingOrders: 0,
        processingOrders: 0,
        shippedOrders: 0,
        deliveredOrders: 0,
        avgOrderValue: 0,
        lastOrderDate: null,
        refreshedAt: new Date().toISOString(),
        totalCustomers: 0,
        source: 'error_state',
      },
      recentOrders: [],
      metadata: {
        loadedAt: new Date().toISOString(),
        partialData: true,
        error: 'Failed to load dashboard data',
      },
    };
  }
}

/**
 * FIX: New utility to check materialized view health
 * Helps diagnose issues with materialized views
 * @returns {Promise<Object>} Health status of materialized views
 */
export async function checkMaterializedViewHealth() {
  const views = ['dashboard_stats', 'recent_orders_view'];
  const results = {};

  for (const viewName of views) {
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Health check timeout')), 5000)
      );

      const checkPromise = supabase
        .from(viewName)
        .select('*', { count: 'exact', head: true });

      const { count, error } = await Promise.race([checkPromise, timeoutPromise]);

      results[viewName] = {
        exists: !error,
        error: error?.message || null,
        recordCount: count || 0,
        healthy: !error && count !== null,
      };
    } catch (error) {
      results[viewName] = {
        exists: false,
        error: error.message,
        recordCount: 0,
        healthy: false,
      };
    }
  }

  // Check if refresh function exists
  try {
    const { error } = await supabase.rpc('refresh_dashboard_views');
    results.refresh_function = {
      exists: !error || error.code !== '42883',
      healthy: !error,
      error: error?.message || null,
    };
  } catch (error) {
    results.refresh_function = {
      exists: false,
      healthy: false,
      error: error.message,
    };
  }

  const overallHealth = Object.values(results).every(r => r.healthy);

  console.log(overallHealth 
    ? '✅ All materialized views are healthy' 
    : '⚠️ Some materialized views have issues'
  );

  return {
    healthy: overallHealth,
    views: results,
    timestamp: new Date().toISOString(),
  };
}

/**
 * FIX: New utility to clear all dashboard caches
 * Useful for testing or after manual data updates
 */
export function clearDashboardCache() {
  inMemoryCache.invalidatePattern('enterprise:*');
  console.log('🗑️ Dashboard cache cleared');
}

/**
 * FIX: Export cache utilities
 */
export const dashboardCacheUtils = {
  clear: clearDashboardCache,
  clearStats: () => {
    inMemoryCache.invalidatePattern('enterprise:dashboard:stats*');
    console.log('🗑️ Dashboard stats cache cleared');
  },
  clearOrders: () => {
    inMemoryCache.invalidatePattern('enterprise:recent:orders*');
    console.log('🗑️ Recent orders cache cleared');
  },
  clearCustomers: () => {
    inMemoryCache.del('enterprise:customers:count');
    console.log('🗑️ Customer count cache cleared');
  },
};

// FIX: Export configuration for external monitoring
export const dashboardConfig = {
  cacheTTL: CACHE_TTL,
  timeouts: TIMEOUTS,
};