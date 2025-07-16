import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { PaymentAPI } from '../services/paymentAPI';
import { AuthAPI, TokenManager } from '../services/authAPI';
import { resetSocket, testSocket } from '../utils/socket';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, twoFactorCode?: string) => Promise<{ success: boolean; message?: string; requiresTwoFactor?: boolean; requiresKYC?: boolean }>;
  register: (username: string, email: string, password: string, firstName?: string, lastName?: string, phoneNumber?: string, dateOfBirth?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  refreshWalletBalance: () => Promise<void>;
  // New authentication methods
  sendEmailVerification: (email: string) => Promise<{ success: boolean; message?: string }>;
  verifyEmail: (token: string) => Promise<{ success: boolean; message?: string }>;
  setupTwoFactor: () => Promise<{ success: boolean; data?: any; message?: string }>;
  enableTwoFactor: (code: string) => Promise<{ success: boolean; message?: string }>;
  disableTwoFactor: (code: string) => Promise<{ success: boolean; message?: string }>;
  submitKYC: (kycData: any) => Promise<{ success: boolean; message?: string }>;
  getKYCStatus: () => Promise<{ success: boolean; data?: any; message?: string }>;
  // Admin methods
  getAllUsers: () => Promise<{ success: boolean; data?: User[]; message?: string }>;
  updateUserById: (userId: string, updates: Partial<User>) => Promise<{ success: boolean; data?: User; message?: string }>;
  approveKYC: (kycId: string) => Promise<{ success: boolean; message?: string }>;
  rejectKYC: (kycId: string, reason: string) => Promise<{ success: boolean; message?: string }>;
  // Testing/Development methods
  clearAllData: () => void;
  // Loading states
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check for existing session on app load
    const checkAuth = async () => {
      const token = TokenManager.getAccessToken();
      if (token && !TokenManager.isTokenExpired(token)) {
        // Token exists and is valid, try to get user data
        try {
          // In production, validate token with backend
          // For now, we'll check if there's a cached user
          const cachedUser = localStorage.getItem('chanspaw_user');
          if (cachedUser) {
            const userData = JSON.parse(cachedUser);
            setUser(userData);
            setIsAuthenticated(true);
            
            // Refresh wallet balance
            await refreshWalletBalance();
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          TokenManager.clearTokens();
          localStorage.removeItem('chanspaw_user');
        }
      } else {
        // Clear invalid tokens
        TokenManager.clearTokens();
        localStorage.removeItem('chanspaw_user');
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string, twoFactorCode?: string) => {
    setIsLoading(true);
    try {
      const deviceInfo = {
        ip: '127.0.0.1', // In production, get from request
        userAgent: navigator.userAgent,
        deviceId: 'web-client',
        deviceType: 'desktop',
        browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Unknown',
        os: navigator.platform,
        location: 'Unknown'
      };

      const response = await AuthAPI.login({ email, password, twoFactorCode, deviceInfo });
      
      if (response.success && response.data) {
        const { user: userData, accessToken, refreshToken, requiresTwoFactor, requiresKYC } = response.data;
        
        setUser(userData);
        setIsAuthenticated(true);
        localStorage.setItem('chanspaw_user', JSON.stringify(userData));
        
        // Load real wallet balance
        await refreshWalletBalance();
        
        // Reset socket with new token
        resetSocket();
        
        // Test socket connection
        setTimeout(() => {
          testSocket();
        }, 1000);
        
        return { 
          success: true, 
          requiresTwoFactor, 
          requiresKYC,
          message: 'Login successful'
        };
      } else {
        return { 
          success: false, 
          message: response.error || 'Login failed'
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: 'An error occurred during login'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string, firstName?: string, lastName?: string, phoneNumber?: string, dateOfBirth?: string) => {
    setIsLoading(true);
    try {
      const response = await AuthAPI.register({ username, email, password, firstName, lastName, phoneNumber, dateOfBirth });
      
      if (response.success && response.data && response.data.user && response.data.accessToken) {
        // Auto-login: store user and token
        setUser(response.data.user);
        setIsAuthenticated(true);
        TokenManager.setTokens(response.data.accessToken, response.data.refreshToken || '');
        localStorage.setItem('chanspaw_user', JSON.stringify(response.data.user));
        // Load real wallet balance
        await refreshWalletBalance();
        // Reset socket with new token
        resetSocket();
        setTimeout(() => { testSocket(); }, 1000);
        return { 
          success: true, 
          message: response.message || 'Registration successful'
        };
      } else if (response.success) {
        return { 
          success: true, 
          message: response.message || 'Registration successful'
        };
      } else {
        return { 
          success: false, 
          message: response.error || 'Registration failed'
        };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        message: 'An error occurred during registration'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await AuthAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      TokenManager.clearTokens();
      localStorage.removeItem('chanspaw_user');
      // Reset socket after logout
      resetSocket();
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('chanspaw_user', JSON.stringify(updatedUser));
    }
  };

  const refreshWalletBalance = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/api/wallet/balance', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const balanceData = await response.json();
        if (balanceData.success && balanceData.data) {
          const updatedUser = { 
            ...user, 
            real_balance: balanceData.data.real_balance,
            virtual_balance: balanceData.data.virtual_balance
          };
          setUser(updatedUser);
          localStorage.setItem('chanspaw_user', JSON.stringify(updatedUser));
        }
      } else {
        console.error('Failed to refresh wallet balance:', response.status);
      }
    } catch (error) {
      console.error('Failed to refresh wallet balance:', error);
    }
  };

  // Email verification
  const sendEmailVerification = async (email: string) => {
    try {
      const response = await AuthAPI.sendEmailVerification(email);
      return { 
        success: response.success, 
        message: response.message || response.error
      };
    } catch (error) {
      return { success: false, message: 'Failed to send verification email' };
    }
  };

  const verifyEmail = async (token: string) => {
    try {
      const response = await AuthAPI.verifyEmail(token);
      if (response.success && user) {
        // Update user verification status
        const updatedUser = { ...user, emailVerified: true };
        setUser(updatedUser);
        localStorage.setItem('chanspaw_user', JSON.stringify(updatedUser));
      }
      return { 
        success: response.success, 
        message: response.message || response.error
      };
    } catch (error) {
      return { success: false, message: 'Failed to verify email' };
    }
  };

  // Two-factor authentication
  const setupTwoFactor = async () => {
    if (!user?.id) return { success: false, message: 'User not found' };
    
    try {
      const response = await AuthAPI.setupTwoFactor(user.id);
      return { 
        success: response.success, 
        data: response.data,
        message: response.message || response.error
      };
    } catch (error) {
      return { success: false, message: 'Failed to setup two-factor authentication' };
    }
  };

  const enableTwoFactor = async (code: string) => {
    if (!user?.id) return { success: false, message: 'User not found' };
    
    try {
      const response = await AuthAPI.enableTwoFactor(user.id, code);
      if (response.success && user) {
        const updatedUser = { ...user, twoFactorEnabled: true };
        setUser(updatedUser);
        localStorage.setItem('chanspaw_user', JSON.stringify(updatedUser));
      }
      return { 
        success: response.success, 
        message: response.message || response.error
      };
    } catch (error) {
      return { success: false, message: 'Failed to enable two-factor authentication' };
    }
  };

  const disableTwoFactor = async (code: string) => {
    if (!user?.id) return { success: false, message: 'User not found' };
    
    try {
      const response = await AuthAPI.disableTwoFactor(user.id, code);
      if (response.success && user) {
        const updatedUser = { ...user, twoFactorEnabled: false };
        setUser(updatedUser);
        localStorage.setItem('chanspaw_user', JSON.stringify(updatedUser));
      }
      return { 
        success: response.success, 
        message: response.message || response.error
      };
    } catch (error) {
      return { success: false, message: 'Failed to disable two-factor authentication' };
    }
  };

  // KYC/AML
  const submitKYC = async (kycData: any) => {
    if (!user?.id) return { success: false, message: 'User not found' };
    
    try {
      const response = await AuthAPI.submitKYC(user.id, kycData);
      if (response.success && user) {
        const updatedUser = { ...user, kycStatus: 'pending' as const };
        setUser(updatedUser);
        localStorage.setItem('chanspaw_user', JSON.stringify(updatedUser));
      }
      return { 
        success: response.success, 
        message: response.message || response.error
      };
    } catch (error) {
      return { success: false, message: 'Failed to submit KYC' };
    }
  };

  const getKYCStatus = async () => {
    if (!user?.id) return { success: false, message: 'User not found' };
    
    try {
      const response = await AuthAPI.getKYCStatus(user.id);
      return { 
        success: response.success, 
        data: response.data,
        message: response.message || response.error
      };
    } catch (error) {
      return { success: false, message: 'Failed to get KYC status' };
    }
  };

  // Admin methods
  const getAllUsers = async () => {
    if (!user?.isAdmin) return { success: false, message: 'Admin access required' };
    
    try {
      const response = await AuthAPI.getAllUsers();
      return { 
        success: response.success, 
        data: response.data,
        message: response.message || response.error
      };
    } catch (error) {
      return { success: false, message: 'Failed to get users' };
    }
  };

  const updateUserById = async (userId: string, updates: Partial<User>) => {
    if (!user?.isAdmin) return { success: false, message: 'Admin access required' };
    
    try {
      const response = await AuthAPI.updateUser(userId, updates);
      return { 
        success: response.success, 
        data: response.data,
        message: response.message || response.error
      };
    } catch (error) {
      return { success: false, message: 'Failed to update user' };
    }
  };

  const approveKYC = async (kycId: string) => {
    if (!user?.isAdmin) return { success: false, message: 'Admin access required' };
    
    try {
      const response = await AuthAPI.approveKYC(kycId, user.id);
      return { 
        success: response.success, 
        message: response.message || response.error
      };
    } catch (error) {
      return { success: false, message: 'Failed to approve KYC' };
    }
  };

  const rejectKYC = async (kycId: string, reason: string) => {
    if (!user?.isAdmin) return { success: false, message: 'Admin access required' };
    
    try {
      const response = await AuthAPI.rejectKYC(kycId, user.id, reason);
      return { 
        success: response.success, 
        message: response.message || response.error
      };
    } catch (error) {
      return { success: false, message: 'Failed to reject KYC' };
    }
  };

  // Testing/Development methods
  const clearAllData = () => {
    console.log('Clearing all authentication data...');
    AuthAPI.clearAllData();
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('chanspaw_user');
    console.log('All authentication data cleared');
  };

  // Expose clearAllData globally for debugging
  if (typeof window !== 'undefined') {
    (window as any).clearAuthData = clearAllData;
    console.log('Debug: clearAuthData() function available in console');
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      register, 
      logout, 
      updateUser, 
      refreshWalletBalance,
      sendEmailVerification,
      verifyEmail,
      setupTwoFactor,
      enableTwoFactor,
      disableTwoFactor,
      submitKYC,
      getKYCStatus,
      getAllUsers,
      updateUserById,
      approveKYC,
      rejectKYC,
      clearAllData,
      isLoading,
      isAuthenticated
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}