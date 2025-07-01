// Auto-login as admin script
// Run this in the browser console to login as admin

const adminCredentials = {
  email: 'admin@chanspaw.com',
  password: 'Chanspaw@2025!'
};

async function autoLoginAsAdmin() {
  try {
    console.log('🚀 Attempting to login as admin...');
    
    const response = await fetch('http://localhost:3001/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(adminCredentials)
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      // Store tokens in localStorage
      localStorage.setItem('chanspaw_access_token', data.data.accessToken);
      localStorage.setItem('chanspaw_refresh_token', data.data.refreshToken);
      
      console.log('✅ Successfully logged in as admin!');
      console.log('👤 User:', data.data.user);
      console.log('🔑 Tokens stored in localStorage');
      
      // Refresh the page to update the UI
      console.log('🔄 Refreshing page...');
      window.location.reload();
    } else {
      console.error('❌ Login failed:', data.message);
    }
  } catch (error) {
    console.error('❌ Login error:', error);
  }
}

// Run the auto-login
autoLoginAsAdmin(); 