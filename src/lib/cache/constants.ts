/**
 * Cache Constants
 * Phase 6: Offline Caching with Sync Queue
 */

import { CacheConfig } from './types';

// Time constants (in milliseconds)
export const SECONDS = 1000;
export const MINUTES = 60 * SECONDS;
export const HOURS = 60 * MINUTES;

// Cache configuration
export const CACHE_CONFIG: CacheConfig = {
  // Default TTL for cached data (5 minutes)
  defaultTTL: 5 * MINUTES,

  // TTL for different data types
  profilesTTL: 10 * MINUTES, // Profiles change less frequently
  challengesTTL: 2 * MINUTES, // Challenges need to be fresh
  activitiesTTL: 5 * MINUTES, // Activity feed

  // Sync queue retry settings
  maxRetries: 5,
  retryDelayBase: 2000, // Base delay for exponential backoff (2 seconds)

  // Cache version for migrations
  cacheVersion: 1,
};

// AsyncStorage keys
export const STORAGE_KEYS = {
  // Cache keys
  PROFILES_CACHE: '@totc/cache/profiles',
  CHALLENGES_CACHE: '@totc/cache/challenges',
  ACTIVITIES_CACHE: '@totc/cache/activities',
  CACHE_METADATA: '@totc/cache/metadata',

  // Sync queue keys
  SYNC_QUEUE: '@totc/sync/queue',
  SYNC_METADATA: '@totc/sync/metadata',

  // Version key for migrations
  CACHE_VERSION: '@totc/cache/version',
};

// Operation priority (lower = higher priority)
export const OPERATION_PRIORITY: Record<string, number> = {
  // High priority - user-initiated actions
  'profiles:update': 1,
  'challenges:insert': 2,
  'challenges:update': 2,

  // Medium priority - engagement actions
  'cheers:insert': 3,
  'cheers:delete': 3,
  'comments:insert': 3,

  // Lower priority - analytics/activity
  'activities:insert': 4,
};

// Sync batch sizes
export const SYNC_BATCH_SIZE = 10;

// Maximum cache sizes (number of entries)
export const MAX_CACHE_SIZE = {
  profiles: 100,
  challenges: 200,
  activities: 500,
};

// Stale-while-revalidate thresholds
export const STALE_THRESHOLD = {
  profiles: 30 * SECONDS, // Show stale for 30s while revalidating
  challenges: 15 * SECONDS,
  activities: 30 * SECONDS,
};
