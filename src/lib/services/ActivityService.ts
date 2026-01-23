/**
 * ActivityService - Cached activity data operations
 * Phase 6: Offline Caching with Sync Queue
 */

import { supabase } from '../supabase';
import { Activity } from '../../types';
import { cacheManager } from '../cache/CacheManager';
import { syncService } from '../cache/SyncService';
import { CACHE_CONFIG } from '../cache/constants';
import { BaseService, FetchOptions, ServiceResult } from './BaseService';

/**
 * Input type for creating a new activity
 */
export interface CreateActivityInput {
  user_id: string;
  action_type: string;
  metadata: Record<string, any>;
}

/**
 * ActivityService handles all activity-related data operations
 * with caching and offline support
 */
class ActivityServiceImpl extends BaseService<Activity> {
  protected table = 'activities' as const;
  protected cachePrefix = 'activities';
  protected defaultTTL = CACHE_CONFIG.activitiesTTL;

  /**
   * Get activity feed (paginated)
   */
  async getFeed(
    limit: number = 20,
    offset: number = 0,
    options?: FetchOptions
  ): Promise<ServiceResult<Activity[]>> {
    const cacheKey = this.getListCacheKey(`feed/${limit}/${offset}`);

    return this.fetchWithCache<Activity[]>(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from('activities')
          .select(`
            *,
            user:profiles!activities_user_id_fkey(*)
          `)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
        return { data, error };
      },
      options
    );
  }

  /**
   * Get activities for a specific user
   */
  async getForUser(
    userId: string,
    limit: number = 20,
    options?: FetchOptions
  ): Promise<ServiceResult<Activity[]>> {
    const cacheKey = this.getListCacheKey(`user/${userId}/${limit}`);

    return this.fetchWithCache<Activity[]>(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from('activities')
          .select(`
            *,
            user:profiles!activities_user_id_fkey(*)
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit);
        return { data, error };
      },
      options
    );
  }

  /**
   * Get a single activity by ID
   */
  async getById(id: string, options?: FetchOptions): Promise<ServiceResult<Activity>> {
    const cacheKey = this.getCacheKey(id);

    return this.fetchWithCache<Activity>(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from('activities')
          .select(`
            *,
            user:profiles!activities_user_id_fkey(*),
            comments(
              *,
              user:profiles!comments_user_id_fkey(*)
            )
          `)
          .eq('id', id)
          .single();
        return { data, error };
      },
      options
    );
  }

  /**
   * Create a new activity
   */
  async create(input: CreateActivityInput): Promise<ServiceResult<Activity>> {
    return this.insertWithCache(
      input,
      async () => {
        const { data, error } = await supabase
          .from('activities')
          .insert(input)
          .select(`
            *,
            user:profiles!activities_user_id_fkey(*)
          `)
          .single();
        return { data, error };
      }
    );
  }

  /**
   * Record a match completion activity
   */
  async recordMatchCompletion(
    userId: string,
    challengeId: string,
    winnerId: string,
    loserId: string,
    winnerScore: number,
    loserScore: number,
    gameType: string
  ): Promise<ServiceResult<Activity>> {
    return this.create({
      user_id: userId,
      action_type: 'match_completed',
      metadata: {
        challenge_id: challengeId,
        winner_id: winnerId,
        loser_id: loserId,
        winner_score: winnerScore,
        loser_score: loserScore,
        game_type: gameType,
      },
    });
  }

  /**
   * Record a challenge sent activity
   */
  async recordChallengeSent(
    userId: string,
    challengeId: string,
    challengedId: string,
    gameType: string
  ): Promise<ServiceResult<Activity>> {
    return this.create({
      user_id: userId,
      action_type: 'challenge_sent',
      metadata: {
        challenge_id: challengeId,
        challenged_id: challengedId,
        game_type: gameType,
      },
    });
  }

  /**
   * Record a challenge accepted activity
   */
  async recordChallengeAccepted(
    userId: string,
    challengeId: string,
    challengerId: string
  ): Promise<ServiceResult<Activity>> {
    return this.create({
      user_id: userId,
      action_type: 'challenge_accepted',
      metadata: {
        challenge_id: challengeId,
        challenger_id: challengerId,
      },
    });
  }

  /**
   * Record a rank change activity
   */
  async recordRankChange(
    userId: string,
    previousRank: number,
    newRank: number
  ): Promise<ServiceResult<Activity>> {
    return this.create({
      user_id: userId,
      action_type: 'rank_changed',
      metadata: {
        previous_rank: previousRank,
        new_rank: newRank,
      },
    });
  }

  /**
   * Delete an activity
   */
  async delete(id: string): Promise<{ success: boolean; error: Error | null }> {
    return this.deleteWithCache(id, async () => {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', id);
      return { error };
    });
  }

  /**
   * Get activities by type
   */
  async getByType(
    actionType: string,
    limit: number = 20,
    options?: FetchOptions
  ): Promise<ServiceResult<Activity[]>> {
    const cacheKey = this.getListCacheKey(`type/${actionType}/${limit}`);

    return this.fetchWithCache<Activity[]>(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from('activities')
          .select(`
            *,
            user:profiles!activities_user_id_fkey(*)
          `)
          .eq('action_type', actionType)
          .order('created_at', { ascending: false })
          .limit(limit);
        return { data, error };
      },
      options
    );
  }

  /**
   * Add a cheer to an activity
   */
  async addCheer(activityId: string, userId: string): Promise<{ success: boolean; error: Error | null }> {
    try {
      // Queue the operation
      await syncService.queueOperation(
        'cheers',
        'insert',
        { activity_id: activityId, user_id: userId },
        { immediate: true }
      );

      const { error } = await supabase
        .from('cheers')
        .insert({ activity_id: activityId, user_id: userId });

      if (error) {
        return { success: false, error: new Error(error.message) };
      }

      // Invalidate activity cache
      await cacheManager.remove(this.getCacheKey(activityId));

      return { success: true, error: null };
    } catch (error: any) {
      return { success: false, error };
    }
  }

  /**
   * Remove a cheer from an activity
   */
  async removeCheer(activityId: string, userId: string): Promise<{ success: boolean; error: Error | null }> {
    try {
      // Queue the operation
      await syncService.queueOperation(
        'cheers',
        'delete',
        { activity_id: activityId, user_id: userId },
        { immediate: true }
      );

      const { error } = await supabase
        .from('cheers')
        .delete()
        .eq('activity_id', activityId)
        .eq('user_id', userId);

      if (error) {
        return { success: false, error: new Error(error.message) };
      }

      // Invalidate activity cache
      await cacheManager.remove(this.getCacheKey(activityId));

      return { success: true, error: null };
    } catch (error: any) {
      return { success: false, error };
    }
  }

  /**
   * Add a comment to an activity
   */
  async addComment(
    activityId: string,
    userId: string,
    content: string
  ): Promise<{ success: boolean; error: Error | null; commentId?: string }> {
    try {
      // Queue the operation
      await syncService.queueOperation(
        'comments',
        'insert',
        { activity_id: activityId, user_id: userId, content },
        { immediate: true }
      );

      const { data, error } = await supabase
        .from('comments')
        .insert({ activity_id: activityId, user_id: userId, content })
        .select()
        .single();

      if (error) {
        return { success: false, error: new Error(error.message) };
      }

      // Invalidate activity cache
      await cacheManager.remove(this.getCacheKey(activityId));

      return { success: true, error: null, commentId: data?.id };
    } catch (error: any) {
      return { success: false, error };
    }
  }

  /**
   * Get recent activity count (for badges/indicators)
   */
  async getRecentCount(sinceHours: number = 24): Promise<ServiceResult<number>> {
    const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString();
    const cacheKey = `@totc/cache/activities/count/recent/${sinceHours}`;

    return this.fetchWithCache<number>(
      cacheKey,
      async () => {
        const { count, error } = await supabase
          .from('activities')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', since);
        return { data: count ?? 0, error };
      }
    );
  }
}

// Export singleton instance
export const ActivityService = new ActivityServiceImpl();
