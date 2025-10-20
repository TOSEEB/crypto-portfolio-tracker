const axios = require('axios');

const BASE_URL = 'https://mycryptoportfoliotracker.netlify.app';

async function testAPI(endpoint, method = 'GET', data = null) {
  try {
    console.log(`\n🧪 Testing ${method} ${endpoint}...`);
    
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`📊 Response:`, JSON.stringify(response.data, null, 2));
    
    return { success: true, data: response.data };
  } catch (error) {
    console.log(`❌ Error: ${error.response?.status || error.message}`);
    if (error.response?.data) {
      console.log(`📊 Error Response:`, JSON.stringify(error.response.data, null, 2));
    }
    return { success: false, error: error.message };
  }
}

async function runAllTests() {
  console.log('🚀 Testing Netlify Deployed APIs...');
  console.log('=' .repeat(50));
  
  const results = [];
  
  // Test 1: Basic health check
  results.push(await testAPI('/api/test'));
  
  // Test 2: Crypto data
  results.push(await testAPI('/api/crypto'));
  
  // Test 3: Portfolio (should be empty initially)
  results.push(await testAPI('/api/portfolio'));
  
  // Test 4: Portfolio summary
  results.push(await testAPI('/api/portfolio/summary'));
  
  // Test 5: Debug endpoints
  results.push(await testAPI('/api/debug-crypto'));
  results.push(await testAPI('/api/debug-db'));
  
  // Test 6: Add crypto to portfolio
  const testCrypto = {
    crypto_id: 'bitcoin',
    crypto_name: 'Bitcoin',
    crypto_symbol: 'BTC',
    amount: 0.001,
    purchase_price: 50000
  };
  results.push(await testAPI('/api/portfolio', 'POST', testCrypto));
  
  // Test 7: Check portfolio after adding crypto
  results.push(await testAPI('/api/portfolio'));
  
  // Test 8: Check portfolio summary after adding crypto
  results.push(await testAPI('/api/portfolio/summary'));
  
  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('📋 TEST SUMMARY');
  console.log('=' .repeat(50));
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${results.length}`);
  
  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Your Netlify deployment is working perfectly!');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
  }
}

// Run the tests
runAllTests().catch(console.error);
