/**
 * Query Performance Monitor
 * Tracks and logs slow database queries for performance optimization
 * @module utils/queryMonitor
 */

/**
 * @typedef {Object} QueryStatistics
 * @property {number} averageQueryTime - Average query execution time in ms
 * @property {Array<{query: string, duration: number, timestamp: Date}>} slowQueries - List of slow queries
 * @property {number} queryCount - Total number of queries executed
 */

class QueryMonitor {
  constructor() {
    this.queries = [];
    this.slowQueryThreshold = 100; // 100ms threshold as per requirements
    this.slowQueries = [];
    this.enabled = import.meta.env.MODE !== 'test'; // Disable in test mode
  }

  /**
   * Start monitoring a query
   * @param {string} queryName - Name/description of the query
   * @returns {Function} Function to call when query completes
   */
  startQuery(queryName) {
    if (!this.enabled) return () => {};

    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      this.recordQuery(queryName, duration);
    };
  }

  /**
   * Record a completed query
   * @param {string} queryName - Name/description of the query
   * @param {number} duration - Query duration in milliseconds
   */
  recordQuery(queryName, duration) {
    if (!this.enabled) return;

    const queryRecord = {
      query: queryName,
      duration: Math.round(duration * 100) / 100, // Round to 2 decimal places
      timestamp: new Date(),
    };

    this.queries.push(queryRecord);

    // Log slow queries
    if (duration > this.slowQueryThreshold) {
      this.logSlowQuery(queryRecord);
    }
  }

  /**
   * Log a slow query
   * @param {Object} queryRecord - Query record object
   */
  logSlowQuery(queryRecord) {
    this.slowQueries.push(queryRecord);

    console.warn(
      `🐌 Slow Query Detected (>${this.slowQueryThreshold}ms):`,
      {
        query: queryRecord.query,
        duration: `${queryRecord.duration}ms`,
        timestamp: queryRecord.timestamp.toISOString(),
      }
    );
  }

  /**
   * Get query statistics
   * @returns {QueryStatistics} Query statistics
   */
  getQueryStats() {
    if (this.queries.length === 0) {
      return {
        averageQueryTime: 0,
        slowQueries: this.slowQueries,
        queryCount: 0,
      };
    }

    const totalTime = this.queries.reduce((sum, q) => sum + q.duration, 0);
    const averageQueryTime =
      Math.round((totalTime / this.queries.length) * 100) / 100;

    return {
      averageQueryTime,
      slowQueries: [...this.slowQueries],
      queryCount: this.queries.length,
    };
  }

  /**
   * Reset all statistics
   */
  reset() {
    this.queries = [];
    this.slowQueries = [];
  }

  /**
   * Set the slow query threshold
   * @param {number} threshold - Threshold in milliseconds
   */
  setThreshold(threshold) {
    this.slowQueryThreshold = threshold;
  }

  /**
   * Enable or disable monitoring
   * @param {boolean} enabled - Whether monitoring is enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }
}

// Export singleton instance
export const queryMonitor = new QueryMonitor();

/**
 * Wrapper function to monitor async operations
 * @param {string} queryName - Name/description of the query
 * @param {Function} queryFn - Async function to execute
 * @returns {Promise<any>} Result of the query function
 */
export async function monitorQuery(queryName, queryFn) {
  const endMonitoring = queryMonitor.startQuery(queryName);

  try {
    const result = await queryFn();
    endMonitoring();
    return result;
  } catch (error) {
    endMonitoring();
    throw error;
  }
}
