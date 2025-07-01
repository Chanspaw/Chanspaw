import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Lock, User, Shield, Phone, Calendar, AlertTriangle, Eye, EyeOff, Crown } from 'lucide-react';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export default function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const { register, isLoading } = useAuth();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    dateOfBirth: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateAge = (dateOfBirth: string): boolean => {
    if (!dateOfBirth) return false;
    
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    
    // Check if the date is valid
    if (isNaN(birthDate.getTime())) {
      console.log('Invalid date format:', dateOfBirth);
      return false;
    }
    
    // Calculate age by comparing dates
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    // If birthday hasn't occurred yet this year, subtract 1 from age
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    // Debug logging
    console.log('Date of Birth:', dateOfBirth);
    console.log('Birth Date:', birthDate.toISOString());
    console.log('Today:', today.toISOString());
    console.log('Calculated Age:', age);
    console.log('Is 18 or older:', age >= 18);
    
    return age >= 18;
  };

  const validateForm = () => {
    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword || !formData.dateOfBirth) {
      setError('Please fill in all required fields');
      return false;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (!validateAge(formData.dateOfBirth)) {
      // Calculate age for error message
      const today = new Date();
      const birthDate = new Date(formData.dateOfBirth);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      setError(`You must be at least 18 years old to register. Your calculated age is ${age} years.`);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) return;

    try {
      const result = await register(
        formData.username,
        formData.email,
        formData.password,
        formData.firstName,
        formData.lastName,
        formData.phoneNumber,
        formData.dateOfBirth
      );

      if (result.success) {
        setSuccess('Registration successful! You can now log in.');
        // Redirect to login after a short delay
        setTimeout(() => {
          onSwitchToLogin();
        }, 2000);
      } else {
        setError(result.message || 'Registration failed');
      }
    } catch (error) {
      setError('An error occurred during registration');
    }
  };

  return (
    <div className="min-h-screen bg-gaming-gradient flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-gaming-card rounded-2xl shadow-2xl p-6 sm:p-8 border border-gray-700">
          <div className="text-center mb-6 sm:mb-8">
            <div className="flex items-center justify-center mb-4">
              <Crown className="h-10 w-10 sm:h-12 sm:w-12 text-gaming-gold" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Create Account</h1>
            <p className="text-gray-400 text-sm sm:text-base">Join Chanspaw and start gaming</p>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-300 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gaming-dark border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-gaming-accent focus:border-transparent text-sm sm:text-base"
                  placeholder="First name"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-300 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gaming-dark border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-gaming-accent focus:border-transparent text-sm sm:text-base"
                  placeholder="Last name"
                />
              </div>
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                Username *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full pl-10 sm:pl-12 pr-4 py-3 bg-gaming-dark border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-gaming-accent focus:border-transparent text-sm sm:text-base"
                  placeholder="Choose a username"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-10 sm:pl-12 pr-4 py-3 bg-gaming-dark border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-gaming-accent focus:border-transparent text-sm sm:text-base"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-300 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                <input
                  type="tel"
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  className="w-full pl-10 sm:pl-12 pr-4 py-3 bg-gaming-dark border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-gaming-accent focus:border-transparent text-sm sm:text-base"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            <div>
              <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-300 mb-2">
                Date of Birth *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                <input
                  type="date"
                  id="dateOfBirth"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  className="w-full pl-10 sm:pl-12 pr-4 py-3 bg-gaming-dark border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-gaming-accent focus:border-transparent text-sm sm:text-base"
                  required
                />
              </div>
              <div className="flex items-center mt-2 text-xs text-yellow-400">
                <AlertTriangle className="h-3 w-3 mr-1" />
                <span>You must be at least 18 years old to register</span>
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-10 sm:pl-12 pr-12 py-3 bg-gaming-dark border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-gaming-accent focus:border-transparent text-sm sm:text-base"
                  placeholder="Create a strong password"
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
              <p className="text-xs text-gray-400 mt-1">Must be at least 8 characters long</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password *
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full pl-10 sm:pl-12 pr-12 py-3 bg-gaming-dark border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-gaming-accent focus:border-transparent text-sm sm:text-base"
                  placeholder="Confirm your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-200 transition-colors rounded focus:outline-none"
                >
                  {showConfirmPassword ? (
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
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Already have an account?{' '}
              <button
                onClick={onSwitchToLogin}
                className="text-gaming-accent hover:text-gaming-gold font-medium"
              >
                Sign in
              </button>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-700">
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-2">By creating an account, you agree to our</p>
              <div className="text-xs text-gray-400 space-y-1">
                <p>
                  <button className="text-gaming-accent hover:text-gaming-gold">Terms of Service</button>
                  {' '}and{' '}
                  <button className="text-gaming-accent hover:text-gaming-gold">Privacy Policy</button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 