/**
 * CacheManager - Core caching logic with AsyncStorage
 * Phase 6: Offline Caching with Sync Queue
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CacheEntry, CacheKey } from './types';
import { CACHE_CONFIG, STORAGE_KEYS, MAX_CACHE_SIZE } from './constants';

/**
 * CacheManager handles low-level caching operations with AsyncStorage
 * Provides TTL-based expiration, versioning, and size management
 */
export class CacheManager {
  private static instance: CacheManager;
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private initialized: boolean = false;

  private constructor() {}

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Initialize the cache manager - load metadata and check version
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Check cache version for migrations
      const storedVersion = await AsyncStorage.getItem(STORAGE_KEYS.CACHE_VERSION);
      const currentVersion = CACHE_CONFIG.cacheVersion.toString();

      if (storedVersion !== currentVersion) {
        // Clear old cache if version mismatch
        await this.clearAll();
        await AsyncStorage.setItem(STORAGE_KEYS.CACHE_VERSION, currentVersion);
        console.log('[CacheManager] Cache cleared due to version upgrade');
      }

      this.initialized = true;
      console.log('[CacheManager] Initialized successfully');
    } catch (error) {
      console.error('[CacheManager] Initialization error:', error);
      // Continue even if initialization fails
      this.initialized = true;
    }
  }

  /**
   * Create a cache entry with TTL
   */
  private createEntry<T>(data: T, ttl: number): CacheEntry<T> {
    const now = Date.now();
    return {
      data,
      timestamp: now,
      expiresAt: now + ttl,
      version: CACHE_CONFIG.cacheVersion,
    };
  }

  /**
   * Check if a cache entry is expired
   */
  private isEntryExpired<T>(entry: CacheEntry<T>): boolean {
    return Date.now() > entry.expiresAt;
  }

  /**
   * Get data from cache (memory first, then storage)
   */
  async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && !this.isEntryExpired(memoryEntry)) {
      return memoryEntry.data as T;
    }

    // Check AsyncStorage
    try {
      const stored = await AsyncStorage.getItem(key);
      if (!stored) return null;

      const entry: CacheEntry<T> = JSON.parse(stored);

      // Check expiration
      if (this.isEntryExpired(entry)) {
        await this.remove(key);
        return null;
      }

      // Update memory cache
      this.memoryCache.set(key, entry);
      return entry.data;
    } catch (error) {
      console.error(`[CacheManager] Error getting ${key}:`, error);
      return null;
    }
  }

  /**
   * Get data with metadata (for stale-while-revalidate patterns)
   */
  async getWithMetadata<T>(key: string): Promise<{ data: T | null; isStale: boolean; timestamp: number | null }> {
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry) {
      return {
        data: memoryEntry.data as T,
        isStale: this.isEntryExpired(memoryEntry),
        timestamp: memoryEntry.timestamp,
      };
    }

    // Check AsyncStorage
    try {
      const stored = await AsyncStorage.getItem(key);
      if (!stored) {
        return { data: null, isStale: true, timestamp: null };
      }

      const entry: CacheEntry<T> = JSON.parse(stored);
      this.memoryCache.set(key, entry);

      return {
        data: entry.data,
        isStale: this.isEntryExpired(entry),
        timestamp: entry.timestamp,
      };
    } catch (error) {
      console.error(`[CacheManager] Error getting with metadata ${key}:`, error);
      return { data: null, isStale: true, timestamp: null };
    }
  }

  /**
   * Set data in cache with TTL
   */
  async set<T>(key: string, data: T, ttl: number = CACHE_CONFIG.defaultTTL): Promise<void> {
    const entry = this.createEntry(data, ttl);

    // Update memory cache
    this.memoryCache.set(key, entry);

    // Persist to AsyncStorage
    try {
      await AsyncStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      console.error(`[CacheManager] Error setting ${key}:`, error);
    }
  }

  /**
   * Remove data from cache
   */
  async remove(key: string): Promise<void> {
    this.memoryCache.delete(key);
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`[CacheManager] Error removing ${key}:`, error);
    }
  }

  /**
   * Set multiple items in cache (batch operation)
   */
  async setMany<T>(entries: Array<{ key: string; data: T; ttl?: number }>): Promise<void> {
    const pairs: [string, string][] = [];

    for (const { key, data, ttl } of entries) {
      const entry = this.createEntry(data, ttl ?? CACHE_CONFIG.defaultTTL);
      this.memoryCache.set(key, entry);
      pairs.push([key, JSON.stringify(entry)]);
    }

    try {
      await AsyncStorage.multiSet(pairs);
    } catch (error) {
      console.error('[CacheManager] Error setting multiple items:', error);
    }
  }

  /**
   * Get multiple items from cache
   */
  async getMany<T>(keys: string[]): Promise<Map<string, T | null>> {
    const result = new Map<string, T | null>();

    // Check memory cache first
    const missingKeys: string[] = [];
    for (const key of keys) {
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry && !this.isEntryExpired(memoryEntry)) {
        result.set(key, memoryEntry.data as T);
      } else {
        missingKeys.push(key);
      }
    }

    // Get missing from AsyncStorage
    if (missingKeys.length > 0) {
      try {
        const stored = await AsyncStorage.multiGet(missingKeys);
        for (const [key, value] of stored) {
          if (value) {
            try {
              const entry: CacheEntry<T> = JSON.parse(value);
              if (!this.isEntryExpired(entry)) {
                this.memoryCache.set(key, entry);
                result.set(key, entry.data);
              } else {
                result.set(key, null);
              }
            } catch {
              result.set(key, null);
            }
          } else {
            result.set(key, null);
          }
        }
      } catch (error) {
        console.error('[CacheManager] Error getting multiple items:', error);
        for (const key of missingKeys) {
          result.set(key, null);
        }
      }
    }

    return result;
  }

  /**
   * Clear all cache data
   */
  async clearAll(): Promise<void> {
    this.memoryCache.clear();

    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter((key) => key.startsWith('@totc/cache/'));
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
      console.log('[CacheManager] All cache cleared');
    } catch (error) {
      console.error('[CacheManager] Error clearing cache:', error);
    }
  }

  /**
   * Clear cache for a specific key pattern
   */
  async clearByPattern(pattern: string): Promise<void> {
    // Clear from memory cache
    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
      }
    }

    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const matchingKeys = allKeys.filter((key) => key.includes(pattern));
      if (matchingKeys.length > 0) {
        await AsyncStorage.multiRemove(matchingKeys);
      }
    } catch (error) {
      console.error('[CacheManager] Error clearing by pattern:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    memoryEntries: number;
    totalSize: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  }> {
    let totalSize = 0;
    let oldestEntry: number | null = null;
    let newestEntry: number | null = null;

    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter((key) => key.startsWith('@totc/cache/'));

      for (const key of cacheKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
          try {
            const entry: CacheEntry<any> = JSON.parse(value);
            if (!oldestEntry || entry.timestamp < oldestEntry) {
              oldestEntry = entry.timestamp;
            }
            if (!newestEntry || entry.timestamp > newestEntry) {
              newestEntry = entry.timestamp;
            }
          } catch {
            // Skip malformed entries
          }
        }
      }

      return {
        memoryEntries: this.memoryCache.size,
        totalSize,
        oldestEntry,
        newestEntry,
      };
    } catch (error) {
      console.error('[CacheManager] Error getting stats:', error);
      return {
        memoryEntries: this.memoryCache.size,
        totalSize: 0,
        oldestEntry: null,
        newestEntry: null,
      };
    }
  }

  /**
   * Prune expired entries from both memory and storage
   */
  async pruneExpired(): Promise<number> {
    let prunedCount = 0;

    // Prune memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (this.isEntryExpired(entry)) {
        this.memoryCache.delete(key);
        prunedCount++;
      }
    }

    // Prune AsyncStorage
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter((key) => key.startsWith('@totc/cache/'));
      const keysToRemove: string[] = [];

      for (const key of cacheKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          try {
            const entry: CacheEntry<any> = JSON.parse(value);
            if (this.isEntryExpired(entry)) {
              keysToRemove.push(key);
            }
          } catch {
            keysToRemove.push(key); // Remove malformed entries
          }
        }
      }

      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
        prunedCount += keysToRemove.length;
      }
    } catch (error) {
      console.error('[CacheManager] Error pruning expired entries:', error);
    }

    if (prunedCount > 0) {
      console.log(`[CacheManager] Pruned ${prunedCount} expired entries`);
    }

    return prunedCount;
  }

  /**
   * Invalidate and refresh cache for a key
   */
  async invalidate(key: string): Promise<void> {
    const entry = this.memoryCache.get(key);
    if (entry) {
      // Mark as expired but keep data for stale-while-revalidate
      entry.expiresAt = 0;
      this.memoryCache.set(key, entry);
    }
  }

  /**
   * Clear memory cache only (keep storage)
   */
  clearMemoryCache(): void {
    this.memoryCache.clear();
    console.log('[CacheManager] Memory cache cleared');
  }
}

// Export singleton instance
export const cacheManager = CacheManager.getInstance();
