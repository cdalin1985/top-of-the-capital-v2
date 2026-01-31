/**
 * useOfflineData - Generic hook for fetching data with offline support
 * Phase 6: Offline Caching with Sync Queue
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ServiceResult, FetchOptions } from '../lib/services/BaseService';
import { useNetworkStatus } from './useNetworkStatus';

export interface UseOfflineDataOptions<T> extends FetchOptions {
  /** Whether to fetch on mount */
  fetchOnMount?: boolean;
  /** Polling interval in milliseconds (0 to disable) */
  pollingInterval?: number;
  /** Callback when data is successfully fetched */
  onSuccess?: (data: T) => void;
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
  /** Transform function for the data */
  transform?: (data: T) => T;
}

export interface UseOfflineDataResult<T> {
  /** The fetched data */
  data: T | null;
  /** Whether the request is in progress */
  isLoading: boolean;
  /** Whether data is being refreshed (already have data) */
  isRefreshing: boolean;
  /** Error if the request failed */
  error: Error | null;
  /** Whether the data came from cache */
  fromCache: boolean;
  /** Whether the cached data is stale */
  isStale: boolean;
  /** Whether the device is online */
  isOnline: boolean;
  /** Refetch the data */
  refetch: (options?: FetchOptions) => Promise<void>;
  /** Manually set the data */
  setData: (data: T | null) => void;
}

/**
 * Generic hook for fetching data with offline support
 * @param fetcher - Function that fetches the data and returns a ServiceResult
 * @param dependencies - Dependencies array that triggers refetch when changed
 * @param options - Configuration options
 */
export function useOfflineData<T>(
  fetcher: (options?: FetchOptions) => Promise<ServiceResult<T>>,
  dependencies: any[] = [],
  options: UseOfflineDataOptions<T> = {}
): UseOfflineDataResult<T> {
  const {
    fetchOnMount = true,
    pollingInterval = 0,
    onSuccess,
    onError,
    transform,
    forceRefresh,
    useStale = true,
  } = options;

  const { isConnected } = useNetworkStatus();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(fetchOnMount);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [isStale, setIsStale] = useState(false);

  const mountedRef = useRef(true);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(
    async (fetchOptions?: FetchOptions) => {
      const isRefresh = data !== null;

      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const result = await fetcher({
          forceRefresh: fetchOptions?.forceRefresh ?? forceRefresh,
          useStale: fetchOptions?.useStale ?? useStale,
        });

        if (!mountedRef.current) return;

        if (result.error && !result.data) {
          setError(result.error);
          onError?.(result.error);
        } else {
          const transformedData = result.data
            ? (transform ? transform(result.data) : result.data)
            : null;

          setData(transformedData);
          setFromCache(result.fromCache);
          setIsStale(result.isStale);
          setError(result.error); // May still have error with stale data

          if (transformedData) {
            onSuccess?.(transformedData);
          }
        }
      } catch (err: any) {
        if (!mountedRef.current) return;

        setError(err);
        onError?.(err);
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [fetcher, data, forceRefresh, useStale, transform, onSuccess, onError]
  );

  // Initial fetch
  useEffect(() => {
    if (fetchOnMount) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies]);

  // Polling
  useEffect(() => {
    if (pollingInterval > 0 && isConnected) {
      pollingRef.current = setInterval(() => {
        fetchData({ forceRefresh: true });
      }, pollingInterval);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [pollingInterval, isConnected, fetchData]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Refetch when coming back online
  useEffect(() => {
    if (isConnected && isStale) {
      fetchData({ forceRefresh: true });
    }
  }, [isConnected, isStale, fetchData]);

  const refetch = useCallback(
    async (fetchOptions?: FetchOptions) => {
      await fetchData(fetchOptions);
    },
    [fetchData]
  );

  return {
    data,
    isLoading,
    isRefreshing,
    error,
    fromCache,
    isStale,
    isOnline: isConnected,
    refetch,
    setData,
  };
}

/**
 * Hook for paginated data with offline support
 */
export interface UsePaginatedOfflineDataOptions<T> extends UseOfflineDataOptions<T[]> {
  pageSize?: number;
}

export interface UsePaginatedOfflineDataResult<T> extends Omit<UseOfflineDataResult<T[]>, 'data'> {
  data: T[];
  loadMore: () => Promise<void>;
  hasMore: boolean;
  isLoadingMore: boolean;
  page: number;
  reset: () => void;
}

export function usePaginatedOfflineData<T>(
  fetcher: (page: number, pageSize: number, options?: FetchOptions) => Promise<ServiceResult<T[]>>,
  options: UsePaginatedOfflineDataOptions<T> = {}
): UsePaginatedOfflineDataResult<T> {
  const { pageSize = 20, ...restOptions } = options;

  const [allData, setAllData] = useState<T[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const { isConnected } = useNetworkStatus();

  const fetchPage = useCallback(
    async (pageNum: number, fetchOptions?: FetchOptions) => {
      const result = await fetcher(pageNum, pageSize, fetchOptions);
      return result;
    },
    [fetcher, pageSize]
  );

  const baseResult = useOfflineData(
    () => fetchPage(0),
    [],
    {
      ...restOptions,
      onSuccess: (data) => {
        setAllData(data);
        setPage(0);
        setHasMore(data.length >= pageSize);
        restOptions.onSuccess?.(data);
      },
    }
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || !isConnected) return;

    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await fetchPage(nextPage, { forceRefresh: true });

      if (result.data) {
        setAllData((prev) => [...prev, ...result.data!]);
        setPage(nextPage);
        setHasMore(result.data.length >= pageSize);
      }
    } catch (err) {
      console.error('Error loading more:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, isConnected, page, fetchPage, pageSize]);

  const reset = useCallback(() => {
    setAllData([]);
    setPage(0);
    setHasMore(true);
    baseResult.refetch({ forceRefresh: true });
  }, [baseResult.refetch]);

  return {
    ...baseResult,
    data: allData,
    loadMore,
    hasMore,
    isLoadingMore,
    page,
    reset,
  };
}
