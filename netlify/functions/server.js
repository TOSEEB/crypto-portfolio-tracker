const { handler: serverHandler } = require('../../server/api/index.js');

// Netlify serverless function wrapper
exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    // Convert Netlify event to Express-like request
    const req = {
      method: event.httpMethod,
      url: event.path,
      headers: event.headers,
      body: event.body ? JSON.parse(event.body) : {},
      query: event.queryStringParameters || {},
    };

    // Convert Express response to Netlify response
    let responseBody = '';
    let statusCode = 200;
    const res = {
      json: (data) => {
        responseBody = JSON.stringify(data);
      },
      status: (code) => {
        statusCode = code;
        return res;
      },
      send: (data) => {
        responseBody = data;
      },
    };

    // Call the Express app handler
    await new Promise((resolve, reject) => {
      serverHandler(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    return {
      statusCode,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: responseBody,
    };
  } catch (error) {
    console.error('Serverless function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
