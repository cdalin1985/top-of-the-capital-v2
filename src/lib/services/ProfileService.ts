/**
 * ProfileService - Cached profile data operations
 * Phase 6: Offline Caching with Sync Queue
 */

import { supabase } from '../supabase';
import { Profile } from '../../types';
import { cacheManager } from '../cache/CacheManager';
import { syncService } from '../cache/SyncService';
import { CACHE_CONFIG } from '../cache/constants';
import { BaseService, FetchOptions, ServiceResult } from './BaseService';

/**
 * ProfileService handles all profile-related data operations
 * with caching and offline support
 */
class ProfileServiceImpl extends BaseService<Profile> {
  protected table = 'profiles' as const;
  protected cachePrefix = 'profiles';
  protected defaultTTL = CACHE_CONFIG.profilesTTL;

  /**
   * Get a single profile by ID
   */
  async getById(id: string, options?: FetchOptions): Promise<ServiceResult<Profile>> {
    const cacheKey = this.getCacheKey(id);

    return this.fetchWithCache<Profile>(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single();
        return { data, error };
      },
      options
    );
  }

  /**
   * Get profile by owner ID (authenticated user)
   */
  async getByOwnerId(ownerId: string, options?: FetchOptions): Promise<ServiceResult<Profile>> {
    const cacheKey = `@totc/cache/profiles/owner/${ownerId}`;

    return this.fetchWithCache<Profile>(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('owner_id', ownerId)
          .single();
        return { data, error };
      },
      options
    );
  }

  /**
   * Get all profiles (for leaderboard)
   */
  async getAll(options?: FetchOptions): Promise<ServiceResult<Profile[]>> {
    const cacheKey = this.getListCacheKey('all');

    return this.fetchWithCache<Profile[]>(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('ladder_rank', { ascending: true });
        return { data, error };
      },
      options
    );
  }

  /**
   * Get profiles sorted by points (leaderboard)
   */
  async getLeaderboard(options?: FetchOptions): Promise<ServiceResult<Profile[]>> {
    const cacheKey = this.getListCacheKey('leaderboard');

    return this.fetchWithCache<Profile[]>(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('points', { ascending: false })
          .order('fargo_rating', { ascending: false });
        return { data, error };
      },
      options
    );
  }

  /**
   * Get profiles sorted by ladder rank
   */
  async getByLadderRank(options?: FetchOptions): Promise<ServiceResult<Profile[]>> {
    const cacheKey = this.getListCacheKey('ladder');

    return this.fetchWithCache<Profile[]>(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('ladder_rank', { ascending: true });
        return { data, error };
      },
      options
    );
  }

  /**
   * Search profiles by name
   */
  async search(query: string, options?: FetchOptions): Promise<ServiceResult<Profile[]>> {
    const cacheKey = this.getListCacheKey(`search/${query.toLowerCase()}`);

    return this.fetchWithCache<Profile[]>(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .ilike('full_name', `%${query}%`)
          .order('full_name', { ascending: true })
          .limit(20);
        return { data, error };
      },
      options
    );
  }

  /**
   * Get unclaimed profiles
   */
  async getUnclaimed(options?: FetchOptions): Promise<ServiceResult<Profile[]>> {
    const cacheKey = this.getListCacheKey('unclaimed');

    return this.fetchWithCache<Profile[]>(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .is('owner_id', null)
          .order('full_name', { ascending: true });
        return { data, error };
      },
      options
    );
  }

  /**
   * Update profile
   */
  async update(id: string, updates: Partial<Profile>): Promise<ServiceResult<Profile>> {
    return this.updateWithOptimisticCache(
      id,
      updates,
      async () => {
        const { data, error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        return { data, error };
      }
    );
  }

  /**
   * Claim a profile (set owner_id)
   */
  async claim(profileId: string, ownerId: string): Promise<ServiceResult<Profile>> {
    return this.updateWithOptimisticCache(
      profileId,
      { owner_id: ownerId },
      async () => {
        const { data, error } = await supabase
          .from('profiles')
          .update({ owner_id: ownerId })
          .eq('id', profileId)
          .is('owner_id', null) // Only claim if unclaimed
          .select()
          .single();
        return { data, error };
      }
    );
  }

  /**
   * Update cooldown
   */
  async updateCooldown(id: string, cooldownUntil: string | null): Promise<ServiceResult<Profile>> {
    return this.updateWithOptimisticCache(
      id,
      { cooldown_until: cooldownUntil },
      async () => {
        const { data, error } = await supabase
          .from('profiles')
          .update({ cooldown_until: cooldownUntil })
          .eq('id', id)
          .select()
          .single();
        return { data, error };
      }
    );
  }

  /**
   * Update push token
   */
  async updatePushToken(id: string, token: string | null): Promise<ServiceResult<Profile>> {
    return this.updateWithOptimisticCache(
      id,
      { expo_push_token: token },
      async () => {
        const { data, error } = await supabase
          .from('profiles')
          .update({ expo_push_token: token })
          .eq('id', id)
          .select()
          .single();
        return { data, error };
      }
    );
  }

  /**
   * Create a new profile
   */
  async create(profile: Omit<Profile, 'id' | 'created_at' | 'updated_at'>): Promise<ServiceResult<Profile>> {
    return this.insertWithCache(
      profile,
      async () => {
        const { data, error } = await supabase
          .from('profiles')
          .insert(profile)
          .select()
          .single();
        return { data, error };
      }
    );
  }

  /**
   * Get multiple profiles by IDs
   */
  async getByIds(ids: string[], options?: FetchOptions): Promise<ServiceResult<Profile[]>> {
    if (ids.length === 0) {
      return { data: [], error: null, fromCache: true, isStale: false };
    }

    // Try to get from cache first
    if (!options?.forceRefresh) {
      const cacheKeys = ids.map((id) => this.getCacheKey(id));
      const cached = await cacheManager.getMany<Profile>(cacheKeys);

      const profiles: Profile[] = [];
      const missingIds: string[] = [];

      for (const id of ids) {
        const profile = cached.get(this.getCacheKey(id));
        if (profile) {
          profiles.push(profile);
        } else {
          missingIds.push(id);
        }
      }

      // If all found in cache, return
      if (missingIds.length === 0) {
        return { data: profiles, error: null, fromCache: true, isStale: false };
      }

      // Fetch missing from server
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .in('id', missingIds);

        if (error) {
          // Return what we have from cache
          return {
            data: profiles.length > 0 ? profiles : null,
            error: new Error(error.message),
            fromCache: true,
            isStale: true,
          };
        }

        if (data) {
          // Cache the new profiles
          for (const profile of data) {
            await cacheManager.set(
              this.getCacheKey(profile.id),
              profile,
              this.defaultTTL
            );
          }
          profiles.push(...data);
        }

        return {
          data: profiles,
          error: null,
          fromCache: false,
          isStale: false,
        };
      } catch (error: any) {
        return {
          data: profiles.length > 0 ? profiles : null,
          error: error,
          fromCache: true,
          isStale: true,
        };
      }
    }

    // Force refresh - fetch all from server
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('id', ids);

    if (error) {
      return {
        data: null,
        error: new Error(error.message),
        fromCache: false,
        isStale: false,
      };
    }

    // Cache all
    if (data) {
      for (const profile of data) {
        await cacheManager.set(
          this.getCacheKey(profile.id),
          profile,
          this.defaultTTL
        );
      }
    }

    return {
      data: data || [],
      error: null,
      fromCache: false,
      isStale: false,
    };
  }
}

// Export singleton instance
export const ProfileService = new ProfileServiceImpl();
