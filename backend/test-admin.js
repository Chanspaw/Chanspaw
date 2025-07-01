const http = require('http');

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testAdminAPI() {
  try {
    console.log('Testing admin API...');
    
    // First, login as admin to get token
    const loginResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      email: 'admin@chanspaw.com',
      password: 'Chanspaw@2025!'
    });

    console.log('Login response status:', loginResponse.status);
    
    if (loginResponse.status !== 200) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const token = loginResponse.data.data.accessToken;
    console.log('✅ Admin login successful');
    console.log('Token:', token.substring(0, 50) + '...');

    // Test admin users endpoint
    const usersResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/admin/users',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Users response status:', usersResponse.status);
    
    if (usersResponse.status !== 200) {
      throw new Error(`Users API failed: ${usersResponse.status}`);
    }

    console.log('\n✅ Admin users API response:');
    console.log('Users count:', usersResponse.data.data.users.length);
    
    usersResponse.data.data.users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.email}) - Admin: ${user.isAdmin}`);
    });

    // Test admin transactions endpoint
    const transactionsResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/admin/transactions',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('\nTransactions response status:', transactionsResponse.status);
    
    if (transactionsResponse.status !== 200) {
      throw new Error(`Transactions API failed: ${transactionsResponse.status}`);
    }

    console.log('✅ Admin transactions API response:');
    console.log('Transactions count:', transactionsResponse.data.data.transactions.length);

    // Test admin support tickets endpoint
    const supportResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/admin/support-tickets',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('\nSupport tickets response status:', supportResponse.status);
    
    if (supportResponse.status !== 200) {
      throw new Error(`Support tickets API failed: ${supportResponse.status}`);
    }

    console.log('✅ Admin support tickets API response:');
    console.log('Support tickets count:', supportResponse.data.data.tickets.length);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAdminAPI(); 