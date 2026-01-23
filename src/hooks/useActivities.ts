/**
 * useActivities - Hooks for activity data with offline support
 * Phase 6: Offline Caching with Sync Queue
 */

import { useCallback } from 'react';
import { Activity } from '../types';
import { ActivityService, CreateActivityInput } from '../lib/services/ActivityService';
import {
  useOfflineData,
  usePaginatedOfflineData,
  UseOfflineDataOptions,
  UseOfflineDataResult,
  UsePaginatedOfflineDataResult,
} from './useOfflineData';
import { FetchOptions } from '../lib/services/BaseService';

/**
 * Hook to fetch activity feed with pagination
 */
export function useActivityFeed(
  options?: UseOfflineDataOptions<Activity[]> & { pageSize?: number }
): UsePaginatedOfflineDataResult<Activity> {
  const { pageSize = 20, ...restOptions } = options ?? {};

  const fetcher = useCallback(
    (page: number, size: number, fetchOptions?: FetchOptions) =>
      ActivityService.getFeed(size, page * size, fetchOptions),
    []
  );

  return usePaginatedOfflineData(fetcher, { ...restOptions, pageSize });
}

/**
 * Hook to fetch activities for a specific user
 */
export function useUserActivities(
  userId: string | null,
  limit: number = 20,
  options?: UseOfflineDataOptions<Activity[]>
): UseOfflineDataResult<Activity[]> {
  const fetcher = useCallback(
    (fetchOptions?: FetchOptions) => {
      if (!userId) {
        return Promise.resolve({
          data: [],
          error: null,
          fromCache: false,
          isStale: false,
        });
      }
      return ActivityService.getForUser(userId, limit, fetchOptions);
    },
    [userId, limit]
  );

  return useOfflineData(fetcher, [userId, limit], {
    ...options,
    fetchOnMount: !!userId,
  });
}

/**
 * Hook to fetch a single activity by ID
 */
export function useActivity(
  activityId: string | null,
  options?: UseOfflineDataOptions<Activity>
): UseOfflineDataResult<Activity> {
  const fetcher = useCallback(
    (fetchOptions?: FetchOptions) => {
      if (!activityId) {
        return Promise.resolve({
          data: null,
          error: null,
          fromCache: false,
          isStale: false,
        });
      }
      return ActivityService.getById(activityId, fetchOptions);
    },
    [activityId]
  );

  return useOfflineData(fetcher, [activityId], {
    ...options,
    fetchOnMount: !!activityId,
  });
}

/**
 * Hook to fetch activities by type
 */
export function useActivitiesByType(
  actionType: string,
  limit: number = 20,
  options?: UseOfflineDataOptions<Activity[]>
): UseOfflineDataResult<Activity[]> {
  const fetcher = useCallback(
    (fetchOptions?: FetchOptions) =>
      ActivityService.getByType(actionType, limit, fetchOptions),
    [actionType, limit]
  );

  return useOfflineData(fetcher, [actionType, limit], options);
}

/**
 * Hook to fetch recent activity count
 */
export function useRecentActivityCount(
  sinceHours: number = 24,
  options?: UseOfflineDataOptions<number>
): UseOfflineDataResult<number> {
  const fetcher = useCallback(
    (fetchOptions?: FetchOptions) =>
      ActivityService.getRecentCount(sinceHours),
    [sinceHours]
  );

  return useOfflineData(fetcher, [sinceHours], options);
}

/**
 * Hook for activity mutations
 */
export function useActivityMutations() {
  const createActivity = useCallback(async (input: CreateActivityInput) => {
    return ActivityService.create(input);
  }, []);

  const recordMatchCompletion = useCallback(
    async (
      userId: string,
      challengeId: string,
      winnerId: string,
      loserId: string,
      winnerScore: number,
      loserScore: number,
      gameType: string
    ) => {
      return ActivityService.recordMatchCompletion(
        userId,
        challengeId,
        winnerId,
        loserId,
        winnerScore,
        loserScore,
        gameType
      );
    },
    []
  );

  const recordChallengeSent = useCallback(
    async (
      userId: string,
      challengeId: string,
      challengedId: string,
      gameType: string
    ) => {
      return ActivityService.recordChallengeSent(
        userId,
        challengeId,
        challengedId,
        gameType
      );
    },
    []
  );

  const recordChallengeAccepted = useCallback(
    async (userId: string, challengeId: string, challengerId: string) => {
      return ActivityService.recordChallengeAccepted(
        userId,
        challengeId,
        challengerId
      );
    },
    []
  );

  const recordRankChange = useCallback(
    async (userId: string, previousRank: number, newRank: number) => {
      return ActivityService.recordRankChange(userId, previousRank, newRank);
    },
    []
  );

  const deleteActivity = useCallback(async (activityId: string) => {
    return ActivityService.delete(activityId);
  }, []);

  const addCheer = useCallback(async (activityId: string, userId: string) => {
    return ActivityService.addCheer(activityId, userId);
  }, []);

  const removeCheer = useCallback(async (activityId: string, userId: string) => {
    return ActivityService.removeCheer(activityId, userId);
  }, []);

  const addComment = useCallback(
    async (activityId: string, userId: string, content: string) => {
      return ActivityService.addComment(activityId, userId, content);
    },
    []
  );

  return {
    createActivity,
    recordMatchCompletion,
    recordChallengeSent,
    recordChallengeAccepted,
    recordRankChange,
    deleteActivity,
    addCheer,
    removeCheer,
    addComment,
  };
}
