/**
 * useSyncStatus - Hook for monitoring sync status
 * Phase 6: Offline Caching with Sync Queue
 */

import { useCallback, useMemo } from 'react';
import { useSyncStore } from '../store/useSyncStore';

export interface SyncStatus {
  // Status flags
  isOnline: boolean;
  isSyncing: boolean;
  hasPendingOperations: boolean;
  hasFailedOperations: boolean;

  // Counts
  pendingCount: number;
  failedCount: number;

  // Timestamps
  lastSyncedAt: Date | null;
  timeSinceLastSync: number | null; // in milliseconds

  // Error info
  syncError: string | null;

  // Status summary
  statusText: string;
  statusType: 'synced' | 'syncing' | 'pending' | 'offline' | 'error';
}

export function useSyncStatus(): SyncStatus {
  const {
    isOnline,
    isSyncing,
    pendingCount,
    failedCount,
    lastSyncedAt,
    syncError,
  } = useSyncStore();

  const hasPendingOperations = pendingCount > 0;
  const hasFailedOperations = failedCount > 0;

  const lastSyncedAtDate = useMemo(
    () => (lastSyncedAt ? new Date(lastSyncedAt) : null),
    [lastSyncedAt]
  );

  const timeSinceLastSync = useMemo(
    () => (lastSyncedAt ? Date.now() - lastSyncedAt : null),
    [lastSyncedAt]
  );

  // Determine status type and text
  const { statusText, statusType } = useMemo((): {
    statusText: string;
    statusType: SyncStatus['statusType'];
  } => {
    if (!isOnline) {
      const pendingText = pendingCount > 0 ? ` (${pendingCount} pending)` : '';
      return {
        statusText: `Offline${pendingText}`,
        statusType: 'offline',
      };
    }

    if (syncError && failedCount > 0) {
      return {
        statusText: `${failedCount} operation${failedCount !== 1 ? 's' : ''} failed`,
        statusType: 'error',
      };
    }

    if (isSyncing) {
      return {
        statusText: 'Syncing...',
        statusType: 'syncing',
      };
    }

    if (pendingCount > 0) {
      return {
        statusText: `${pendingCount} change${pendingCount !== 1 ? 's' : ''} pending`,
        statusType: 'pending',
      };
    }

    return {
      statusText: 'All changes synced',
      statusType: 'synced',
    };
  }, [isOnline, isSyncing, pendingCount, failedCount, syncError]);

  return {
    isOnline,
    isSyncing,
    hasPendingOperations,
    hasFailedOperations,
    pendingCount,
    failedCount,
    lastSyncedAt: lastSyncedAtDate,
    timeSinceLastSync,
    syncError,
    statusText,
    statusType,
  };
}

/**
 * useSyncActions - Hook for sync actions
 */
export function useSyncActions() {
  const { triggerSync, retryFailed, clearCompleted, setOnline } = useSyncStore();

  const sync = useCallback(async () => {
    return triggerSync();
  }, [triggerSync]);

  const retry = useCallback(async () => {
    return retryFailed();
  }, [retryFailed]);

  const clear = useCallback(async () => {
    return clearCompleted();
  }, [clearCompleted]);

  const updateOnlineStatus = useCallback(
    (isOnline: boolean) => {
      setOnline(isOnline);
    },
    [setOnline]
  );

  return {
    sync,
    retry,
    clear,
    updateOnlineStatus,
  };
}
