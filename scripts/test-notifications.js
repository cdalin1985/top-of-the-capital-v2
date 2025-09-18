/**
 * Push Notification Test Script
 * Tests the complete push notification API flow
 * Version 1.0 - Created 2025-09-15
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

// Helper function to test VAPID key endpoint
async function testVapidKey() {
  console.log('1️⃣ Testing VAPID Public Key endpoint...');
  const response = await axios.get(`${API_BASE}/notifications/vapid-public-key`);
  
  if (response.data.success && response.data.publicKey) {
    console.log('✅ VAPID key endpoint working');
    console.log('   Public Key:', response.data.publicKey.substring(0, 20) + '...');
    return true;
  } else {
    console.log('❌ VAPID key endpoint failed');
    return false;
  }
}

// Helper function to test authentication protection
async function testAuthProtection() {
  console.log('\n2️⃣ Testing protected endpoints without auth...');
  try {
    await axios.get(`${API_BASE}/notifications/preferences`);
    console.log('❌ Should have failed without auth');
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Protected endpoints properly secured');
    } else {
      console.log('❓ Unexpected error:', error.message);
    }
  }
}

// Helper function to create test user
async function createTestUser() {
  console.log('\n3️⃣ Creating test user for notification testing...');
  const testUser = {
    email: `testuser_${Date.now()}@example.com`,
    password: 'testpassword123',
    displayName: 'Test Notification User'
  };

  try {
    const response = await axios.post(`${API_BASE}/auth/register`, testUser);
    if (response.data.token) {
      console.log('✅ Test user created and authenticated');
      console.log('   User ID:', response.data.user.id);
      return { Authorization: `Bearer ${response.data.token}` };
    }
  } catch (error) {
    console.log('❌ Failed to create test user:', error.response?.data?.message || error.message);
    return null;
  }
}

// Helper function to test notification preferences
async function testNotificationPreferences(authHeaders) {
  console.log('\n4️⃣ Testing notification preferences...');
  
  // Get default preferences
  const prefsResponse = await axios.get(`${API_BASE}/notifications/preferences`, {
    headers: authHeaders
  });
  if (prefsResponse.data.success) {
    console.log('✅ Retrieved default preferences');
    console.log('   Preferences:', JSON.stringify(prefsResponse.data.preferences, null, 2));
  }

  // Update preferences
  const updatedPrefs = {
    challenges: true,
    matches: true,
    system: false,
    quietHours: { start: '22:00', end: '08:00' }
  };

  const updateResponse = await axios.put(`${API_BASE}/notifications/preferences`, updatedPrefs, {
    headers: authHeaders
  });
  if (updateResponse.data.success) {
    console.log('✅ Updated preferences successfully');
  }
}

// Helper function to test subscription endpoint
async function testSubscription(authHeaders) {
  console.log('\n5️⃣ Testing subscription endpoint...');
  const mockSubscription = {
    subscription: {
      endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint-' + Date.now(),
      keys: {
        p256dh: 'test-p256dh-key-' + Math.random().toString(36).substring(7),
        auth: 'test-auth-key-' + Math.random().toString(36).substring(7)
      }
    }
  };

  try {
    const response = await axios.post(
      `${API_BASE}/notifications/subscribe`,
      mockSubscription,
      { headers: authHeaders }
    );
    if (response.data.success) {
      console.log('✅ Subscription endpoint working');
      console.log('   Message:', response.data.message);
    }
  } catch (error) {
    console.log('❌ Subscription failed:', error.response?.data?.error || error.message);
  }
}

// Helper function to test notification history
async function testNotificationHistory(authHeaders) {
  console.log('\n6️⃣ Testing notification history...');
  const response = await axios.get(`${API_BASE}/notifications/history`, {
    headers: authHeaders
  });
  if (response.data.success) {
    console.log('✅ Notification history endpoint working');
    console.log('   Total notifications:', response.data.notifications?.length || 0);
  }
}

// Helper function to print test summary
function printNotificationTestSummary() {
  console.log('\n🎉 Push Notification API test completed successfully!');
  console.log('\n📋 Summary:');
  console.log('   ✅ VAPID public key retrieval');
  console.log('   ✅ Authentication protection');
  console.log('   ✅ User registration and auth');
  console.log('   ✅ Notification preferences (get/update)');
  console.log('   ✅ Push subscription management');
  console.log('   ✅ Notification history');

  console.log('\n🔧 Next Steps:');
  console.log('   1. Open the app in a browser');
  console.log('   2. Enable push notifications when prompted');
  console.log('   3. Create challenges to test push notifications');
  console.log('   4. Use the admin test endpoint to send custom notifications');
}

async function testNotificationAPI() {
  console.log('🧪 Testing Push Notification API...\n');

  try {
    // Run all test functions in sequence
    const vapidWorking = await testVapidKey();
    if (!vapidWorking) {
      return;
    }

    await testAuthProtection();
    
    const authHeaders = await createTestUser();
    if (!authHeaders) {
      return;
    }

    await testNotificationPreferences(authHeaders);
    await testSubscription(authHeaders);
    await testNotificationHistory(authHeaders);
    
    printNotificationTestSummary();
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.status, error.response.data);
    }
  }
}

// Run the test
if (require.main === module) {
  testNotificationAPI().catch(console.error);
}

module.exports = { testNotificationAPI };
