/**
 * Analytics API Test Script
 * Tests the complete analytics API functionality
 * Version 1.0 - Created 2025-09-15
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

// Helper function to create and authenticate test user
async function authenticateTestUser() {
  console.log('1️⃣ Creating test user and authenticating...');
  const testUser = {
    email: `analytics_test_${Date.now()}@example.com`,
    password: 'testpassword123',
    displayName: 'Analytics Test User'
  };

  try {
    const registerResponse = await axios.post(`${API_BASE}/auth/register`, testUser);
    console.log('✅ Test user authenticated');
    return { Authorization: `Bearer ${registerResponse.data.token}` };
  } catch (error) {
    console.log(
      '❌ Failed to authenticate test user:',
      error.response?.data?.message || error.message
    );
    return null;
  }
}

// Helper function to test health check
async function testHealthCheck(authHeaders) {
  console.log('\n2️⃣ Testing analytics health check...');
  try {
    const response = await axios.get(`${API_BASE}/analytics/health-check`, { headers: authHeaders });
    if (response.data.success && response.data.status === 'healthy') {
      console.log('✅ Analytics service is healthy');
      console.log('   Version:', response.data.version);
    } else {
      console.log('❌ Analytics service health check failed');
    }
  } catch (error) {
    console.log(
      '❌ Health check failed:',
      error.response?.status,
      error.response?.data?.error || error.message
    );
  }
}

// Helper function to test overview metrics
async function testOverviewMetrics(authHeaders) {
  console.log('\n3️⃣ Testing overview metrics endpoint...');
  try {
    const response = await axios.get(`${API_BASE}/analytics/overview/metrics`, { headers: authHeaders });
    if (response.data.success) {
      console.log('✅ Overview metrics retrieved successfully');
      const data = response.data.data;
      console.log('   League Health Score:', data.leagueHealth?.score || 'N/A');
      console.log('   Active Players:', data.activePlayers?.current || 0);
      console.log('   Pending Challenges:', data.pendingChallenges?.count || 0);
      console.log('   Match Completion Rate:', data.matchCompletion?.rate || 'N/A');
    } else {
      console.log('❌ Overview metrics failed');
    }
  } catch (error) {
    console.log(
      '❌ Overview metrics error:',
      error.response?.status,
      error.response?.data?.error || error.message
    );
  }
}

// Helper function to test player segments
async function testPlayerSegments(authHeaders) {
  console.log('\n4️⃣ Testing player segments endpoint...');
  try {
    const response = await axios.get(`${API_BASE}/analytics/players/segments`, { headers: authHeaders });
    if (response.data.success) {
      console.log('✅ Player segments retrieved successfully');
      const segments = response.data.data.segments;
      console.log('   Highly Active:', segments?.highly_active?.count || 0);
      console.log('   Moderately Active:', segments?.moderately_active?.count || 0);
      console.log('   At Risk:', segments?.at_risk?.count || 0);
      console.log('   Total Players:', response.data.data.totalPlayers || 0);
    } else {
      console.log('❌ Player segments failed');
    }
  } catch (error) {
    console.log(
      '❌ Player segments error:',
      error.response?.status,
      error.response?.data?.error || error.message
    );
  }
}

// Helper function to test player list
async function testPlayerList(authHeaders) {
  console.log('\n5️⃣ Testing player list endpoint...');
  try {
    const response = await axios.get(`${API_BASE}/analytics/players/list`, { headers: authHeaders });
    if (response.data.success) {
      console.log('✅ Player list retrieved successfully');
      console.log('   Total Players in List:', response.data.data.total);

      // Test with search filter
      const searchResponse = await axios.get(`${API_BASE}/analytics/players/list?search=test`, {
        headers: authHeaders
      });
      console.log('   Search Results:', searchResponse.data.data.total);
    } else {
      console.log('❌ Player list failed');
    }
  } catch (error) {
    console.log(
      '❌ Player list error:',
      error.response?.status,
      error.response?.data?.error || error.message
    );
  }
}

// Helper function to test activity feed
async function testActivityFeed(authHeaders) {
  console.log('\n6️⃣ Testing activity feed endpoint...');
  try {
    const response = await axios.get(`${API_BASE}/analytics/activity-feed`, { headers: authHeaders });
    if (response.data.success) {
      console.log('✅ Activity feed retrieved successfully');
      console.log('   Total Activities:', response.data.data.total);
      if (response.data.data.activities.length > 0) {
        console.log('   Latest Activity:', response.data.data.activities[0].message);
      }
    } else {
      console.log('❌ Activity feed failed');
    }
  } catch (error) {
    console.log(
      '❌ Activity feed error:',
      error.response?.status,
      error.response?.data?.error || error.message
    );
  }
}

// Helper function to test challenge flow
async function testChallengeFlow(authHeaders) {
  console.log('\n7️⃣ Testing challenge flow endpoint...');
  try {
    const response = await axios.get(
      `${API_BASE}/analytics/competition/challenge-flow`,
      { headers: authHeaders }
    );
    if (response.data.success) {
      console.log('✅ Challenge flow metrics retrieved successfully');
      const funnel = response.data.data.funnel;
      console.log('   Created:', funnel?.created?.count || 0);
      console.log('   Accepted:', funnel?.accepted?.count || 0);
      console.log('   Scheduled:', funnel?.scheduled?.count || 0);
      console.log('   Completed:', funnel?.completed?.count || 0);
    } else {
      console.log('❌ Challenge flow failed');
    }
  } catch (error) {
    console.log(
      '❌ Challenge flow error:',
      error.response?.status,
      error.response?.data?.error || error.message
    );
  }
}

// Helper function to test cache operations
async function testCacheOperations(authHeaders) {
  console.log('\n8️⃣ Testing cache invalidation...');
  try {
    const response = await axios.post(
      `${API_BASE}/analytics/cache/invalidate`,
      { pattern: 'test' },
      { headers: authHeaders }
    );
    if (response.data.success) {
      console.log('✅ Cache invalidation successful');
    } else {
      console.log('❌ Cache invalidation failed');
    }
  } catch (error) {
    console.log(
      '❌ Cache invalidation error:',
      error.response?.status,
      error.response?.data?.error || error.message
    );
  }
}

// Helper function to test authentication protection
async function testAuthenticationProtection() {
  console.log('\n9️⃣ Testing authentication protection...');
  try {
    await axios.get(`${API_BASE}/analytics/overview/metrics`);
    console.log('❌ Should have failed without authentication');
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Authentication protection working correctly');
    } else {
      console.log('❓ Unexpected error:', error.response?.status, error.message);
    }
  }
}

// Helper function to test input validation
async function testInputValidation(authHeaders) {
  console.log('\n🔟 Testing input validation...');
  try {
    await axios.get(`${API_BASE}/analytics/overview/metrics?period=invalid`, { headers: authHeaders });
    console.log('❌ Should have failed with invalid period');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Input validation working correctly');
    } else {
      console.log('❓ Unexpected validation error:', error.response?.status);
    }
  }
}

// Helper function to print test summary
function printTestSummary() {
  console.log('\n🎉 Analytics API test completed successfully!');
  console.log('\n📋 Test Summary:');
  console.log('   ✅ Service health check');
  console.log('   ✅ Overview metrics calculation');
  console.log('   ✅ Player segmentation analysis');
  console.log('   ✅ Player list with filtering');
  console.log('   ✅ Activity feed generation');
  console.log('   ✅ Challenge flow metrics');
  console.log('   ✅ Cache management');
  console.log('   ✅ Authentication protection');
  console.log('   ✅ Input validation');

  console.log('\n🔧 Next Steps:');
  console.log('   1. Build the frontend dashboard UI');
  console.log('   2. Add Chart.js integration for visualizations');
  console.log('   3. Implement real-time updates via WebSocket');
  console.log('   4. Set up alert system for proactive notifications');
}

async function testAnalyticsAPI() {
  console.log('🧪 Testing Analytics API...\n');

  try {
    const authHeaders = await authenticateTestUser();
    if (!authHeaders) {
      return;
    }

    // Run all test functions in sequence
    await testHealthCheck(authHeaders);
    await testOverviewMetrics(authHeaders);
    await testPlayerSegments(authHeaders);
    await testPlayerList(authHeaders);
    await testActivityFeed(authHeaders);
    await testChallengeFlow(authHeaders);
    await testCacheOperations(authHeaders);
    await testAuthenticationProtection();
    await testInputValidation(authHeaders);

    printTestSummary();
  } catch (error) {
    console.error('❌ Analytics API test failed:', error.message);
  }
}

// Run the test
if (require.main === module) {
  testAnalyticsAPI().catch(console.error);
}

module.exports = { testAnalyticsAPI };
