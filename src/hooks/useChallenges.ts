/**
 * useChallenges - Hooks for challenge data with offline support
 * Phase 6: Offline Caching with Sync Queue
 */

import { useCallback } from 'react';
import { Challenge, ChallengeStatus, GameType } from '../types';
import { ChallengeService, CreateChallengeInput } from '../lib/services/ChallengeService';
import { useOfflineData, UseOfflineDataOptions, UseOfflineDataResult } from './useOfflineData';
import { FetchOptions } from '../lib/services/BaseService';

/**
 * Hook to fetch a single challenge by ID
 */
export function useChallenge(
  challengeId: string | null,
  options?: UseOfflineDataOptions<Challenge>
): UseOfflineDataResult<Challenge> {
  const fetcher = useCallback(
    (fetchOptions?: FetchOptions) => {
      if (!challengeId) {
        return Promise.resolve({
          data: null,
          error: null,
          fromCache: false,
          isStale: false,
        });
      }
      return ChallengeService.getById(challengeId, fetchOptions);
    },
    [challengeId]
  );

  return useOfflineData(fetcher, [challengeId], {
    ...options,
    fetchOnMount: !!challengeId,
  });
}

/**
 * Hook to fetch all challenges for a user
 */
export function useUserChallenges(
  profileId: string | null,
  options?: UseOfflineDataOptions<Challenge[]>
): UseOfflineDataResult<Challenge[]> {
  const fetcher = useCallback(
    (fetchOptions?: FetchOptions) => {
      if (!profileId) {
        return Promise.resolve({
          data: [],
          error: null,
          fromCache: false,
          isStale: false,
        });
      }
      return ChallengeService.getForUser(profileId, fetchOptions);
    },
    [profileId]
  );

  return useOfflineData(fetcher, [profileId], {
    ...options,
    fetchOnMount: !!profileId,
  });
}

/**
 * Hook to fetch pending challenges (inbox)
 */
export function usePendingChallenges(
  profileId: string | null,
  options?: UseOfflineDataOptions<Challenge[]>
): UseOfflineDataResult<Challenge[]> {
  const fetcher = useCallback(
    (fetchOptions?: FetchOptions) => {
      if (!profileId) {
        return Promise.resolve({
          data: [],
          error: null,
          fromCache: false,
          isStale: false,
        });
      }
      return ChallengeService.getPendingForUser(profileId, fetchOptions);
    },
    [profileId]
  );

  return useOfflineData(fetcher, [profileId], {
    ...options,
    fetchOnMount: !!profileId,
  });
}

/**
 * Hook to fetch sent challenges (outbox)
 */
export function useSentChallenges(
  profileId: string | null,
  options?: UseOfflineDataOptions<Challenge[]>
): UseOfflineDataResult<Challenge[]> {
  const fetcher = useCallback(
    (fetchOptions?: FetchOptions) => {
      if (!profileId) {
        return Promise.resolve({
          data: [],
          error: null,
          fromCache: false,
          isStale: false,
        });
      }
      return ChallengeService.getSentByUser(profileId, fetchOptions);
    },
    [profileId]
  );

  return useOfflineData(fetcher, [profileId], {
    ...options,
    fetchOnMount: !!profileId,
  });
}

/**
 * Hook to fetch live challenges
 */
export function useLiveChallenges(
  options?: UseOfflineDataOptions<Challenge[]>
): UseOfflineDataResult<Challenge[]> {
  const fetcher = useCallback(
    (fetchOptions?: FetchOptions) => ChallengeService.getLive(fetchOptions),
    []
  );

  return useOfflineData(fetcher, [], options);
}

/**
 * Hook to fetch completed challenges for a user (stats)
 */
export function useCompletedChallenges(
  profileId: string | null,
  options?: UseOfflineDataOptions<Challenge[]>
): UseOfflineDataResult<Challenge[]> {
  const fetcher = useCallback(
    (fetchOptions?: FetchOptions) => {
      if (!profileId) {
        return Promise.resolve({
          data: [],
          error: null,
          fromCache: false,
          isStale: false,
        });
      }
      return ChallengeService.getCompletedForUser(profileId, fetchOptions);
    },
    [profileId]
  );

  return useOfflineData(fetcher, [profileId], {
    ...options,
    fetchOnMount: !!profileId,
  });
}

/**
 * Hook to fetch pending challenge count (for badges)
 */
export function usePendingChallengeCount(
  profileId: string | null,
  options?: UseOfflineDataOptions<number>
): UseOfflineDataResult<number> {
  const fetcher = useCallback(
    (fetchOptions?: FetchOptions) => {
      if (!profileId) {
        return Promise.resolve({
          data: 0,
          error: null,
          fromCache: false,
          isStale: false,
        });
      }
      return ChallengeService.getPendingCount(profileId, fetchOptions);
    },
    [profileId]
  );

  return useOfflineData(fetcher, [profileId], {
    ...options,
    fetchOnMount: !!profileId,
  });
}

/**
 * Hook to fetch recent challenges
 */
export function useRecentChallenges(
  limit: number = 10,
  options?: UseOfflineDataOptions<Challenge[]>
): UseOfflineDataResult<Challenge[]> {
  const fetcher = useCallback(
    (fetchOptions?: FetchOptions) => ChallengeService.getRecent(limit, fetchOptions),
    [limit]
  );

  return useOfflineData(fetcher, [limit], options);
}

/**
 * Hook for challenge mutations
 */
export function useChallengeMutations() {
  const createChallenge = useCallback(async (input: CreateChallengeInput) => {
    return ChallengeService.create(input);
  }, []);

  const acceptChallenge = useCallback(async (challengeId: string) => {
    return ChallengeService.accept(challengeId);
  }, []);

  const declineChallenge = useCallback(async (challengeId: string) => {
    return ChallengeService.decline(challengeId);
  }, []);

  const startMatch = useCallback(async (challengeId: string) => {
    return ChallengeService.startMatch(challengeId);
  }, []);

  const updateScores = useCallback(
    async (challengeId: string, challengerScore: number, challengedScore: number) => {
      return ChallengeService.updateScores(challengeId, challengerScore, challengedScore);
    },
    []
  );

  const completeMatch = useCallback(
    async (
      challengeId: string,
      challengerScore: number,
      challengedScore: number,
      winnerId: string
    ) => {
      return ChallengeService.complete(
        challengeId,
        challengerScore,
        challengedScore,
        winnerId
      );
    },
    []
  );

  const updateChallenge = useCallback(
    async (challengeId: string, updates: Partial<Challenge>) => {
      return ChallengeService.update(challengeId, updates);
    },
    []
  );

  const deleteChallenge = useCallback(async (challengeId: string) => {
    return ChallengeService.delete(challengeId);
  }, []);

  return {
    createChallenge,
    acceptChallenge,
    declineChallenge,
    startMatch,
    updateScores,
    completeMatch,
    updateChallenge,
    deleteChallenge,
  };
}
