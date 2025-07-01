// Auto-login utility for admin
// This can be called from anywhere in the app

interface LoginResult {
  success: boolean;
  user?: any;
  error?: string;
}

export const autoLoginAsAdmin = async (): Promise<LoginResult> => {
  const adminCredentials = {
    email: 'admin@chanspaw.com',
    password: 'Chanspaw@2025!'
  };

  try {
    console.log('🚀 Attempting to login as admin...');
    
    const response = await fetch(import.meta.env.VITE_API_URL + '/auth/login', {
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
      
      return { success: true, user: data.data.user };
    } else {
      console.error('❌ Login failed:', data.message);
      return { success: false, error: data.message };
    }
  } catch (error) {
    console.error('❌ Login error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Function to check if user is admin
export const isAdmin = (): boolean => {
  const user = JSON.parse(localStorage.getItem('chanspaw_user') || '{}');
  return user.role === 'admin' || user.email === 'admin@chanspaw.com';
};

// Function to get current user
export const getCurrentUser = (): any => {
  return JSON.parse(localStorage.getItem('chanspaw_user') || 'null');
};

// Function to set current user
export const setCurrentUser = (user: any): void => {
  localStorage.setItem('chanspaw_user', JSON.stringify(user));
};

// Function to check if user is logged in
export const isLoggedIn = (): boolean => {
  const token = localStorage.getItem('chanspaw_access_token');
  const user = localStorage.getItem('chanspaw_user');
  return !!(token && user);
}

// Function to get access token
export const getAccessToken = (): string | null => {
  return localStorage.getItem('chanspaw_access_token');
};

// Function to get refresh token
export const getRefreshToken = (): string | null => {
  return localStorage.getItem('chanspaw_refresh_token');
};

// Function to clear all auth data
export const clearAuthData = (): void => {
  localStorage.removeItem('chanspaw_access_token');
  localStorage.removeItem('chanspaw_refresh_token');
  localStorage.removeItem('chanspaw_user');
}; 