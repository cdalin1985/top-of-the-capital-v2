/**
 * Sync Store - Zustand store for sync state management
 * Phase 6: Offline Caching with Sync Queue
 */

import { create } from 'zustand';
import { syncQueue } from '../lib/cache/SyncQueue';
import { syncService } from '../lib/cache/SyncService';
import { SyncOperation } from '../lib/cache/types';

interface SyncState {
  // Sync status
  isSyncing: boolean;
  isOnline: boolean;
  lastSyncedAt: number | null;
  syncError: string | null;

  // Queue info
  pendingCount: number;
  failedCount: number;
  operations: SyncOperation[];

  // Actions
  setOnline: (isOnline: boolean) => void;
  setSyncing: (isSyncing: boolean) => void;
  setLastSyncedAt: (timestamp: number) => void;
  setSyncError: (error: string | null) => void;
  refreshQueueInfo: () => void;

  // Sync actions
  triggerSync: () => Promise<{ success: boolean; processed: number; failed: number }>;
  retryFailed: () => Promise<void>;
  clearCompleted: () => Promise<void>;

  // Initialize
  initialize: () => Promise<void>;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  // Initial state
  isSyncing: false,
  isOnline: true,
  lastSyncedAt: null,
  syncError: null,
  pendingCount: 0,
  failedCount: 0,
  operations: [],

  // Set online status
  setOnline: (isOnline: boolean) => {
    set({ isOnline });
    syncService.setNetworkStatus({ isConnected: isOnline });

    // Auto-sync when coming back online
    if (isOnline && get().pendingCount > 0) {
      get().triggerSync();
    }
  },

  // Set syncing status
  setSyncing: (isSyncing: boolean) => {
    set({ isSyncing });
  },

  // Set last synced timestamp
  setLastSyncedAt: (timestamp: number) => {
    set({ lastSyncedAt: timestamp });
  },

  // Set sync error
  setSyncError: (error: string | null) => {
    set({ syncError: error });
  },

  // Refresh queue info from SyncQueue
  refreshQueueInfo: () => {
    const operations = syncQueue.getAll();
    const pendingCount = syncQueue.pendingCount;
    const failedCount = syncQueue.failedCount;

    set({ operations, pendingCount, failedCount });
  },

  // Trigger a sync
  triggerSync: async () => {
    if (!get().isOnline) {
      return { success: false, processed: 0, failed: 0 };
    }

    set({ isSyncing: true, syncError: null });

    try {
      const result = await syncService.sync();

      set({
        isSyncing: false,
        lastSyncedAt: Date.now(),
        syncError: result.success ? null : 'Some operations failed',
      });

      get().refreshQueueInfo();

      return result;
    } catch (error: any) {
      set({
        isSyncing: false,
        syncError: error.message || 'Sync failed',
      });

      return { success: false, processed: 0, failed: 0 };
    }
  },

  // Retry failed operations
  retryFailed: async () => {
    await syncService.retryFailed();
    get().refreshQueueInfo();

    if (get().isOnline) {
      get().triggerSync();
    }
  },

  // Clear completed operations
  clearCompleted: async () => {
    await syncQueue.clearCompleted();
    get().refreshQueueInfo();
  },

  // Initialize the store
  initialize: async () => {
    await syncService.initialize();

    // Set up sync event listener
    syncService.addListener((event) => {
      switch (event.type) {
        case 'sync_start':
          set({ isSyncing: true });
          break;
        case 'sync_complete':
          set({
            isSyncing: false,
            lastSyncedAt: Date.now(),
          });
          get().refreshQueueInfo();
          break;
        case 'sync_error':
          set({
            isSyncing: false,
            syncError: event.data?.error?.message || 'Sync error',
          });
          break;
        case 'operation_complete':
        case 'operation_failed':
          get().refreshQueueInfo();
          break;
      }
    });

    // Set up queue change listener
    syncQueue.addListener(() => {
      get().refreshQueueInfo();
    });

    // Initial refresh
    get().refreshQueueInfo();
  },
}));
