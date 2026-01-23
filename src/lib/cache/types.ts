/**
 * Cache Types and Interfaces
 * Phase 6: Offline Caching with Sync Queue
 */

import { Profile, Challenge, Activity } from '../../types';

// Cache entry wrapper with metadata
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  version: number;
}

// Cache keys for different data types
export type CacheKey =
  | 'profiles'
  | 'challenges'
  | 'activities'
  | 'my_profile'
  | 'pending_challenges'
  | 'live_challenges';

// Sync operation types
export type SyncOperationType = 'insert' | 'update' | 'delete' | 'upsert';

// Tables that can be synced
export type SyncTable = 'profiles' | 'challenges' | 'activities' | 'cheers' | 'comments';

// Sync operation status
export type SyncOperationStatus = 'pending' | 'syncing' | 'completed' | 'failed';

// Individual sync operation
export interface SyncOperation {
  id: string;
  table: SyncTable;
  operation: SyncOperationType;
  data: Record<string, any>;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  status: SyncOperationStatus;
  error?: string;
  // Optional: reference ID for related data (e.g., challenge_id)
  referenceId?: string;
}

// Sync queue state
export interface SyncQueueState {
  operations: SyncOperation[];
  lastSyncedAt: number | null;
  isSyncing: boolean;
  syncError: string | null;
}

// Cache store state for Zustand
export interface CacheStoreState {
  // Cached data
  profiles: Map<string, CacheEntry<Profile>>;
  challenges: Map<string, CacheEntry<Challenge>>;
  activities: Map<string, CacheEntry<Activity>>;

  // Special caches
  profilesList: CacheEntry<Profile[]> | null;
  challengesList: CacheEntry<Challenge[]> | null;
  activitiesList: CacheEntry<Activity[]> | null;

  // Cache metadata
  lastUpdated: Record<CacheKey, number | null>;

  // Actions
  setProfile: (id: string, profile: Profile, ttl?: number) => void;
  setProfiles: (profiles: Profile[], ttl?: number) => void;
  getProfile: (id: string) => Profile | null;
  getProfiles: () => Profile[] | null;

  setChallenge: (id: string, challenge: Challenge, ttl?: number) => void;
  setChallenges: (challenges: Challenge[], ttl?: number) => void;
  getChallenge: (id: string) => Challenge | null;
  getChallenges: () => Challenge[] | null;

  setActivity: (id: string, activity: Activity, ttl?: number) => void;
  setActivities: (activities: Activity[], ttl?: number) => void;
  getActivity: (id: string) => Activity | null;
  getActivities: () => Activity[] | null;

  // Cache management
  invalidate: (key: CacheKey) => void;
  invalidateAll: () => void;
  isExpired: (key: CacheKey) => boolean;

  // Persistence
  persistToStorage: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

// Sync queue store state for Zustand
export interface SyncQueueStoreState {
  // Queue state
  queue: SyncOperation[];
  isSyncing: boolean;
  lastSyncedAt: number | null;
  syncError: string | null;

  // Actions
  addOperation: (operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount' | 'status'>) => string;
  removeOperation: (id: string) => void;
  updateOperationStatus: (id: string, status: SyncOperationStatus, error?: string) => void;
  incrementRetry: (id: string) => void;

  // Sync management
  setSyncing: (isSyncing: boolean) => void;
  setSyncError: (error: string | null) => void;
  setLastSyncedAt: (timestamp: number) => void;

  // Queue queries
  getPendingOperations: () => SyncOperation[];
  getFailedOperations: () => SyncOperation[];
  getQueueLength: () => number;
  hasOperationsForTable: (table: SyncTable) => boolean;

  // Persistence
  persistToStorage: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
  clearCompleted: () => void;
}

// Network status for sync decisions
export interface NetworkStatus {
  isConnected: boolean;
  type?: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  isInternetReachable?: boolean;
}

// Sync result
export interface SyncResult {
  success: boolean;
  operationId: string;
  error?: string;
  serverResponse?: any;
}

// Cache configuration
export interface CacheConfig {
  defaultTTL: number;
  profilesTTL: number;
  challengesTTL: number;
  activitiesTTL: number;
  maxRetries: number;
  retryDelayBase: number;
  cacheVersion: number;
}
