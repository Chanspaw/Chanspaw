import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Crown, Mail, Lock, Eye, EyeOff } from 'lucide-react';

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

export default function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      const result = await login(email, password, showTwoFactor ? twoFactorCode : undefined);
      
      if (result.success) {
        if (result.requiresTwoFactor && !showTwoFactor) {
          setShowTwoFactor(true);
          setSuccess('Please enter your two-factor authentication code');
        } else if (result.requiresKYC) {
          setSuccess('Login successful! KYC verification required for large transactions.');
        } else {
          setSuccess('Login successful!');
        }
      } else {
        setError(result.message || 'Login failed');
      }
    } catch (error) {
      setError('An error occurred during login');
    }
  };

  const handleResendCode = () => {
    setError('');
    setSuccess('Two-factor code resent to your authenticator app');
  };

  return (
    <div className="min-h-screen bg-gaming-gradient flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-gaming-card rounded-2xl shadow-2xl p-6 sm:p-8 border border-gray-700">
          <div className="text-center mb-6 sm:mb-8">
            <div className="flex items-center justify-center mb-4">
              <Crown className="h-10 w-10 sm:h-12 sm:w-12 text-gaming-gold" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Chanspaw</h1>
            <p className="text-gray-400 text-sm sm:text-base">1v1 Gaming Platform</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-green-400 text-sm">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {!showTwoFactor ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 sm:pl-12 pr-4 py-3 bg-gaming-dark border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-gaming-accent focus:border-transparent text-sm sm:text-base"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 sm:pl-12 pr-12 py-3 bg-gaming-dark border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-gaming-accent focus:border-transparent text-sm sm:text-base"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-200 transition-colors rounded focus:outline-none"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" />
                      ) : (
                        <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-emerald-400 to-emerald-500 text-white font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity text-sm sm:text-base"
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Two-Factor Authentication Code
                  </label>
                  <input
                    type="text"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    className="w-full px-4 py-3 bg-gaming-dark border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-gaming-accent focus:border-transparent text-center text-lg tracking-widest"
                    placeholder="000000"
                    maxLength={6}
                    required
                  />
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    Enter the 6-digit code from your authenticator app
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowTwoFactor(false)}
                    className="flex-1 bg-gaming-dark hover:bg-gaming-accent text-white font-medium py-3 px-4 rounded-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-gaming-accent focus:ring-offset-2 focus:ring-offset-gaming-dark"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-gradient-to-r from-emerald-400 to-emerald-500 text-white font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity text-sm sm:text-base"
                  >
                    {isLoading ? 'Verifying...' : 'Verify'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleResendCode}
                  className="w-full text-gaming-accent hover:text-gaming-gold text-sm transition duration-200"
                >
                  Didn't receive code? Resend
                </button>
              </>
            )}
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Don't have an account?{' '}
              <button
                onClick={onSwitchToRegister}
                className="text-gaming-accent hover:text-gaming-gold font-medium"
              >
                Sign up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}