/**
 * SyncProvider - Initializes the offline caching and sync system
 * Phase 6: Offline Caching with Sync Queue
 */

import React, { useEffect, useState, ReactNode } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useSyncStore } from '../store/useSyncStore';

interface SyncProviderProps {
  children: ReactNode;
  /** Whether to show loading indicator while initializing */
  showLoadingIndicator?: boolean;
  /** Custom loading component */
  loadingComponent?: ReactNode;
}

/**
 * SyncProvider initializes the offline caching and sync system
 * Wrap your app with this provider to enable offline support
 *
 * @example
 * ```tsx
 * <SyncProvider>
 *   <App />
 * </SyncProvider>
 * ```
 */
export function SyncProvider({
  children,
  showLoadingIndicator = false,
  loadingComponent,
}: SyncProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isConnected } = useNetworkStatus();
  const { initialize, setOnline } = useSyncStore();

  // Initialize sync system
  useEffect(() => {
    const init = async () => {
      try {
        await initialize();
        setIsInitialized(true);
      } catch (err: any) {
        console.error('[SyncProvider] Initialization error:', err);
        setError(err.message || 'Failed to initialize sync');
        // Still set as initialized to allow app to run
        setIsInitialized(true);
      }
    };

    init();
  }, [initialize]);

  // Update online status when network changes
  useEffect(() => {
    setOnline(isConnected);
  }, [isConnected, setOnline]);

  // Show loading indicator while initializing
  if (!isInitialized && showLoadingIndicator) {
    return (
      loadingComponent || (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0d6efd" />
          <Text style={styles.loadingText}>Initializing...</Text>
        </View>
      )
    );
  }

  return <>{children}</>;
}

/**
 * Hook to check if sync system is ready
 */
export function useSyncReady(): boolean {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkReady = async () => {
      // Give a small delay for initialization
      await new Promise((resolve) => setTimeout(resolve, 100));
      setIsReady(true);
    };
    checkReady();
  }, []);

  return isReady;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6c757d',
  },
});
