import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  User,
  Shield,
  Lock,
  History,
  X,
  Eye,
  EyeOff,
  Smartphone,
  Key,
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export function Profile() {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showTwoFactorModal, setShowTwoFactorModal] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [twoFactorStep, setTwoFactorStep] = useState<'setup' | 'verify' | 'backup' | 'disable'>('setup');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [qrCode, setQrCode] = useState('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='); // Placeholder
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [twoFactorError, setTwoFactorError] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [editForm, setEditForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
    bio: user?.bio || ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadUserProfile();
    }
  }, [user?.id]);

  const loadUserProfile = async () => {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const profileData = data.data || data;
        setEditForm({
          username: profileData.username || '',
          email: profileData.email || '',
          bio: profileData.bio || ''
        });
        setTwoFactorEnabled(profileData.twoFactorEnabled || false);
      } else {
        console.error('Failed to load user profile:', response.status);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  if (!user) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/api/users/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      });
      
      if (response.ok) {
        const data = await response.json();
        updateUser({
          ...user,
          ...editForm
        });
        setIsEditing(false);
        alert('Profile updated successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed to update profile: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditForm({
      username: user.username || '',
      email: user.email || '',
      bio: user.bio || ''
    });
    setIsEditing(false);
  };

  const handleTwoFactorAuth = () => {
    setShowTwoFactorModal(true);
    setTwoFactorStep('setup');
    setTwoFactorError('');
    setVerificationCode('');
    // In a real app, you would generate QR code and backup codes here
    // For now, we'll use placeholder data
    setQrCode('');
    setBackupCodes([]);
  };

  const handleTwoFactorSetup = () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setTwoFactorError('Please enter a valid 6-digit verification code');
      return;
    }
    
    // In a real app, you would verify the code with your backend
    // For now, we'll simulate successful verification
    setTwoFactorStep('backup');
    setTwoFactorError('');
  };

  const handleEnableTwoFactor = () => {
    setTwoFactorEnabled(true);
    setShowTwoFactorModal(false);
    setTwoFactorStep('setup');
    setVerificationCode('');
    setTwoFactorError('');
    alert('Two-Factor Authentication has been enabled successfully!');
  };

  const handleDisableTwoFactor = () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setTwoFactorError('Please enter a valid 6-digit verification code');
      return;
    }
    
    setTwoFactorEnabled(false);
    setShowTwoFactorModal(false);
    setTwoFactorStep('setup');
    setVerificationCode('');
    setTwoFactorError('');
    alert('Two-Factor Authentication has been disabled successfully!');
  };

  const handleViewLoginHistory = () => {
    alert('Login history will be available soon. This feature is currently under development.');
  };

  const handleChangePassword = () => {
    setShowPasswordModal(true);
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setPasswordError('');
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }));
    setPasswordError('');
  };

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/(?=.*\d)/.test(password)) {
      return 'Password must contain at least one number';
    }
    return '';
  };

  const handlePasswordSubmit = () => {
    // Validate current password (in real app, this would check against stored password)
    if (!passwordForm.currentPassword) {
      setPasswordError('Current password is required');
      return;
    }

    // Validate new password
    const newPasswordError = validatePassword(passwordForm.newPassword);
    if (newPasswordError) {
      setPasswordError(newPasswordError);
      return;
    }

    // Check if passwords match
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    // In a real application, you would send this to your backend
    // For now, we'll simulate a successful password change
    alert('Password changed successfully!');
    setShowPasswordModal(false);
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setPasswordError('');
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setPasswordError('');
  };

  const closeTwoFactorModal = () => {
    setShowTwoFactorModal(false);
    setTwoFactorStep('setup');
    setVerificationCode('');
    setTwoFactorError('');
  };

  const downloadBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const regenerateBackupCodes = () => {
    // In a real app, this would regenerate backup codes from the backend
    alert('Backup codes regeneration will be available when 2FA is properly implemented.');
  };

  return (
    <div className="w-96 bg-gaming-dark border-r border-gray-700 h-screen overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-lg font-bold text-white flex items-center">
          <User className="h-5 w-5 mr-2 text-gaming-accent" />
          Profile
        </h1>
        <div className="flex items-center justify-between mt-2">
          <p className="text-gray-400 text-xs">Manage your account settings</p>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="bg-gradient-to-r from-emerald-400 to-emerald-500 hover:opacity-90 text-white px-3 py-1 rounded text-xs font-medium transition-all"
          >
            {isEditing ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 space-y-4">
        {/* Profile Info */}
        <div className="bg-card-gradient rounded-lg p-3 border border-gray-700">
          <h2 className="text-sm font-semibold text-white mb-3">Personal Information</h2>
          
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2">
              <div>
                <label className="block text-gray-300 text-xs font-medium mb-1">User ID</label>
                <p className="text-white font-mono text-xs">{user.id}</p>
              </div>
              <div>
                <label className="block text-gray-300 text-xs font-medium mb-1">Username</label>
                <p className="text-white font-medium text-sm">{editForm.username}</p>
              </div>
              <div>
                <label className="block text-gray-300 text-xs font-medium mb-1">Email</label>
                <p className="text-white font-medium text-sm">{editForm.email}</p>
              </div>
            </div>

            <div>
              <label className="block text-gray-300 text-xs font-medium mb-1">Bio</label>
              {isEditing ? (
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  rows={2}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-gaming-accent focus:outline-none text-sm"
                  placeholder="Tell us about yourself..."
                />
              ) : (
                <p className="text-gray-300 text-sm">{editForm.bio || 'No bio added yet.'}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-300 text-xs font-medium mb-1">Join Date</label>
                <p className="text-gray-300 text-xs">{user.joinDate}</p>
              </div>
              
              <div>
                <label className="block text-gray-300 text-xs font-medium mb-1">Member Since</label>
                <p className="text-gray-300 text-xs">{user.joinDate}</p>
              </div>
            </div>
          </div>

          {isEditing && (
            <div className="flex space-x-2 mt-3">
              <button
                onClick={handleSave}
                className="flex-1 bg-gradient-to-r from-emerald-400 to-emerald-500 hover:opacity-90 text-white py-2 rounded font-medium transition-all text-sm"
              >
                Save Changes
              </button>
              <button
                onClick={handleCancel}
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded font-medium transition-all text-sm"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Account Security */}
        <div className="bg-card-gradient rounded-lg p-3 border border-gray-700">
          <h2 className="text-sm font-semibold text-white mb-3">Account Security</h2>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className={`p-1 rounded-lg ${twoFactorEnabled ? 'bg-green-600/20' : 'bg-red-600/20'}`}>
                  <Shield className={`w-4 h-4 ${twoFactorEnabled ? 'text-green-400' : 'text-red-400'}`} />
                </div>
                <div>
                  <h3 className="text-white font-medium text-sm">Two-Factor Authentication</h3>
                  <p className={`text-xs ${twoFactorEnabled ? 'text-green-400' : 'text-red-400'}`}>
                    {twoFactorEnabled ? 'Enabled' : 'Not configured'}
                  </p>
                </div>
              </div>
              <button 
                onClick={handleTwoFactorAuth}
                className="text-gaming-accent hover:text-white text-sm font-medium transition-colors"
              >
                {twoFactorEnabled ? 'Manage' : 'Setup'}
              </button>
            </div>

            <div className="flex items-center justify-between p-2 bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="p-1 bg-blue-600/20 rounded-lg">
                  <Lock className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium text-sm">Password</h3>
                  <p className="text-gray-400 text-xs">Last changed: Never</p>
                </div>
              </div>
              <button 
                onClick={handleChangePassword}
                className="text-gaming-accent hover:text-white text-sm font-medium transition-colors"
              >
                Change
              </button>
            </div>

            <div className="flex items-center justify-between p-2 bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="p-1 bg-purple-600/20 rounded-lg">
                  <History className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium text-sm">Login History</h3>
                  <p className="text-gray-400 text-xs">Last login: Today</p>
                </div>
              </div>
              <button 
                onClick={handleViewLoginHistory}
                className="text-gaming-accent hover:text-white text-sm font-medium transition-colors"
              >
                View
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-card-gradient rounded-lg border border-gray-700 p-4 sm:p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <Lock className="h-5 w-5 mr-2 text-gaming-accent" />
                Change Password
              </h3>
              <button
                onClick={closePasswordModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Current Password */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-gaming-accent focus:outline-none text-sm pr-10"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-gaming-accent focus:outline-none text-sm pr-10"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-gaming-accent focus:outline-none text-sm pr-10"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Password Requirements */}
              <div className="bg-gray-800 rounded-lg p-3">
                <h4 className="text-white text-sm font-medium mb-2">Password Requirements:</h4>
                <ul className="text-gray-300 text-xs space-y-1">
                  <li>• At least 8 characters long</li>
                  <li>• Contains at least one lowercase letter</li>
                  <li>• Contains at least one uppercase letter</li>
                  <li>• Contains at least one number</li>
                </ul>
              </div>

              {/* Error Message */}
              {passwordError && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{passwordError}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={handlePasswordSubmit}
                  className="flex-1 bg-gradient-to-r from-emerald-400 to-emerald-500 hover:opacity-90 text-white py-2 rounded-lg font-medium transition-all text-sm"
                >
                  Change Password
                </button>
                <button
                  onClick={closePasswordModal}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium transition-all text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Two-Factor Authentication Modal */}
      {showTwoFactorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-card-gradient rounded-lg border border-gray-700 p-4 sm:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <Shield className="h-5 w-5 mr-2 text-gaming-accent" />
                Two-Factor Authentication
              </h3>
              <button
                onClick={closeTwoFactorModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {twoFactorStep === 'setup' && (
              <div className="space-y-4">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <Smartphone className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-white font-medium text-sm mb-1">Setup Instructions</h4>
                      <ol className="text-gray-300 text-xs space-y-1">
                        <li>1. Download an authenticator app (Google Authenticator, Authy, etc.)</li>
                        <li>2. Scan the QR code below with your authenticator app</li>
                        <li>3. Enter the 6-digit code from your app to verify setup</li>
                        <li>4. Save your backup codes in a secure location</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-lg">
                    <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Verification Code</label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-gaming-accent focus:outline-none text-center text-lg tracking-widest"
                    placeholder="000000"
                    maxLength={6}
                  />
                  <p className="text-gray-400 text-xs mt-1">Enter the 6-digit code from your authenticator app</p>
                </div>

                {twoFactorError && (
                  <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
                    <p className="text-red-400 text-sm">{twoFactorError}</p>
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    onClick={handleTwoFactorSetup}
                    className="flex-1 bg-gradient-to-r from-emerald-400 to-emerald-500 hover:opacity-90 text-white py-2 rounded-lg font-medium transition-all text-sm"
                  >
                    Verify & Continue
                  </button>
                  <button
                    onClick={closeTwoFactorModal}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium transition-all text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {twoFactorStep === 'backup' && (
              <div className="space-y-4">
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <Key className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-white font-medium text-sm mb-1">Backup Codes</h4>
                      <p className="text-gray-300 text-xs">
                        Save these backup codes in a secure location. You can use them to access your account if you lose your authenticator device.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-2">
                    {backupCodes.map((code, index) => (
                      <div key={index} className="bg-gray-700 rounded px-3 py-2 text-center">
                        <span className="text-white font-mono text-sm">{code}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={downloadBackupCodes}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-all text-sm flex items-center justify-center space-x-1"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download</span>
                  </button>
                  <button
                    onClick={regenerateBackupCodes}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium transition-all text-sm flex items-center justify-center space-x-1"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Regenerate</span>
                  </button>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={handleEnableTwoFactor}
                    className="flex-1 bg-gradient-to-r from-emerald-400 to-emerald-500 hover:opacity-90 text-white py-2 rounded-lg font-medium transition-all text-sm flex items-center justify-center space-x-1"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Enable 2FA</span>
                  </button>
                  <button
                    onClick={closeTwoFactorModal}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium transition-all text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {twoFactorStep === 'disable' && (
              <div className="space-y-4">
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-white font-medium text-sm mb-1">Disable Two-Factor Authentication</h4>
                      <p className="text-gray-300 text-xs">
                        Enter your verification code to disable 2FA. This will make your account less secure.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Verification Code</label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-gaming-accent focus:outline-none text-center text-lg tracking-widest"
                    placeholder="000000"
                    maxLength={6}
                  />
                </div>

                {twoFactorError && (
                  <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
                    <p className="text-red-400 text-sm">{twoFactorError}</p>
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    onClick={handleDisableTwoFactor}
                    className="flex-1 bg-gradient-to-r from-emerald-400 to-emerald-500 hover:opacity-90 text-white py-2 rounded-lg font-medium transition-all text-sm"
                  >
                    Disable 2FA
                  </button>
                  <button
                    onClick={closeTwoFactorModal}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium transition-all text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 