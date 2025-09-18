// Create a test user for dashboard testing
const fetch = require('node-fetch');

async function createTestUser() {
  try {
    console.log('Creating test user...');
    const response = await fetch('http://localhost:3001/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test User'
      })
    });

    const data = await response.json();
    console.log('Registration response:', data);

    if (data.token) {
      console.log('✅ Test user created successfully!');
      console.log('📧 Email: test@example.com');
      console.log('🔑 Password: password123');

      // Test the analytics endpoint
      console.log('\n🔍 Testing analytics access...');
      const analyticsResponse = await fetch(
        'http://localhost:3001/api/analytics/overview/metrics?period=30d',
        {
          headers: {
            Authorization: `Bearer ${data.token}`
          }
        }
      );

      const analyticsData = await analyticsResponse.json();
      console.log('Analytics API response:', analyticsData);
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

createTestUser();
