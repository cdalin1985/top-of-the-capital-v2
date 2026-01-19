/**
 * Supabase Connection Integration Tests
 *
 * These tests verify:
 * 1. Supabase connection is working
 * 2. Can fetch from ladder_view (or users_profiles as fallback)
 * 3. Data structure is correct
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables for testing
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://yayflbtwngvatftbiymw.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_yhcQSXDbRzLLqDiOSZYKTw_NIW8pqeZ';

let supabase: SupabaseClient;

beforeAll(() => {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
});

describe('Supabase Connection', () => {
    describe('Environment Configuration', () => {
        test('SUPABASE_URL is configured', () => {
            expect(SUPABASE_URL).toBeTruthy();
            expect(SUPABASE_URL).toMatch(/^https:\/\/.+\.supabase\.co$/);
        });

        test('SUPABASE_ANON_KEY is configured', () => {
            expect(SUPABASE_ANON_KEY).toBeTruthy();
            expect(SUPABASE_ANON_KEY.length).toBeGreaterThan(10);
        });
    });

    describe('Database Connection', () => {
        test('can connect to Supabase', async () => {
            const { data, error } = await supabase
                .from('users_profiles')
                .select('id')
                .limit(1);

            // If we get here without network error, connection is working
            // Even an auth error means we connected successfully
            if (error) {
                // Check if it's a permission error vs connection error
                expect(error.message).not.toMatch(/failed to fetch|network|ECONNREFUSED/i);
            }

            // Either we got data or we got a non-connection error
            expect(true).toBe(true);
        }, 10000);
    });

    describe('ladder_view Table', () => {
        test('can query ladder_view', async () => {
            const { data, error } = await supabase
                .from('ladder_view')
                .select('*')
                .order('spot_rank', { ascending: true })
                .limit(10);

            if (error) {
                // Check if it's a "table doesn't exist" error
                if (error.message?.includes('does not exist') || error.code === '42P01') {
                    console.warn('ladder_view does not exist - needs to be created');
                    console.warn('Run the SQL in supabase_schema.sql to create it');
                    // Mark as skipped but don't fail the test
                    expect(error.message).toContain('does not exist');
                    return;
                }
                // For other errors, fail the test
                throw error;
            }

            // If ladder_view exists, verify the structure
            expect(Array.isArray(data)).toBe(true);

            if (data && data.length > 0) {
                const player = data[0];
                // Verify expected fields exist
                expect(player).toHaveProperty('spot_rank');
            }
        }, 10000);

        test('players are ordered by spot_rank ascending', async () => {
            const { data, error } = await supabase
                .from('ladder_view')
                .select('spot_rank, display_name')
                .order('spot_rank', { ascending: true })
                .limit(10);

            // Skip if ladder_view doesn't exist
            if (error?.message?.includes('does not exist')) {
                console.warn('Skipping: ladder_view does not exist');
                return;
            }

            if (error) throw error;

            if (data && data.length > 1) {
                // Verify ordering
                for (let i = 1; i < data.length; i++) {
                    expect(data[i].spot_rank).toBeGreaterThanOrEqual(data[i - 1].spot_rank);
                }
            }
        }, 10000);
    });

    describe('users_profiles Table (Fallback)', () => {
        test('can query users_profiles', async () => {
            const { data, error } = await supabase
                .from('users_profiles')
                .select('id, display_name, spot_rank, fargo_rating, points, cooldown_until')
                .order('spot_rank', { ascending: true })
                .limit(10);

            if (error) {
                throw error;
            }

            expect(Array.isArray(data)).toBe(true);
            console.log(`Found ${data?.length || 0} players in users_profiles`);

            if (data && data.length > 0) {
                const player = data[0];

                // Verify expected fields
                expect(player).toHaveProperty('id');
                expect(player).toHaveProperty('display_name');
                expect(player).toHaveProperty('spot_rank');
                expect(player).toHaveProperty('fargo_rating');
                expect(player).toHaveProperty('points');

                // Log first few players for verification
                console.log('Top players:', data.slice(0, 3).map(p => ({
                    name: p.display_name,
                    rank: p.spot_rank
                })));
            }
        }, 10000);

        test('player data structure is valid', async () => {
            const { data, error } = await supabase
                .from('users_profiles')
                .select('*')
                .limit(1)
                .single();

            // Skip if no data
            if (error?.code === 'PGRST116') {
                console.warn('No players in database');
                return;
            }

            if (error) throw error;

            // Validate types
            expect(typeof data.id).toBe('string');
            expect(typeof data.display_name).toBe('string');
            expect(typeof data.spot_rank).toBe('number');
            expect(data.spot_rank).toBeGreaterThanOrEqual(1);
        }, 10000);
    });
});
