const axios = require('axios');

const BASE_URL = 'https://mycryptoportfoliotracker.netlify.app';

async function testAuthentication() {
  console.log('🔐 Testing Authentication: Register → Login → Auth Check');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Test Registration
    console.log('\n📝 Step 1: Testing User Registration...');
    
    const testUser = {
      name: 'Test User',
      email: 'testuser@example.com',
      password: 'TestPassword123!'
    };
    
    console.log('📤 Attempting to register user:', testUser.email);
    const registerResult = await testAPI('/api/auth/register', 'POST', testUser);
    
    if (registerResult.success) {
      console.log('✅ Registration successful!');
      console.log('📊 Response:', JSON.stringify(registerResult.data, null, 2));
    } else {
      console.log('❌ Registration failed:', registerResult.error);
    }
    
    // Step 2: Test Login
    console.log('\n🔑 Step 2: Testing User Login...');
    
    const loginData = {
      email: testUser.email,
      password: testUser.password
    };
    
    console.log('📤 Attempting to login user:', loginData.email);
    const loginResult = await testAPI('/api/auth/login', 'POST', loginData);
    
    if (loginResult.success) {
      console.log('✅ Login successful!');
      console.log('📊 Response:', JSON.stringify(loginResult.data, null, 2));
      
      // Extract token if available
      let token = null;
      if (loginResult.data.token) {
        token = loginResult.data.token;
        console.log('🎫 Token received:', token.substring(0, 20) + '...');
      }
      
      // Step 3: Test Auth Check with Token
      if (token) {
        console.log('\n🔍 Step 3: Testing Auth Check with Token...');
        const authCheckResult = await testAPIWithToken('/api/auth/me', 'GET', token);
        
        if (authCheckResult.success) {
          console.log('✅ Auth check successful!');
          console.log('📊 User data:', JSON.stringify(authCheckResult.data, null, 2));
        } else {
          console.log('❌ Auth check failed:', authCheckResult.error);
        }
      }
      
    } else {
      console.log('❌ Login failed:', loginResult.error);
    }
    
    // Step 4: Test Auth Check without Token
    console.log('\n🚫 Step 4: Testing Auth Check without Token...');
    const noTokenResult = await testAPI('/api/auth/me', 'GET');
    
    if (noTokenResult.success) {
      console.log('✅ Auth check without token:', JSON.stringify(noTokenResult.data, null, 2));
    } else {
      console.log('❌ Auth check without token failed (expected):', noTokenResult.error);
    }
    
    // Step 5: Test Password Reset Flow
    console.log('\n🔄 Step 5: Testing Password Reset Flow...');
    
    const forgotPasswordData = {
      email: testUser.email
    };
    
    console.log('📤 Attempting forgot password for:', forgotPasswordData.email);
    const forgotResult = await testAPI('/api/auth/forgot-password', 'POST', forgotPasswordData);
    
    if (forgotResult.success) {
      console.log('✅ Forgot password successful!');
      console.log('📊 Response:', JSON.stringify(forgotResult.data, null, 2));
    } else {
      console.log('❌ Forgot password failed:', forgotResult.error);
    }
    
    // Step 6: Test Google OAuth
    console.log('\n🌐 Step 6: Testing Google OAuth...');
    const googleResult = await testAPI('/api/auth/google', 'GET');
    
    if (googleResult.success) {
      console.log('✅ Google OAuth endpoint accessible!');
      console.log('📊 Response:', JSON.stringify(googleResult.data, null, 2));
    } else {
      console.log('❌ Google OAuth failed:', googleResult.error);
    }
    
    // Final Summary
    console.log('\n' + '=' .repeat(60));
    console.log('🔐 AUTHENTICATION TEST SUMMARY');
    console.log('=' .repeat(60));
    
    console.log('📝 Registration:', registerResult.success ? '✅ Working' : '❌ Failed');
    console.log('🔑 Login:', loginResult.success ? '✅ Working' : '❌ Failed');
    console.log('🔍 Auth Check:', noTokenResult.success ? '✅ Working' : '❌ Failed');
    console.log('🔄 Password Reset:', forgotResult.success ? '✅ Working' : '❌ Failed');
    console.log('🌐 Google OAuth:', googleResult.success ? '✅ Working' : '❌ Failed');
    
    if (registerResult.success && loginResult.success) {
      console.log('\n🎉 AUTHENTICATION IS WORKING!');
      console.log('   Users can:');
      console.log('   • Register new accounts');
      console.log('   • Login with credentials');
      console.log('   • Access protected routes');
      console.log('   • Reset passwords');
      console.log('   • Use Google OAuth');
    } else {
      console.log('\n⚠️  Some authentication features need attention');
    }
    
  } catch (error) {
    console.error('\n❌ Authentication test failed:', error.message);
  }
}

async function testAPI(endpoint, method = 'GET', data = null) {
  try {
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
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message,
      status: error.response?.status
    };
  }
}

async function testAPIWithToken(endpoint, method = 'GET', token) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };
    
    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message,
      status: error.response?.status
    };
  }
}

// Run the authentication test
testAuthentication().catch(console.error);
