/**
 * Supabase Connection Test Script
 *
 * This script verifies:
 * 1. Supabase connection is working
 * 2. Can fetch from ladder_view (or profiles as fallback)
 * 3. Data structure is correct
 *
 * Run with: npx ts-node scripts/test-supabase-connection.ts
 */

/* eslint-disable no-console */
// Console statements are intentionally used in this CLI test script for output

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Create Supabase client for testing (without AsyncStorage for Node.js)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface Player {
    id: string;
    display_name: string;
    spot_rank: number;
    fargo_rating?: number;
    points?: number;
    cooldown_until?: string | null;
}

interface TestResult {
    test: string;
    success: boolean;
    message: string;
    data?: any;
    error?: any;
}

const results: TestResult[] = [];

function logResult(result: TestResult) {
    results.push(result);
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.test}: ${result.message}`);
    if (result.error) {
        console.log(`   Error details: ${JSON.stringify(result.error)}`);
    }
}

async function testEnvironmentVariables(): Promise<TestResult> {
    const test = 'Environment Variables';

    if (!SUPABASE_URL) {
        return { test, success: false, message: 'EXPO_PUBLIC_SUPABASE_URL is not set' };
    }

    if (!SUPABASE_ANON_KEY) {
        return { test, success: false, message: 'EXPO_PUBLIC_SUPABASE_ANON_KEY is not set' };
    }

    return {
        test,
        success: true,
        message: `URL: ${SUPABASE_URL.substring(0, 30)}...`
    };
}

async function testSupabaseConnection(): Promise<TestResult> {
    const test = 'Supabase Connection';

    try {
        // Simple query to verify connection
        const { data, error } = await supabase
            .from('profiles')
            .select('count', { count: 'exact', head: true });

        if (error) {
            return { test, success: false, message: 'Connection failed', error };
        }

        return { test, success: true, message: 'Successfully connected to Supabase' };
    } catch (err) {
        return { test, success: false, message: 'Connection exception', error: err };
    }
}

async function testLadderView(): Promise<TestResult> {
    const test = 'Fetch from ladder_view';

    try {
        const { data, error } = await supabase
            .from('ladder_view')
            .select('*')
            .order('spot_rank', { ascending: true })
            .limit(10);

        if (error) {
            // Check if it's a "table not found" error
            if (error.message?.includes('does not exist') || error.code === '42P01') {
                return {
                    test,
                    success: false,
                    message: 'ladder_view does not exist - may need to create it',
                    error: { code: error.code, message: error.message, hint: error.hint }
                };
            }
            return { test, success: false, message: 'Query failed', error };
        }

        if (!data || data.length === 0) {
            return { test, success: true, message: 'ladder_view exists but is empty', data: [] };
        }

        return {
            test,
            success: true,
            message: `Successfully fetched ${data.length} players from ladder_view`,
            data: data.slice(0, 3)  // Show first 3 for brevity
        };
    } catch (err) {
        return { test, success: false, message: 'Query exception', error: err };
    }
}

async function testUsersProfiles(): Promise<TestResult> {
    const test = 'Fetch from profiles (fallback)';

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, display_name, spot_rank, fargo_rating, points, cooldown_until')
            .order('spot_rank', { ascending: true })
            .limit(10);

        if (error) {
            return { test, success: false, message: 'Query failed', error };
        }

        if (!data || data.length === 0) {
            return { test, success: true, message: 'profiles table is empty', data: [] };
        }

        // Validate data structure
        const firstPlayer = data[0] as Player;
        const hasRequiredFields =
            'id' in firstPlayer &&
            'display_name' in firstPlayer &&
            'spot_rank' in firstPlayer;

        if (!hasRequiredFields) {
            return {
                test,
                success: false,
                message: 'Data structure is missing required fields',
                data: Object.keys(firstPlayer)
            };
        }

        return {
            test,
            success: true,
            message: `Successfully fetched ${data.length} players from profiles`,
            data: data.slice(0, 3).map((p: Player) => ({
                display_name: p.display_name,
                spot_rank: p.spot_rank
            }))
        };
    } catch (err) {
        return { test, success: false, message: 'Query exception', error: err };
    }
}

async function testRealTimeCapability(): Promise<TestResult> {
    const test = 'Real-time Channel Subscription';

    return new Promise((resolve) => {
        try {
            const channel = supabase
                .channel('test-connection')
                .on('postgres_changes',
                    { event: '*', schema: 'public', table: 'profiles' },
                    (payload) => {
                        console.log('   Received change:', payload);
                    }
                )
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        // Successfully subscribed, clean up
                        channel.unsubscribe();
                        resolve({
                            test,
                            success: true,
                            message: 'Real-time subscription successful'
                        });
                    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                        resolve({
                            test,
                            success: false,
                            message: `Subscription failed with status: ${status}`
                        });
                    }
                });

            // Timeout after 5 seconds
            setTimeout(() => {
                channel.unsubscribe();
                resolve({
                    test,
                    success: false,
                    message: 'Subscription timed out after 5 seconds'
                });
            }, 5000);
        } catch (err) {
            resolve({ test, success: false, message: 'Subscription exception', error: err });
        }
    });
}

async function runAllTests() {
    console.log('\n🔍 Supabase Connection Test Suite');
    console.log('='.repeat(50));
    console.log();

    // Test 1: Environment Variables
    logResult(await testEnvironmentVariables());

    // Test 2: Basic Connection
    logResult(await testSupabaseConnection());

    // Test 3: ladder_view
    logResult(await testLadderView());

    // Test 4: profiles (fallback/verification)
    logResult(await testUsersProfiles());

    // Test 5: Real-time
    logResult(await testRealTimeCapability());

    // Summary
    console.log('\n' + '='.repeat(50));
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    console.log(`📊 Summary: ${passed} passed, ${failed} failed`);

    if (failed > 0) {
        console.log('\n⚠️  Some tests failed. Review the errors above.');

        // Provide specific guidance for ladder_view
        const ladderViewResult = results.find(r => r.test === 'Fetch from ladder_view');
        if (ladderViewResult && !ladderViewResult.success && ladderViewResult.error?.message?.includes('does not exist')) {
            console.log('\n📝 Note: ladder_view does not exist. You may need to create it:');
            console.log('   Run the following SQL in Supabase SQL Editor:');
            console.log(`
   CREATE OR REPLACE VIEW ladder_view AS
   SELECT
       id,
       display_name,
       spot_rank,
       fargo_rating,
       points,
       cooldown_until,
       avatar_url,
       created_at,
       updated_at
   FROM profiles
   ORDER BY spot_rank ASC;
            `);
        }
    } else {
        console.log('\n✨ All tests passed! Supabase connection is working correctly.');
    }

    // Return exit code
    process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(console.error);
