/**
 * BaseService - Common service patterns for data services
 * Phase 6: Offline Caching with Sync Queue
 */

import { cacheManager } from '../cache/CacheManager';
import { syncService } from '../cache/SyncService';
import { SyncTable } from '../cache/types';
import { CACHE_CONFIG } from '../cache/constants';

export interface FetchOptions {
  forceRefresh?: boolean;
  useStale?: boolean;
}

export interface ServiceResult<T> {
  data: T | null;
  error: Error | null;
  fromCache: boolean;
  isStale: boolean;
}

/**
 * BaseService provides common caching and sync patterns
 * Extended by specific data services (Profile, Challenge, etc.)
 */
export abstract class BaseService<T> {
  protected abstract table: SyncTable;
  protected abstract cachePrefix: string;
  protected abstract defaultTTL: number;

  /**
   * Get cache key for an item
   */
  protected getCacheKey(id: string): string {
    return `@totc/cache/${this.cachePrefix}/${id}`;
  }

  /**
   * Get cache key for list
   */
  protected getListCacheKey(suffix?: string): string {
    return `@totc/cache/${this.cachePrefix}/list${suffix ? `/${suffix}` : ''}`;
  }

  /**
   * Fetch single item - try cache first, then network
   */
  protected async fetchWithCache<R>(
    cacheKey: string,
    fetcher: () => Promise<{ data: R | null; error: any }>,
    options: FetchOptions = {}
  ): Promise<ServiceResult<R>> {
    // Try cache first (unless forcing refresh)
    if (!options.forceRefresh) {
      const cached = await cacheManager.getWithMetadata<R>(cacheKey);

      if (cached.data !== null) {
        // Return cached data if not expired, or if using stale
        if (!cached.isStale || options.useStale) {
          return {
            data: cached.data,
            error: null,
            fromCache: true,
            isStale: cached.isStale,
          };
        }
      }
    }

    // Fetch from network
    try {
      const { data, error } = await fetcher();

      if (error) {
        // On error, try to return stale cache
        const stale = await cacheManager.get<R>(cacheKey);
        if (stale) {
          return {
            data: stale,
            error: new Error(error.message),
            fromCache: true,
            isStale: true,
          };
        }
        return {
          data: null,
          error: new Error(error.message),
          fromCache: false,
          isStale: false,
        };
      }

      // Cache the new data
      if (data) {
        await cacheManager.set(cacheKey, data, this.defaultTTL);
      }

      return {
        data,
        error: null,
        fromCache: false,
        isStale: false,
      };
    } catch (error: any) {
      // Network failure - try stale cache
      const stale = await cacheManager.get<R>(cacheKey);
      return {
        data: stale,
        error: error,
        fromCache: stale !== null,
        isStale: true,
      };
    }
  }

  /**
   * Update with optimistic caching
   */
  protected async updateWithOptimisticCache(
    id: string,
    data: Partial<T>,
    updater: () => Promise<{ data: T | null; error: any }>
  ): Promise<ServiceResult<T>> {
    const cacheKey = this.getCacheKey(id);

    // Get current cached value
    const currentValue = await cacheManager.get<T>(cacheKey);

    // Optimistically update cache
    if (currentValue) {
      const optimisticValue = { ...currentValue, ...data };
      await cacheManager.set(cacheKey, optimisticValue, this.defaultTTL);
    }

    // Queue the operation for sync
    await syncService.queueOperation(
      this.table,
      'update',
      { id, ...data },
      { immediate: true }
    );

    // Try to execute immediately
    try {
      const { data: serverData, error } = await updater();

      if (error) {
        // Revert optimistic update on error
        if (currentValue) {
          await cacheManager.set(cacheKey, currentValue, this.defaultTTL);
        }
        return {
          data: currentValue,
          error: new Error(error.message),
          fromCache: true,
          isStale: true,
        };
      }

      // Update cache with server response
      if (serverData) {
        await cacheManager.set(cacheKey, serverData, this.defaultTTL);
      }

      return {
        data: serverData,
        error: null,
        fromCache: false,
        isStale: false,
      };
    } catch (error: any) {
      // Network error - operation is queued, return optimistic value
      return {
        data: currentValue ? { ...currentValue, ...data } as T : null,
        error: error,
        fromCache: true,
        isStale: true,
      };
    }
  }

  /**
   * Insert with cache update
   */
  protected async insertWithCache(
    data: Partial<T>,
    inserter: () => Promise<{ data: T | null; error: any }>
  ): Promise<ServiceResult<T>> {
    // Queue the operation
    await syncService.queueOperation(this.table, 'insert', data as Record<string, any>, {
      immediate: true,
    });

    try {
      const { data: serverData, error } = await inserter();

      if (error) {
        return {
          data: null,
          error: new Error(error.message),
          fromCache: false,
          isStale: false,
        };
      }

      // Cache the new item
      if (serverData && (serverData as any).id) {
        const cacheKey = this.getCacheKey((serverData as any).id);
        await cacheManager.set(cacheKey, serverData, this.defaultTTL);
      }

      // Invalidate list caches
      await cacheManager.clearByPattern(`${this.cachePrefix}/list`);

      return {
        data: serverData,
        error: null,
        fromCache: false,
        isStale: false,
      };
    } catch (error: any) {
      // Network error - operation is queued
      return {
        data: data as T,
        error: error,
        fromCache: false,
        isStale: true,
      };
    }
  }

  /**
   * Delete with cache invalidation
   */
  protected async deleteWithCache(
    id: string,
    deleter: () => Promise<{ error: any }>
  ): Promise<{ success: boolean; error: Error | null }> {
    const cacheKey = this.getCacheKey(id);

    // Remove from cache immediately
    await cacheManager.remove(cacheKey);

    // Queue the operation
    await syncService.queueOperation(this.table, 'delete', { id }, { immediate: true });

    try {
      const { error } = await deleter();

      if (error) {
        return {
          success: false,
          error: new Error(error.message),
        };
      }

      // Invalidate list caches
      await cacheManager.clearByPattern(`${this.cachePrefix}/list`);

      return {
        success: true,
        error: null,
      };
    } catch (error: any) {
      // Network error - operation is queued, consider it pending success
      return {
        success: true,
        error: null,
      };
    }
  }

  /**
   * Invalidate cache for this service
   */
  async invalidateCache(): Promise<void> {
    await cacheManager.clearByPattern(this.cachePrefix);
  }
}
