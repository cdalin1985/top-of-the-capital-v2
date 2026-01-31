/**
 * Hooks Module - Custom React hooks
 * Phase 6: Production Ready
 */

// Auth and network
export { useAuth } from './useAuth';
export { useNetworkStatus } from './useNetworkStatus';

// Sync status
export { useSyncStatus, useSyncActions } from './useSyncStatus';

// Generic offline data
export {
  useOfflineData,
  usePaginatedOfflineData,
  type UseOfflineDataOptions,
  type UseOfflineDataResult,
  type UsePaginatedOfflineDataOptions,
  type UsePaginatedOfflineDataResult,
} from './useOfflineData';

// Profile hooks
export {
  useLeaderboard,
  useLadderRankings,
  useProfile,
  useMyProfile,
  useProfileSearch,
  useUnclaimedProfiles,
  useProfileMutations,
} from './useProfiles';

// Challenge hooks
export {
  useChallenge,
  useUserChallenges,
  usePendingChallenges,
  useSentChallenges,
  useLiveChallenges,
  useCompletedChallenges,
  usePendingChallengeCount,
  useRecentChallenges,
  useChallengeMutations,
} from './useChallenges';

// Activity hooks
export {
  useActivityFeed,
  useUserActivities,
  useActivity,
  useActivitiesByType,
  useRecentActivityCount,
  useActivityMutations,
} from './useActivities';
