import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { WifiOff, RefreshCw, AlertCircle, CheckCircle, Cloud } from 'lucide-react-native';
import { useSyncStatus, useSyncActions } from '../hooks/useSyncStatus';

/**
 * OfflineBanner - Shows network and sync status
 * Phase 6: Updated to show sync queue status
 */
export function OfflineBanner() {
  const { isOnline, statusType, statusText, pendingCount, failedCount } = useSyncStatus();

  // Don't show banner when online and synced
  if (isOnline && statusType === 'synced') {
    return null;
  }

  return (
    <View style={[styles.banner, styles[statusType]]}>
      <StatusIcon statusType={statusType} />
      <Text style={styles.text}>{statusText}</Text>
      {statusType === 'error' && <RetryButton />}
    </View>
  );
}

/**
 * Expanded sync status banner with more details
 */
export function SyncStatusBanner() {
  const {
    isOnline,
    isSyncing,
    statusType,
    statusText,
    pendingCount,
    failedCount,
    lastSyncedAt,
  } = useSyncStatus();
  const { sync, retry } = useSyncActions();

  const getLastSyncText = () => {
    if (!lastSyncedAt) return 'Never synced';
    const seconds = Math.floor((Date.now() - lastSyncedAt.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return lastSyncedAt.toLocaleDateString();
  };

  return (
    <View style={[styles.expandedBanner, styles[statusType]]}>
      <View style={styles.expandedHeader}>
        <View style={styles.expandedLeft}>
          <StatusIcon statusType={statusType} />
          <View style={styles.expandedTextContainer}>
            <Text style={styles.expandedTitle}>{statusText}</Text>
            <Text style={styles.expandedSubtitle}>
              Last synced: {getLastSyncText()}
            </Text>
          </View>
        </View>
        {!isSyncing && isOnline && (pendingCount > 0 || failedCount > 0) && (
          <TouchableOpacity
            style={styles.syncButton}
            onPress={() => (failedCount > 0 ? retry() : sync())}
          >
            <RefreshCw color="#fff" size={18} />
          </TouchableOpacity>
        )}
      </View>

      {(pendingCount > 0 || failedCount > 0) && (
        <View style={styles.statsRow}>
          {pendingCount > 0 && (
            <View style={styles.statItem}>
              <Cloud color="#fff" size={14} />
              <Text style={styles.statText}>{pendingCount} pending</Text>
            </View>
          )}
          {failedCount > 0 && (
            <View style={styles.statItem}>
              <AlertCircle color="#fff" size={14} />
              <Text style={styles.statText}>{failedCount} failed</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

/**
 * Minimal sync indicator (for headers)
 */
export function SyncIndicator() {
  const { statusType, isSyncing, pendingCount } = useSyncStatus();

  if (statusType === 'synced') {
    return null;
  }

  return (
    <View style={styles.indicator}>
      {isSyncing ? (
        <ActivityIndicator size="small" color="#6c757d" />
      ) : statusType === 'offline' ? (
        <WifiOff color="#dc3545" size={16} />
      ) : statusType === 'error' ? (
        <AlertCircle color="#dc3545" size={16} />
      ) : pendingCount > 0 ? (
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * Status icon component
 */
function StatusIcon({ statusType }: { statusType: string }) {
  switch (statusType) {
    case 'offline':
      return <WifiOff color="#fff" size={16} />;
    case 'syncing':
      return <ActivityIndicator size="small" color="#fff" />;
    case 'error':
      return <AlertCircle color="#fff" size={16} />;
    case 'pending':
      return <Cloud color="#fff" size={16} />;
    case 'synced':
      return <CheckCircle color="#fff" size={16} />;
    default:
      return null;
  }
}

/**
 * Retry button component
 */
function RetryButton() {
  const { retry } = useSyncActions();

  return (
    <TouchableOpacity style={styles.retryButton} onPress={retry}>
      <RefreshCw color="#fff" size={14} />
      <Text style={styles.retryText}>Retry</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Basic banner styles
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Status-based colors
  offline: {
    backgroundColor: '#dc3545',
  },
  syncing: {
    backgroundColor: '#0d6efd',
  },
  error: {
    backgroundColor: '#dc3545',
  },
  pending: {
    backgroundColor: '#ffc107',
  },
  synced: {
    backgroundColor: '#198754',
  },

  // Retry button
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginLeft: 12,
  },
  retryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },

  // Expanded banner styles
  expandedBanner: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  expandedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  expandedTextContainer: {
    marginLeft: 12,
  },
  expandedTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  expandedSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  syncButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 20,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    marginLeft: 6,
  },

  // Indicator styles (minimal)
  indicator: {
    padding: 4,
  },
  pendingBadge: {
    backgroundColor: '#ffc107',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  pendingBadgeText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '700',
  },
});
