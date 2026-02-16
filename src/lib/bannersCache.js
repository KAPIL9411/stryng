/**
 * Banner Caching System
 * Multi-layer caching for instant banner loading
 * 
 * Layers:
 * 1. Memory Cache (instant)
 * 2. LocalStorage Cache (very fast)
 * 3. IndexedDB Cache (fast, large storage)
 * 4. Database (fallback)
 */

const CACHE_KEY = 'stryng_banners_cache';
const CACHE_VERSION = 'v1';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

class BannersCache {
  constructor() {
    this.memoryCache = null;
    this.memoryCacheTime = null;
  }

  /**
   * Get cache key with version
   */
  getCacheKey() {
    return `${CACHE_KEY}_${CACHE_VERSION}`;
  }

  /**
   * Check if cache is valid
   */
  isCacheValid(timestamp) {
    if (!timestamp) return false;
    return Date.now() - timestamp < CACHE_DURATION;
  }

  /**
   * Get from memory cache (fastest)
   */
  getFromMemory() {
    if (this.memoryCache && this.isCacheValid(this.memoryCacheTime)) {
      console.log('✅ Banners loaded from MEMORY cache (instant)');
      return this.memoryCache;
    }
    return null;
  }

  /**
   * Get from localStorage (very fast)
   */
  getFromLocalStorage() {
    try {
      const cached = localStorage.getItem(this.getCacheKey());
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      
      if (this.isCacheValid(timestamp)) {
        console.log('✅ Banners loaded from LOCALSTORAGE cache (very fast)');
        // Update memory cache
        this.memoryCache = data;
        this.memoryCacheTime = timestamp;
        return data;
      }
    } catch (error) {
      console.warn('LocalStorage cache read error:', error);
    }
    return null;
  }

  /**
   * Get from IndexedDB (fast, for larger data)
   */
  async getFromIndexedDB() {
    try {
      if (!('indexedDB' in window)) return null;

      return new Promise((resolve) => {
        const request = indexedDB.open('StryngCache', 1);

        request.onerror = () => resolve(null);

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains('banners')) {
            db.createObjectStore('banners');
          }
        };

        request.onsuccess = (event) => {
          const db = event.target.result;
          
          if (!db.objectStoreNames.contains('banners')) {
            resolve(null);
            return;
          }

          const transaction = db.transaction(['banners'], 'readonly');
          const store = transaction.objectStore('banners');
          const getRequest = store.get(this.getCacheKey());

          getRequest.onsuccess = () => {
            const cached = getRequest.result;
            if (cached && this.isCacheValid(cached.timestamp)) {
              console.log('✅ Banners loaded from INDEXEDDB cache (fast)');
              // Update memory and localStorage
              this.memoryCache = cached.data;
              this.memoryCacheTime = cached.timestamp;
              this.saveToLocalStorage(cached.data, cached.timestamp);
              resolve(cached.data);
            } else {
              resolve(null);
            }
          };

          getRequest.onerror = () => resolve(null);
        };
      });
    } catch (error) {
      console.warn('IndexedDB cache read error:', error);
      return null;
    }
  }

  /**
   * Get banners from cache (tries all layers)
   */
  async get() {
    // Try memory cache first (instant)
    const memoryData = this.getFromMemory();
    if (memoryData) return memoryData;

    // Try localStorage (very fast)
    const localData = this.getFromLocalStorage();
    if (localData) return localData;

    // Try IndexedDB (fast)
    const indexedData = await this.getFromIndexedDB();
    if (indexedData) return indexedData;

    return null;
  }

  /**
   * Save to localStorage
   */
  saveToLocalStorage(data, timestamp = Date.now()) {
    try {
      localStorage.setItem(
        this.getCacheKey(),
        JSON.stringify({ data, timestamp })
      );
    } catch (error) {
      console.warn('LocalStorage cache write error:', error);
    }
  }

  /**
   * Save to IndexedDB
   */
  async saveToIndexedDB(data, timestamp = Date.now()) {
    try {
      if (!('indexedDB' in window)) return;

      return new Promise((resolve) => {
        const request = indexedDB.open('StryngCache', 1);

        request.onerror = () => resolve();

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains('banners')) {
            db.createObjectStore('banners');
          }
        };

        request.onsuccess = (event) => {
          const db = event.target.result;
          const transaction = db.transaction(['banners'], 'readwrite');
          const store = transaction.objectStore('banners');
          
          store.put({ data, timestamp }, this.getCacheKey());
          
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => resolve();
        };
      });
    } catch (error) {
      console.warn('IndexedDB cache write error:', error);
    }
  }

  /**
   * Save to all cache layers
   */
  async set(data) {
    const timestamp = Date.now();

    // Save to memory (instant)
    this.memoryCache = data;
    this.memoryCacheTime = timestamp;

    // Save to localStorage (very fast)
    this.saveToLocalStorage(data, timestamp);

    // Save to IndexedDB (async, doesn't block)
    this.saveToIndexedDB(data, timestamp);

    console.log('✅ Banners cached in all layers');
  }

  /**
   * Clear all caches
   */
  async clear() {
    // Clear memory
    this.memoryCache = null;
    this.memoryCacheTime = null;

    // Clear localStorage
    try {
      localStorage.removeItem(this.getCacheKey());
    } catch (error) {
      console.warn('LocalStorage clear error:', error);
    }

    // Clear IndexedDB
    try {
      if (!('indexedDB' in window)) return;

      return new Promise((resolve) => {
        const request = indexedDB.open('StryngCache', 1);

        request.onsuccess = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains('banners')) {
            resolve();
            return;
          }

          const transaction = db.transaction(['banners'], 'readwrite');
          const store = transaction.objectStore('banners');
          store.delete(this.getCacheKey());
          
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => resolve();
        };

        request.onerror = () => resolve();
      });
    } catch (error) {
      console.warn('IndexedDB clear error:', error);
    }

    console.log('✅ All banner caches cleared');
  }

  /**
   * Preload images for instant display
   */
  preloadImages(banners) {
    if (!banners || !Array.isArray(banners)) return;

    banners.forEach((banner) => {
      if (banner.image_url) {
        const img = new Image();
        img.src = banner.image_url;
      }
    });

    console.log(`✅ Preloaded ${banners.length} banner images`);
  }
}

// Export singleton instance
export const bannersCache = new BannersCache();

// Export helper functions
export const getCachedBanners = () => bannersCache.get();
export const setCachedBanners = (data) => bannersCache.set(data);
export const clearBannersCache = () => bannersCache.clear();
export const preloadBannerImages = (banners) => bannersCache.preloadImages(banners);
