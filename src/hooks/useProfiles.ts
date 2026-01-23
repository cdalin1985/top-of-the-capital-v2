/**
 * useProfiles - Hooks for profile data with offline support
 * Phase 6: Offline Caching with Sync Queue
 */

import { useCallback } from 'react';
import { Profile } from '../types';
import { ProfileService } from '../lib/services/ProfileService';
import { useOfflineData, UseOfflineDataOptions, UseOfflineDataResult } from './useOfflineData';
import { FetchOptions } from '../lib/services/BaseService';

/**
 * Hook to fetch all profiles (leaderboard)
 */
export function useLeaderboard(
  options?: UseOfflineDataOptions<Profile[]>
): UseOfflineDataResult<Profile[]> {
  const fetcher = useCallback(
    (fetchOptions?: FetchOptions) => ProfileService.getLeaderboard(fetchOptions),
    []
  );

  return useOfflineData(fetcher, [], options);
}

/**
 * Hook to fetch profiles by ladder rank
 */
export function useLadderRankings(
  options?: UseOfflineDataOptions<Profile[]>
): UseOfflineDataResult<Profile[]> {
  const fetcher = useCallback(
    (fetchOptions?: FetchOptions) => ProfileService.getByLadderRank(fetchOptions),
    []
  );

  return useOfflineData(fetcher, [], options);
}

/**
 * Hook to fetch a single profile by ID
 */
export function useProfile(
  profileId: string | null,
  options?: UseOfflineDataOptions<Profile>
): UseOfflineDataResult<Profile> {
  const fetcher = useCallback(
    (fetchOptions?: FetchOptions) => {
      if (!profileId) {
        return Promise.resolve({
          data: null,
          error: null,
          fromCache: false,
          isStale: false,
        });
      }
      return ProfileService.getById(profileId, fetchOptions);
    },
    [profileId]
  );

  return useOfflineData(fetcher, [profileId], {
    ...options,
    fetchOnMount: !!profileId,
  });
}

/**
 * Hook to fetch the current user's profile
 */
export function useMyProfile(
  ownerId: string | null,
  options?: UseOfflineDataOptions<Profile>
): UseOfflineDataResult<Profile> {
  const fetcher = useCallback(
    (fetchOptions?: FetchOptions) => {
      if (!ownerId) {
        return Promise.resolve({
          data: null,
          error: null,
          fromCache: false,
          isStale: false,
        });
      }
      return ProfileService.getByOwnerId(ownerId, fetchOptions);
    },
    [ownerId]
  );

  return useOfflineData(fetcher, [ownerId], {
    ...options,
    fetchOnMount: !!ownerId,
  });
}

/**
 * Hook to search profiles
 */
export function useProfileSearch(
  query: string,
  options?: UseOfflineDataOptions<Profile[]>
): UseOfflineDataResult<Profile[]> {
  const fetcher = useCallback(
    (fetchOptions?: FetchOptions) => {
      if (!query || query.length < 2) {
        return Promise.resolve({
          data: [],
          error: null,
          fromCache: false,
          isStale: false,
        });
      }
      return ProfileService.search(query, fetchOptions);
    },
    [query]
  );

  return useOfflineData(fetcher, [query], {
    ...options,
    fetchOnMount: query.length >= 2,
  });
}

/**
 * Hook to fetch unclaimed profiles
 */
export function useUnclaimedProfiles(
  options?: UseOfflineDataOptions<Profile[]>
): UseOfflineDataResult<Profile[]> {
  const fetcher = useCallback(
    (fetchOptions?: FetchOptions) => ProfileService.getUnclaimed(fetchOptions),
    []
  );

  return useOfflineData(fetcher, [], options);
}

/**
 * Hook for profile mutations
 */
export function useProfileMutations() {
  const updateProfile = useCallback(
    async (profileId: string, updates: Partial<Profile>) => {
      return ProfileService.update(profileId, updates);
    },
    []
  );

  const claimProfile = useCallback(async (profileId: string, ownerId: string) => {
    return ProfileService.claim(profileId, ownerId);
  }, []);

  const updateCooldown = useCallback(
    async (profileId: string, cooldownUntil: string | null) => {
      return ProfileService.updateCooldown(profileId, cooldownUntil);
    },
    []
  );

  const updatePushToken = useCallback(
    async (profileId: string, token: string | null) => {
      return ProfileService.updatePushToken(profileId, token);
    },
    []
  );

  const createProfile = useCallback(
    async (profile: Omit<Profile, 'id' | 'created_at' | 'updated_at'>) => {
      return ProfileService.create(profile);
    },
    []
  );

  return {
    updateProfile,
    claimProfile,
    updateCooldown,
    updatePushToken,
    createProfile,
  };
}
