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

async function testUserStatusUpdate() {
  try {
    console.log('Testing user status update...');
    
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

    if (loginResponse.status !== 200) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const token = loginResponse.data.data.accessToken;
    console.log('✅ Admin login successful');

    // Get users first to see current status
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

    const users = usersResponse.data.data.users;
    console.log(`Found ${users.length} users:`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.email}) - Active: ${user.isActive}`);
    });

    // Find a non-admin user to test with
    const testUser = users.find(user => !user.isAdmin);
    if (!testUser) {
      console.log('No non-admin users found to test with');
      return;
    }

    console.log(`\nTesting status update for user: ${testUser.username} (currently active: ${testUser.isActive})`);

    // Test suspend
    const suspendResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: `/api/admin/users/${testUser.id}/status`,
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }, {
      status: 'suspended'
    });

    console.log('Suspend response status:', suspendResponse.status);
    console.log('Suspend response:', JSON.stringify(suspendResponse.data, null, 2));

    if (suspendResponse.status !== 200) {
      throw new Error(`Suspend API failed: ${suspendResponse.status}`);
    }

    console.log('✅ Suspend successful');

    // Test activate
    const activateResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: `/api/admin/users/${testUser.id}/status`,
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }, {
      status: 'active'
    });

    console.log('Activate response status:', activateResponse.status);
    console.log('Activate response:', JSON.stringify(activateResponse.data, null, 2));

    if (activateResponse.status !== 200) {
      throw new Error(`Activate API failed: ${activateResponse.status}`);
    }

    console.log('✅ Activate successful');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testUserStatusUpdate(); 