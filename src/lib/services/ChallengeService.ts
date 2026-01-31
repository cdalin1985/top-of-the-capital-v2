/**
 * ChallengeService - Cached challenge data operations
 * Phase 6: Offline Caching with Sync Queue
 */

import { supabase } from '../supabase';
import { Challenge, ChallengeStatus, GameType } from '../../types';
import { cacheManager } from '../cache/CacheManager';
import { syncService } from '../cache/SyncService';
import { CACHE_CONFIG } from '../cache/constants';
import { BaseService, FetchOptions, ServiceResult } from './BaseService';

/**
 * Input type for creating a new challenge
 */
export interface CreateChallengeInput {
  challenger_id: string;
  challenged_id: string;
  game_type: GameType;
  games_to_win: number;
  venue?: string;
  proposed_time?: string;
}

/**
 * ChallengeService handles all challenge-related data operations
 * with caching and offline support
 */
class ChallengeServiceImpl extends BaseService<Challenge> {
  protected table = 'challenges' as const;
  protected cachePrefix = 'challenges';
  protected defaultTTL = CACHE_CONFIG.challengesTTL;

  /**
   * Get a single challenge by ID
   */
  async getById(id: string, options?: FetchOptions): Promise<ServiceResult<Challenge>> {
    const cacheKey = this.getCacheKey(id);

    return this.fetchWithCache<Challenge>(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from('challenges')
          .select(`
            *,
            challenger:profiles!challenges_challenger_id_fkey(*),
            challenged:profiles!challenges_challenged_id_fkey(*)
          `)
          .eq('id', id)
          .single();
        return { data, error };
      },
      options
    );
  }

  /**
   * Get all challenges for a user (as challenger or challenged)
   */
  async getForUser(profileId: string, options?: FetchOptions): Promise<ServiceResult<Challenge[]>> {
    const cacheKey = this.getListCacheKey(`user/${profileId}`);

    return this.fetchWithCache<Challenge[]>(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from('challenges')
          .select(`
            *,
            challenger:profiles!challenges_challenger_id_fkey(*),
            challenged:profiles!challenges_challenged_id_fkey(*)
          `)
          .or(`challenger_id.eq.${profileId},challenged_id.eq.${profileId}`)
          .order('created_at', { ascending: false });
        return { data, error };
      },
      options
    );
  }

  /**
   * Get pending challenges for a user (inbox)
   */
  async getPendingForUser(profileId: string, options?: FetchOptions): Promise<ServiceResult<Challenge[]>> {
    const cacheKey = this.getListCacheKey(`pending/${profileId}`);

    return this.fetchWithCache<Challenge[]>(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from('challenges')
          .select(`
            *,
            challenger:profiles!challenges_challenger_id_fkey(*),
            challenged:profiles!challenges_challenged_id_fkey(*)
          `)
          .eq('challenged_id', profileId)
          .in('status', ['pending', 'negotiating', 'scheduled'])
          .order('created_at', { ascending: false });
        return { data, error };
      },
      options
    );
  }

  /**
   * Get sent challenges (outbox)
   */
  async getSentByUser(profileId: string, options?: FetchOptions): Promise<ServiceResult<Challenge[]>> {
    const cacheKey = this.getListCacheKey(`sent/${profileId}`);

    return this.fetchWithCache<Challenge[]>(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from('challenges')
          .select(`
            *,
            challenger:profiles!challenges_challenger_id_fkey(*),
            challenged:profiles!challenges_challenged_id_fkey(*)
          `)
          .eq('challenger_id', profileId)
          .in('status', ['pending', 'negotiating', 'scheduled'])
          .order('created_at', { ascending: false });
        return { data, error };
      },
      options
    );
  }

  /**
   * Get live challenges
   */
  async getLive(options?: FetchOptions): Promise<ServiceResult<Challenge[]>> {
    const cacheKey = this.getListCacheKey('live');

    return this.fetchWithCache<Challenge[]>(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from('challenges')
          .select(`
            *,
            challenger:profiles!challenges_challenger_id_fkey(*),
            challenged:profiles!challenges_challenged_id_fkey(*)
          `)
          .eq('status', 'live')
          .order('updated_at', { ascending: false });
        return { data, error };
      },
      options
    );
  }

  /**
   * Get completed challenges for stats
   */
  async getCompletedForUser(profileId: string, options?: FetchOptions): Promise<ServiceResult<Challenge[]>> {
    const cacheKey = this.getListCacheKey(`completed/${profileId}`);

    return this.fetchWithCache<Challenge[]>(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from('challenges')
          .select(`
            *,
            challenger:profiles!challenges_challenger_id_fkey(*),
            challenged:profiles!challenges_challenged_id_fkey(*)
          `)
          .eq('status', 'completed')
          .or(`challenger_id.eq.${profileId},challenged_id.eq.${profileId}`)
          .order('updated_at', { ascending: false });
        return { data, error };
      },
      options
    );
  }

  /**
   * Get pending challenge count for a user (for badges)
   */
  async getPendingCount(profileId: string, options?: FetchOptions): Promise<ServiceResult<number>> {
    const cacheKey = `@totc/cache/challenges/count/pending/${profileId}`;

    return this.fetchWithCache<number>(
      cacheKey,
      async () => {
        const { count, error } = await supabase
          .from('challenges')
          .select('*', { count: 'exact', head: true })
          .eq('challenged_id', profileId)
          .eq('status', 'pending');
        return { data: count ?? 0, error };
      },
      options
    );
  }

  /**
   * Create a new challenge
   */
  async create(input: CreateChallengeInput): Promise<ServiceResult<Challenge>> {
    return this.insertWithCache(
      { ...input, status: 'pending' as ChallengeStatus },
      async () => {
        const { data, error } = await supabase
          .from('challenges')
          .insert({
            ...input,
            status: 'pending',
          })
          .select(`
            *,
            challenger:profiles!challenges_challenger_id_fkey(*),
            challenged:profiles!challenges_challenged_id_fkey(*)
          `)
          .single();
        return { data, error };
      }
    );
  }

  /**
   * Update challenge status
   */
  async updateStatus(id: string, status: ChallengeStatus): Promise<ServiceResult<Challenge>> {
    return this.updateWithOptimisticCache(
      id,
      { status },
      async () => {
        const { data, error } = await supabase
          .from('challenges')
          .update({ status })
          .eq('id', id)
          .select(`
            *,
            challenger:profiles!challenges_challenger_id_fkey(*),
            challenged:profiles!challenges_challenged_id_fkey(*)
          `)
          .single();
        return { data, error };
      }
    );
  }

  /**
   * Accept a challenge (set to 'scheduled' or 'live')
   */
  async accept(id: string): Promise<ServiceResult<Challenge>> {
    return this.updateStatus(id, 'scheduled');
  }

  /**
   * Decline a challenge
   */
  async decline(id: string): Promise<ServiceResult<Challenge>> {
    return this.updateStatus(id, 'forfeited');
  }

  /**
   * Start a match (set to 'live')
   */
  async startMatch(id: string): Promise<ServiceResult<Challenge>> {
    return this.updateStatus(id, 'live');
  }

  /**
   * Update scores
   */
  async updateScores(
    id: string,
    challengerScore: number,
    challengedScore: number
  ): Promise<ServiceResult<Challenge>> {
    return this.updateWithOptimisticCache(
      id,
      { challenger_score: challengerScore, challenged_score: challengedScore },
      async () => {
        const { data, error } = await supabase
          .from('challenges')
          .update({
            challenger_score: challengerScore,
            challenged_score: challengedScore,
          })
          .eq('id', id)
          .select(`
            *,
            challenger:profiles!challenges_challenger_id_fkey(*),
            challenged:profiles!challenges_challenged_id_fkey(*)
          `)
          .single();
        return { data, error };
      }
    );
  }

  /**
   * Complete a match with final scores and winner
   */
  async complete(
    id: string,
    challengerScore: number,
    challengedScore: number,
    winnerId: string
  ): Promise<ServiceResult<Challenge>> {
    return this.updateWithOptimisticCache(
      id,
      {
        status: 'completed' as ChallengeStatus,
        challenger_score: challengerScore,
        challenged_score: challengedScore,
        winner_id: winnerId,
      },
      async () => {
        const { data, error } = await supabase
          .from('challenges')
          .update({
            status: 'completed',
            challenger_score: challengerScore,
            challenged_score: challengedScore,
            winner_id: winnerId,
          })
          .eq('id', id)
          .select(`
            *,
            challenger:profiles!challenges_challenger_id_fkey(*),
            challenged:profiles!challenges_challenged_id_fkey(*)
          `)
          .single();
        return { data, error };
      }
    );
  }

  /**
   * Update challenge details
   */
  async update(id: string, updates: Partial<Challenge>): Promise<ServiceResult<Challenge>> {
    return this.updateWithOptimisticCache(
      id,
      updates,
      async () => {
        const { data, error } = await supabase
          .from('challenges')
          .update(updates)
          .eq('id', id)
          .select(`
            *,
            challenger:profiles!challenges_challenger_id_fkey(*),
            challenged:profiles!challenges_challenged_id_fkey(*)
          `)
          .single();
        return { data, error };
      }
    );
  }

  /**
   * Delete a challenge
   */
  async delete(id: string): Promise<{ success: boolean; error: Error | null }> {
    return this.deleteWithCache(id, async () => {
      const { error } = await supabase
        .from('challenges')
        .delete()
        .eq('id', id);
      return { error };
    });
  }

  /**
   * Get challenges between two players
   */
  async getBetweenPlayers(
    player1Id: string,
    player2Id: string,
    options?: FetchOptions
  ): Promise<ServiceResult<Challenge[]>> {
    const cacheKey = this.getListCacheKey(`between/${player1Id}/${player2Id}`);

    return this.fetchWithCache<Challenge[]>(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from('challenges')
          .select(`
            *,
            challenger:profiles!challenges_challenger_id_fkey(*),
            challenged:profiles!challenges_challenged_id_fkey(*)
          `)
          .or(
            `and(challenger_id.eq.${player1Id},challenged_id.eq.${player2Id}),and(challenger_id.eq.${player2Id},challenged_id.eq.${player1Id})`
          )
          .order('created_at', { ascending: false });
        return { data, error };
      },
      options
    );
  }

  /**
   * Get recent challenges (for activity)
   */
  async getRecent(limit: number = 10, options?: FetchOptions): Promise<ServiceResult<Challenge[]>> {
    const cacheKey = this.getListCacheKey(`recent/${limit}`);

    return this.fetchWithCache<Challenge[]>(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from('challenges')
          .select(`
            *,
            challenger:profiles!challenges_challenger_id_fkey(*),
            challenged:profiles!challenges_challenged_id_fkey(*)
          `)
          .in('status', ['completed', 'live'])
          .order('updated_at', { ascending: false })
          .limit(limit);
        return { data, error };
      },
      options
    );
  }
}

// Export singleton instance
export const ChallengeService = new ChallengeServiceImpl();
