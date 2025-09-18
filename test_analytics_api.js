// Quick test script for analytics API
const fetch = require('node-fetch');

async function testAnalyticsAPI() {
  try {
    // First login to get a token
    console.log('Logging in...');
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@test.com',
        password: 'password'
      })
    });

    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);

    if (loginData.token) {
      // Test analytics overview endpoint
      console.log('\nTesting analytics overview...');
      const analyticsResponse = await fetch(
        'http://localhost:3001/api/analytics/overview/metrics?period=30d',
        {
          headers: {
            Authorization: `Bearer ${loginData.token}`
          }
        }
      );

      const analyticsData = await analyticsResponse.json();
      console.log('Analytics response:', analyticsData);
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAnalyticsAPI();
