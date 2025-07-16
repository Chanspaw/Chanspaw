import { 
  User, 
  LoginSession, 
  TwoFactorAuth, 
  KYCVerification, 
  AMLCheck, 
  EmailVerification, 
  PhoneVerification,
  Address 
} from '../types';

// JWT Token Management
class TokenManager {
  private static readonly TOKEN_KEY = 'chanspaw_access_token';
  private static readonly REFRESH_TOKEN_KEY = 'chanspaw_refresh_token';

  static setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem(this.TOKEN_KEY, accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
  }

  static getAccessToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  static getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  static clearTokens() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }

  static isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }
}

// API Response Types
interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
}

interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  session: LoginSession;
  requiresTwoFactor: boolean;
  requiresKYC: boolean;
}

interface TwoFactorResponse {
  qrCode: string;
  secret: string;
  backupCodes: string[];
}

export class AuthAPI {
  private static baseURL = import.meta.env.VITE_API_URL + '/auth';

  // HTTP Client with JWT handling
  private static async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    const token = TokenManager.getAccessToken();
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, try to refresh
          const refreshed = await this.refreshToken();
          if (refreshed) {
            // Retry the original request
            return await this.request<T>(endpoint, options);
          }
        }
        throw new Error(data.message || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('Auth API Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  static async register(userData: {
    username: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    dateOfBirth?: string;
  }): Promise<APIResponse<{ user: User; accessToken: string; refreshToken?: string }>> {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();
      // Return user and accessToken if present
      return {
        success: response.ok,
        data: data.data && data.data.user && data.data.accessToken ? {
          user: data.data.user,
          accessToken: data.data.accessToken,
          refreshToken: data.data.refreshToken || undefined
        } : undefined,
        message: data.message || data.error
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: 'Registration failed'
      };
    }
  }

  static async login(credentials: {
    email: string;
    password: string;
    twoFactorCode?: string;
    deviceInfo?: any;
  }): Promise<APIResponse<LoginResponse>> {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();
      
      if (response.ok && data.data) {
        // Store tokens
        TokenManager.setTokens(data.data.accessToken, data.data.refreshToken || '');
      }
      
      return { 
        success: response.ok, 
        data: data.data,
        message: data.message || data.error
      };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: 'Login failed'
      };
    }
  }

  static async logout(): Promise<APIResponse> {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      return { 
        success: response.ok, 
        message: data.message || data.error
      };
    } catch (error) {
      return { success: false, message: 'Failed to logout' };
    }
  }

  // Clear all stored data (for testing)
  static clearAllData(): void {
    console.log('Clearing all stored data...');
    TokenManager.clearTokens();
  }

  // Email Verification
  static async sendEmailVerification(email: string): Promise<APIResponse> {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/auth/send-email-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      return { 
        success: response.ok, 
        message: data.message || data.error
      };
    } catch (error) {
      return { success: false, message: 'Failed to send verification email' };
    }
  }

  static async verifyEmail(token: string): Promise<APIResponse> {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token })
      });

      const data = await response.json();
      return { 
        success: response.ok, 
        message: data.message || data.error
      };
    } catch (error) {
      return { success: false, message: 'Failed to verify email' };
    }
  }

  // Two-Factor Authentication
  static async setupTwoFactor(userId: string): Promise<APIResponse<TwoFactorResponse>> {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/auth/setup-2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TokenManager.getAccessToken()}`
        },
        body: JSON.stringify({ userId })
      });

      const data = await response.json();
      return { 
        success: response.ok, 
        data: data.data,
        message: data.message || data.error
      };
    } catch (error) {
      return { success: false, error: 'Failed to setup two-factor authentication' };
    }
  }

  static async enableTwoFactor(userId: string, code: string): Promise<APIResponse> {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/auth/enable-2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TokenManager.getAccessToken()}`
        },
        body: JSON.stringify({ userId, code })
      });

      const data = await response.json();
      return { 
        success: response.ok, 
        message: data.message || data.error
      };
    } catch (error) {
      return { success: false, error: 'Failed to enable two-factor authentication' };
    }
  }

  static async disableTwoFactor(userId: string, code: string): Promise<APIResponse> {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/auth/disable-2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TokenManager.getAccessToken()}`
        },
        body: JSON.stringify({ userId, code })
      });

      const data = await response.json();
      return { 
        success: response.ok, 
        message: data.message || data.error
      };
    } catch (error) {
      return { success: false, error: 'Failed to disable two-factor authentication' };
    }
  }

  // KYC/AML
  static async submitKYC(userId: string, kycData: {
    type: 'identity' | 'address' | 'income' | 'source_of_funds';
    documents: File[];
    personalInfo: {
      firstName: string;
      lastName: string;
      dateOfBirth: string;
      nationality: string;
      address: Address;
    };
  }): Promise<APIResponse<KYCVerification>> {
    try {
      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('type', kycData.type);
      formData.append('personalInfo', JSON.stringify(kycData.personalInfo));
      
      kycData.documents.forEach((file, index) => {
        formData.append(`documents`, file);
      });

      const response = await fetch(import.meta.env.VITE_API_URL + '/auth/submit-kyc', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TokenManager.getAccessToken()}`
        },
        body: formData
      });

      const data = await response.json();
      return { 
        success: response.ok, 
        data: data.data,
        message: data.message || data.error
      };
    } catch (error) {
      return { success: false, error: 'Failed to submit KYC' };
    }
  }

  static async getKYCStatus(userId: string): Promise<APIResponse<KYCVerification[]>> {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/auth/kyc-status/' + userId, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${TokenManager.getAccessToken()}`
        }
      });

      const data = await response.json();
      return { 
        success: response.ok, 
        data: data.data,
        message: data.message || data.error
      };
    } catch (error) {
      return { success: false, error: 'Failed to get KYC status' };
    }
  }

  // Admin Methods
  static async getAllUsers(): Promise<APIResponse<User[]>> {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/api/admin/users', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${TokenManager.getAccessToken()}`
        }
      });

      const data = await response.json();
      return { 
        success: response.ok, 
        data: data.data,
        message: data.message || data.error
      };
    } catch (error) {
      return { success: false, error: 'Failed to get users' };
    }
  }

  static async getUserById(userId: string): Promise<APIResponse<User>> {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/api/admin/users/' + userId, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${TokenManager.getAccessToken()}`
        }
      });

      const data = await response.json();
      return { 
        success: response.ok, 
        data: data.data,
        message: data.message || data.error
      };
    } catch (error) {
      return { success: false, error: 'Failed to get user' };
    }
  }

  static async updateUser(userId: string, updates: Partial<User>): Promise<APIResponse<User>> {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/api/admin/users/' + userId, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TokenManager.getAccessToken()}`
        },
        body: JSON.stringify(updates)
      });

      const data = await response.json();
      return { 
        success: response.ok, 
        data: data.data,
        message: data.message || data.error
      };
    } catch (error) {
      return { success: false, error: 'Failed to update user' };
    }
  }

  static async approveKYC(kycId: string, adminId: string): Promise<APIResponse> {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/auth/approve-kyc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TokenManager.getAccessToken()}`
        },
        body: JSON.stringify({ kycId, adminId })
      });

      const data = await response.json();
      return { 
        success: response.ok, 
        message: data.message || data.error
      };
    } catch (error) {
      return { success: false, error: 'Failed to approve KYC' };
    }
  }

  static async rejectKYC(kycId: string, adminId: string, reason: string): Promise<APIResponse> {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/auth/reject-kyc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TokenManager.getAccessToken()}`
        },
        body: JSON.stringify({ kycId, adminId, reason })
      });

      const data = await response.json();
      return { 
        success: response.ok, 
        message: data.message || data.error
      };
    } catch (error) {
      return { success: false, error: 'Failed to reject KYC' };
    }
  }

  // Utility Methods
  private static async refreshToken(): Promise<boolean> {
    const refreshToken = TokenManager.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await this.request<{ accessToken: string; refreshToken: string }>('/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken })
      });

      if (response.success && response.data) {
        TokenManager.setTokens(response.data.accessToken, response.data.refreshToken);
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    return false;
  }
}

export { TokenManager };