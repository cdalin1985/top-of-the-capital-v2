/**
 * Services Module - Data services with caching
 * Phase 6: Production Ready
 *
 * This module provides:
 * - ProfileService: Cached profile operations
 * - ChallengeService: Cached challenge operations
 * - ActivityService: Cached activity operations
 */

export { ProfileService } from './ProfileService';
export { ChallengeService, type CreateChallengeInput } from './ChallengeService';
export { ActivityService, type CreateActivityInput } from './ActivityService';
export { BaseService, type FetchOptions, type ServiceResult } from './BaseService';
