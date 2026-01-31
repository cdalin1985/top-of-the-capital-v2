/**
 * SyncService - Orchestrates sync operations between local cache and Supabase
 * Phase 6: Offline Caching with Sync Queue
 */

import { supabase } from '../supabase';
import { syncQueue, SyncQueue } from './SyncQueue';
import { cacheManager, CacheManager } from './CacheManager';
import { SyncOperation, SyncResult, SyncTable, NetworkStatus } from './types';
import { CACHE_CONFIG, SYNC_BATCH_SIZE } from './constants';

type SyncEventType = 'sync_start' | 'sync_complete' | 'sync_error' | 'operation_complete' | 'operation_failed';
type SyncEventListener = (event: { type: SyncEventType; data?: any }) => void;

/**
 * SyncService coordinates syncing between local cache and the server
 * Handles retries, conflict resolution, and event notifications
 */
export class SyncService {
  private static instance: SyncService;
  private isSyncing: boolean = false;
  private networkStatus: NetworkStatus = { isConnected: true };
  private listeners: Set<SyncEventListener> = new Set();
  private retryTimeoutId: NodeJS.Timeout | null = null;
  private initialized: boolean = false;

  private constructor() {}

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  /**
   * Initialize the sync service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await cacheManager.initialize();
    await syncQueue.initialize();

    this.initialized = true;
    console.log('[SyncService] Initialized');
  }

  /**
   * Add event listener
   */
  addListener(listener: SyncEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit sync event
   */
  private emit(type: SyncEventType, data?: any): void {
    const event = { type, data };
    this.listeners.forEach((listener) => listener(event));
  }

  /**
   * Update network status
   */
  setNetworkStatus(status: NetworkStatus): void {
    const wasOffline = !this.networkStatus.isConnected;
    this.networkStatus = status;

    // Auto-sync when coming back online
    if (wasOffline && status.isConnected && syncQueue.hasPending()) {
      console.log('[SyncService] Back online, starting sync...');
      this.sync();
    }
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): {
    isSyncing: boolean;
    pendingCount: number;
    failedCount: number;
    isOnline: boolean;
  } {
    return {
      isSyncing: this.isSyncing,
      pendingCount: syncQueue.pendingCount,
      failedCount: syncQueue.failedCount,
      isOnline: this.networkStatus.isConnected,
    };
  }

  /**
   * Main sync function - process all pending operations
   */
  async sync(): Promise<{ success: boolean; processed: number; failed: number }> {
    if (this.isSyncing) {
      console.log('[SyncService] Sync already in progress');
      return { success: true, processed: 0, failed: 0 };
    }

    if (!this.networkStatus.isConnected) {
      console.log('[SyncService] Offline, skipping sync');
      return { success: false, processed: 0, failed: 0 };
    }

    this.isSyncing = true;
    this.emit('sync_start');

    let processed = 0;
    let failed = 0;

    try {
      // Process in batches
      while (syncQueue.hasPending()) {
        const batch = syncQueue.getNextBatch(SYNC_BATCH_SIZE);

        if (batch.length === 0) break;

        for (const operation of batch) {
          const result = await this.processOperation(operation);

          if (result.success) {
            processed++;
            this.emit('operation_complete', { operationId: operation.id });
          } else {
            failed++;
            this.emit('operation_failed', {
              operationId: operation.id,
              error: result.error,
            });
          }
        }

        // Small delay between batches to prevent overwhelming the server
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      this.emit('sync_complete', { processed, failed });
      console.log(`[SyncService] Sync complete: ${processed} processed, ${failed} failed`);

      // Clean up completed operations
      await syncQueue.clearCompleted();

      return { success: true, processed, failed };
    } catch (error) {
      console.error('[SyncService] Sync error:', error);
      this.emit('sync_error', { error });
      return { success: false, processed, failed };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Process a single sync operation
   */
  private async processOperation(operation: SyncOperation): Promise<SyncResult> {
    await syncQueue.updateStatus(operation.id, 'syncing');

    try {
      let response: any;

      switch (operation.operation) {
        case 'insert':
          response = await this.executeInsert(operation);
          break;
        case 'update':
          response = await this.executeUpdate(operation);
          break;
        case 'delete':
          response = await this.executeDelete(operation);
          break;
        case 'upsert':
          response = await this.executeUpsert(operation);
          break;
        default:
          throw new Error(`Unknown operation type: ${operation.operation}`);
      }

      if (response.error) {
        throw response.error;
      }

      await syncQueue.updateStatus(operation.id, 'completed');

      // Invalidate related cache
      await this.invalidateRelatedCache(operation.table, operation.data);

      return {
        success: true,
        operationId: operation.id,
        serverResponse: response.data,
      };
    } catch (error: any) {
      console.error(`[SyncService] Operation ${operation.id} failed:`, error);

      // Check if we should retry
      const canRetry = await syncQueue.incrementRetry(operation.id);

      if (canRetry) {
        // Schedule retry with exponential backoff
        const delay = CACHE_CONFIG.retryDelayBase * Math.pow(2, operation.retryCount);
        this.scheduleRetry(delay);
      } else {
        await syncQueue.updateStatus(operation.id, 'failed', error.message);
      }

      return {
        success: false,
        operationId: operation.id,
        error: error.message,
      };
    }
  }

  /**
   * Execute insert operation
   */
  private async executeInsert(operation: SyncOperation) {
    return supabase.from(operation.table).insert(operation.data);
  }

  /**
   * Execute update operation
   */
  private async executeUpdate(operation: SyncOperation) {
    const { id, ...updateData } = operation.data;
    return supabase.from(operation.table).update(updateData).eq('id', id);
  }

  /**
   * Execute delete operation
   */
  private async executeDelete(operation: SyncOperation) {
    return supabase.from(operation.table).delete().eq('id', operation.data.id);
  }

  /**
   * Execute upsert operation
   */
  private async executeUpsert(operation: SyncOperation) {
    return supabase.from(operation.table).upsert(operation.data);
  }

  /**
   * Invalidate cache after successful sync
   */
  private async invalidateRelatedCache(table: SyncTable, data: Record<string, any>): Promise<void> {
    try {
      // Invalidate the specific item
      if (data.id) {
        await cacheManager.invalidate(`@totc/cache/${table}/${data.id}`);
      }

      // Invalidate list caches
      await cacheManager.invalidate(`@totc/cache/${table}/list`);

      // Table-specific invalidations
      switch (table) {
        case 'challenges':
          // Invalidate related profiles' challenge lists
          if (data.challenger_id) {
            await cacheManager.invalidate(`@totc/cache/challenges/user/${data.challenger_id}`);
          }
          if (data.challenged_id) {
            await cacheManager.invalidate(`@totc/cache/challenges/user/${data.challenged_id}`);
          }
          break;
        case 'profiles':
          // Invalidate leaderboard cache
          await cacheManager.invalidate('@totc/cache/profiles/leaderboard');
          break;
        case 'activities':
          // Invalidate activity feed
          await cacheManager.invalidate('@totc/cache/activities/feed');
          break;
      }
    } catch (error) {
      console.error('[SyncService] Cache invalidation error:', error);
    }
  }

  /**
   * Schedule a retry after delay
   */
  private scheduleRetry(delay: number): void {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }

    this.retryTimeoutId = setTimeout(() => {
      if (this.networkStatus.isConnected && !this.isSyncing) {
        this.sync();
      }
    }, delay);
  }

  /**
   * Queue a new operation
   */
  async queueOperation(
    table: SyncTable,
    operation: 'insert' | 'update' | 'delete' | 'upsert',
    data: Record<string, any>,
    options?: { referenceId?: string; immediate?: boolean }
  ): Promise<string> {
    // Check for duplicates
    if (syncQueue.isDuplicate(table, operation, options?.referenceId)) {
      console.log('[SyncService] Duplicate operation skipped');
      return '';
    }

    const operationId = await syncQueue.add(
      table,
      operation,
      data,
      options?.referenceId
    );

    // Immediately sync if online and requested
    if (options?.immediate && this.networkStatus.isConnected) {
      this.sync();
    }

    return operationId;
  }

  /**
   * Retry all failed operations
   */
  async retryFailed(): Promise<void> {
    await syncQueue.retryFailed();
    if (this.networkStatus.isConnected) {
      this.sync();
    }
  }

  /**
   * Cancel a pending operation
   */
  async cancelOperation(operationId: string): Promise<boolean> {
    const operation = syncQueue.getById(operationId);
    if (operation && operation.status === 'pending') {
      await syncQueue.remove(operationId);
      return true;
    }
    return false;
  }

  /**
   * Get operations for a specific reference
   */
  getOperationsForReference(referenceId: string): SyncOperation[] {
    return syncQueue.getByReferenceId(referenceId);
  }

  /**
   * Force sync even if not connected (for testing)
   */
  async forceSync(): Promise<{ success: boolean; processed: number; failed: number }> {
    const originalStatus = this.networkStatus.isConnected;
    this.networkStatus.isConnected = true;
    const result = await this.sync();
    this.networkStatus.isConnected = originalStatus;
    return result;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
    this.listeners.clear();
  }
}

// Export singleton instance
export const syncService = SyncService.getInstance();
