const jwt = require('jsonwebtoken');
const https = require('https');
const http = require('http');

// Create admin token
const token = jwt.sign({id: 'admin', isAdmin: true}, 'your-secret-key');

// Test API using http module
const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/admin/platform-revenue/breakdown',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const jsonData = JSON.parse(data);
      console.log('API Response:', JSON.stringify(jsonData, null, 2));
    } catch (error) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.end(); 