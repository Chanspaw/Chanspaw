import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Shield, 
  Smartphone, 
  History, 
  Palette, 
  Globe, 
  Share2, 
  Trash2, 
  LogOut,
  Lock,
  Eye,
  QrCode,
  Bell,
  Moon,
  Sun,
  Check,
  ChevronRight,
  Settings as SettingsIcon,
  User,
  Key,
  Clock,
  Smartphone as MobileIcon,
  Monitor,
  Wifi,
  WifiOff
} from 'lucide-react';

export function Settings() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('security');
  const [faceIdEnabled, setFaceIdEnabled] = useState(false);
  const [authenticatorEnabled, setAuthenticatorEnabled] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [language, setLanguage] = useState('English');
  const [notifications, setNotifications] = useState(true);
  const [autoLock, setAutoLock] = useState(true);
  const [showClearCacheModal, setShowClearCacheModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loginHistory, setLoginHistory] = useState<any[]>([]);

  useEffect(() => {
    if (user?.id) {
      loadUserSettings();
    }
  }, [user?.id]);

  const loadUserSettings = async () => {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/api/users/settings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const settingsData = data.data || data;
        setFaceIdEnabled(settingsData.faceIdEnabled || false);
        setAuthenticatorEnabled(settingsData.authenticatorEnabled || false);
        setDarkMode(settingsData.darkMode !== false);
        setLanguage(settingsData.language || 'English');
        setNotifications(settingsData.notifications !== false);
        setAutoLock(settingsData.autoLock !== false);
        setLoginHistory(settingsData.loginHistory || []);
      } else {
        console.error('Failed to load user settings:', response.status);
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveUserSettings = async () => {
    try {
      const settings = {
        faceIdEnabled,
        authenticatorEnabled,
        darkMode,
        language,
        notifications,
        autoLock
      };

      const response = await fetch(import.meta.env.VITE_API_URL + '/api/users/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });
      
      if (response.ok) {
        console.log('Settings saved successfully');
      } else {
        console.error('Failed to save settings:', response.status);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleClearCache = () => {
    localStorage.clear();
    sessionStorage.clear();
    setShowClearCacheModal(false);
    alert('Cache cleared successfully!');
  };

  const handleLogout = () => {
    logout();
    setShowLogoutModal(false);
  };

  const shareApp = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Chanspaw Platform',
        text: 'Professional gaming and betting platform',
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  // Save settings when they change
  useEffect(() => {
    if (!loading && user?.id) {
      saveUserSettings();
    }
  }, [faceIdEnabled, authenticatorEnabled, darkMode, language, notifications, autoLock]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-card-gradient rounded-2xl shadow-lg border border-gray-700 p-6">
        <div className="flex items-center space-x-4">
          <div className="bg-gray-600 p-3 rounded-xl shadow-lg">
            <SettingsIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-medium text-white">Account Settings</h1>
            <p className="text-gray-400 mt-1">Manage your security and preferences</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-card-gradient rounded-2xl shadow-lg border border-gray-700 p-6">
        <div className="flex space-x-1 bg-gray-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('security')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-semibold transition-all ${
              activeTab === 'security'
                ? 'bg-gaming-accent text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Shield className="h-5 w-5" />
            <span>Security</span>
          </button>
          <button
            onClick={() => setActiveTab('app')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-semibold transition-all ${
              activeTab === 'app'
                ? 'bg-gaming-accent text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <SettingsIcon className="h-5 w-5" />
            <span>Preferences</span>
          </button>
        </div>
      </div>

      {/* Security Settings */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Face ID / Biometric */}
          <div className="bg-card-gradient rounded-2xl shadow-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-gray-600 p-3 rounded-xl">
                  <Eye className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-white">Biometric Authentication</h3>
                  <p className="text-gray-400">Use Face ID or fingerprint to access your account</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={faceIdEnabled}
                  onChange={(e) => setFaceIdEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gaming-accent"></div>
              </label>
            </div>
          </div>

          {/* Authenticator */}
          <div className="bg-card-gradient rounded-2xl shadow-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-gray-600 p-3 rounded-xl">
                  <QrCode className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-white">Two-Factor Authentication</h3>
                  <p className="text-gray-400">Add an extra layer of security to your account</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={authenticatorEnabled}
                  onChange={(e) => setAuthenticatorEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gaming-accent"></div>
              </label>
            </div>
            {authenticatorEnabled && (
              <div className="mt-4 p-4 bg-gray-800/50 rounded-xl border border-gray-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <QrCode className="h-5 w-5 text-gaming-accent" />
                    <span className="text-white font-medium">Setup Authenticator</span>
                  </div>
                  <button className="text-gaming-accent hover:text-gaming-gold transition-colors">
                    Configure
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Login History */}
          <div className="bg-card-gradient rounded-2xl shadow-lg border border-gray-700 p-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="bg-gray-600 p-3 rounded-xl">
                <History className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-base font-medium text-white">Login History</h3>
                <p className="text-gray-400">Recent account activity and device sessions</p>
              </div>
            </div>
            <div className="space-y-4">
              {loginHistory.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <History className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                  <p className="text-base font-medium">No login history available</p>
                  <p className="text-sm">Your recent login activity will appear here</p>
                </div>
              ) : (
                loginHistory.map((session, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-gray-700 rounded-lg">
                        {session.device.includes('iPhone') || session.device.includes('Samsung') ? (
                          <MobileIcon className="h-4 w-4 text-white" />
                        ) : (
                          <Monitor className="h-4 w-4 text-white" />
                        )}
                      </div>
                      <div>
                        <p className="text-white font-medium">{session.device}</p>
                        <p className="text-gray-400 text-sm">{session.location} • {session.time}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        session.status === 'Current' 
                          ? 'bg-green-600/20 text-green-400' 
                          : session.status === 'Active'
                          ? 'bg-blue-600/20 text-blue-400'
                          : 'bg-gray-600/20 text-gray-400'
                      }`}>
                        {session.status}
                      </span>
                      {session.status !== 'Current' && (
                        <button className="text-red-400 hover:text-red-300 transition-colors">
                          <WifiOff className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Application Settings */}
      {activeTab === 'app' && (
        <div className="space-y-6">
          {/* Theme */}
          <div className="bg-card-gradient rounded-2xl shadow-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-gray-600 p-3 rounded-xl">
                  <Palette className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-white">Theme</h3>
                  <p className="text-gray-400">Choose your preferred appearance</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setDarkMode(false)}
                  className={`p-2 rounded-lg transition-all ${
                    !darkMode ? 'bg-gaming-accent text-white' : 'bg-gray-700 text-gray-400 hover:text-white'
                  }`}
                >
                  <Sun className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setDarkMode(true)}
                  className={`p-2 rounded-lg transition-all ${
                    darkMode ? 'bg-gaming-accent text-white' : 'bg-gray-700 text-gray-400 hover:text-white'
                  }`}
                >
                  <Moon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Language */}
          <div className="bg-card-gradient rounded-2xl shadow-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-gray-600 p-3 rounded-xl">
                  <Globe className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-white">Language</h3>
                  <p className="text-gray-400">Select your preferred language</p>
                </div>
              </div>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-gaming-accent focus:outline-none"
              >
                <option>English</option>
                <option>Español</option>
                <option>Français</option>
                <option>Deutsch</option>
                <option>Italiano</option>
                <option>Português</option>
                <option>Русский</option>
                <option>中文</option>
                <option>日本語</option>
                <option>한국어</option>
              </select>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-card-gradient rounded-2xl shadow-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-gray-600 p-3 rounded-xl">
                  <Bell className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-white">Notifications</h3>
                  <p className="text-gray-400">Manage push notifications and alerts</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications}
                  onChange={(e) => setNotifications(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gaming-accent"></div>
              </label>
            </div>
          </div>

          {/* Share App */}
          <div className="bg-card-gradient rounded-2xl shadow-lg border border-gray-700 p-6">
            <button
              onClick={shareApp}
              className="w-full flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-gray-600 hover:bg-gray-700 transition-all"
            >
              <div className="flex items-center space-x-4">
                <div className="bg-gray-600 p-3 rounded-xl">
                  <Share2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-white">Share Platform</h3>
                  <p className="text-gray-400">Share Chanspaw with friends and colleagues</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          {/* Clear Cache */}
          <div className="bg-card-gradient rounded-2xl shadow-lg border border-gray-700 p-6">
            <button
              onClick={() => setShowClearCacheModal(true)}
              className="w-full flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-gray-600 hover:bg-gray-700 transition-all"
            >
              <div className="flex items-center space-x-4">
                <div className="bg-gray-600 p-3 rounded-xl">
                  <Trash2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-white">Clear Cache</h3>
                  <p className="text-gray-400">Free up storage space and clear temporary data</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          {/* Logout */}
          <div className="bg-card-gradient rounded-2xl shadow-lg border border-gray-700 p-6">
            <button
              onClick={() => setShowLogoutModal(true)}
              className="w-full flex items-center justify-between p-4 bg-red-600/20 rounded-xl border border-red-600/30 hover:bg-red-600/30 transition-all"
            >
              <div className="flex items-center space-x-4">
                <div className="bg-gray-600 p-3 rounded-xl">
                  <LogOut className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-white">Sign Out</h3>
                  <p className="text-gray-400">Securely sign out of your account</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        </div>
      )}

      {/* Clear Cache Modal */}
      {showClearCacheModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-700">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-gray-600 p-2 rounded-lg">
                <Trash2 className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-base font-medium text-white">Clear Cache</h3>
            </div>
            <p className="text-gray-300 mb-6">
              This will clear all cached data including login sessions, temporary files, and stored preferences. You'll need to sign in again.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowClearCacheModal(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-xl transition-all font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleClearCache}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl transition-all font-semibold"
              >
                Clear Cache
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-700">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-gray-600 p-2 rounded-lg">
                <LogOut className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-base font-medium text-white">Sign Out</h3>
            </div>
            <p className="text-gray-300 mb-6">
              Are you sure you want to sign out? You'll need to sign in again to access your account.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-xl transition-all font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl transition-all font-semibold"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 