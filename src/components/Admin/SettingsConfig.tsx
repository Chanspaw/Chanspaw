import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  Globe, 
  Clock, 
  Shield, 
  Users, 
  Mail, 
  Image,
  Upload,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Edit, 
  Plus, 
  Trash2, 
  X, 
  Download,
  Copy,
  Check,
  AlertCircle,
  Zap,
  Gamepad2,
  Lock,
  Unlock,
  Database,
  Server,
  Monitor,
  Bell,
  Palette,
  Languages,
  DollarSign,
  RefreshCw
} from 'lucide-react';

interface PlatformSettings {
  siteName: string;
  siteDescription: string;
  supportEmail: string;
  adminEmail: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  maintenanceMessage: string;
  termsOfServiceUrl: string;
  privacyPolicyUrl: string;
}

interface MaintenanceSettings {
  isMaintenanceMode: boolean;
  maintenanceStartTime: string;
  maintenanceEndTime: string;
  allowedIPs: string[];
  maintenanceMessage: string;
  showMaintenancePage: boolean;
}

interface LocalizationSettings {
  defaultTimezone: string;
  defaultLanguage: string;
  dateFormat: string;
  timeFormat: string;
  currency: string;
  currencySymbol: string;
  availableLanguages: string[];
  availableTimezones: string[];
}

interface MatchSettings {
  defaultMatchTimeout: number;
  maxMatchDuration: number;
  autoForfeitTime: number;
  rematchCooldown: number;
  maxConcurrentMatches: number;
  enableSpectators: boolean;
  allowReplays: boolean;
}

interface RegistrationSettings {
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  requirePhoneVerification: boolean;
  allowSocialLogin: boolean;
  minPasswordLength: number;
  requireStrongPassword: boolean;
  allowGuestAccess: boolean;
  maxLoginAttempts: number;
  lockoutDuration: number;
}

interface PlatformConfig {
  platformFeePercent: number;
}

export function SettingsConfig() {
  const [activeTab, setActiveTab] = useState<'general' | 'maintenance' | 'localization' | 'matches' | 'registration'>('general');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'logo' | 'backup' | 'restore'>('logo');
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Platform Settings - Load from API only
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);

  // Maintenance Settings - Load from API only
  const [maintenanceSettings, setMaintenanceSettings] = useState<MaintenanceSettings | null>(null);

  // Localization Settings - Load from API only
  const [localizationSettings, setLocalizationSettings] = useState<LocalizationSettings | null>(null);

  // Match Settings - Load from API only
  const [matchSettings, setMatchSettings] = useState<MatchSettings | null>(null);

  // Registration Settings - Load from API only
  const [registrationSettings, setRegistrationSettings] = useState<RegistrationSettings | null>(null);

  // Platform Config - Load from API only
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
    loadPlatformConfig();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/api/admin/settings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPlatformSettings(data.platform || null);
        setMaintenanceSettings(data.maintenance || null);
        setLocalizationSettings(data.localization || null);
        setMatchSettings(data.matches || null);
        setRegistrationSettings(data.registration || null);
      } else {
        // Set to null if API fails
        setPlatformSettings(null);
        setMaintenanceSettings(null);
        setLocalizationSettings(null);
        setMatchSettings(null);
        setRegistrationSettings(null);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setPlatformSettings(null);
      setMaintenanceSettings(null);
      setLocalizationSettings(null);
      setMatchSettings(null);
      setRegistrationSettings(null);
    } finally {
      setLoading(false);
    }
  };

  const loadPlatformConfig = async () => {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/api/admin/platform-fee', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPlatformConfig(data.data || null);
      } else {
        setPlatformConfig(null);
      }
    } catch (error) {
      console.error('Error loading platform config:', error);
      setPlatformConfig(null);
    }
  };

  const handleSave = async (settingsType: string) => {
    setIsSaving(true);
    try {
      const settingsToSave = {
        platform: platformSettings,
        maintenance: maintenanceSettings,
        localization: localizationSettings,
        matches: matchSettings,
        registration: registrationSettings
      };

      const response = await fetch(import.meta.env.VITE_API_URL + '/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settingsToSave)
      });

      if (response.ok) {
        alert(`${settingsType} settings saved successfully!`);
      } else {
        console.error('Failed to save settings:', response.status);
        alert('Error saving settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMaintenanceToggle = () => {
    const newValue = !maintenanceSettings?.isMaintenanceMode;
    setMaintenanceSettings(prev => ({
      ...prev,
      isMaintenanceMode: newValue
    }));
    
    if (newValue) {
      if (confirm('Are you sure you want to enable maintenance mode? This will restrict access to the platform.')) {
        console.log('Maintenance mode enabled');
      } else {
        setMaintenanceSettings(prev => ({
          ...prev,
          isMaintenanceMode: false
        }));
      }
    } else {
      console.log('Maintenance mode disabled');
    }
  };

  const savePlatformConfig = async () => {
    setIsSaving(true);
    setMessage(null);
    
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/api/admin/platform-fee', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          platformFeePercent: platformConfig?.platformFeePercent || 0
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessage({ type: 'success', text: data.message || 'Platform configuration saved successfully' });
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.error || 'Failed to save platform configuration' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error saving platform configuration' });
    } finally {
      setIsSaving(false);
    }
  };

  const renderGeneralTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">General Platform Settings</h3>
        <button
          onClick={() => handleSave('General')}
          disabled={isSaving}
          className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center space-x-2"
        >
          <Save className="h-4 w-4" />
          <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="bg-gaming-dark rounded-lg p-6 border border-gray-700">
          <h4 className="text-white font-medium mb-4 flex items-center">
            <Info className="h-5 w-5 mr-2 text-gaming-accent" />
            Basic Information
          </h4>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Site Name</label>
              <input
                type="text"
                value={platformSettings?.siteName}
                onChange={(e) => setPlatformSettings(prev => ({ ...prev, siteName: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Site Description</label>
              <textarea
                value={platformSettings?.siteDescription}
                onChange={(e) => setPlatformSettings(prev => ({ ...prev, siteDescription: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Support Email</label>
              <input
                type="email"
                value={platformSettings?.supportEmail}
                onChange={(e) => setPlatformSettings(prev => ({ ...prev, supportEmail: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Admin Email</label>
              <input
                type="email"
                value={platformSettings?.adminEmail}
                onChange={(e) => setPlatformSettings(prev => ({ ...prev, adminEmail: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
              />
            </div>
          </div>
        </div>

        {/* Branding */}
        <div className="bg-gaming-dark rounded-lg p-6 border border-gray-700">
          <h4 className="text-white font-medium mb-4 flex items-center">
            <Palette className="h-5 w-5 mr-2 text-gaming-accent" />
            Branding & Appearance
          </h4>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Logo URL</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={platformSettings?.logoUrl}
                  onChange={(e) => setPlatformSettings(prev => ({ ...prev, logoUrl: e.target.value }))}
                  placeholder="https://example.com/logo.png"
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
                />
                <button className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:opacity-90">
                  <Upload className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Primary Color</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={platformSettings?.primaryColor}
                  onChange={(e) => setPlatformSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                  className="w-12 h-10 rounded border border-gray-600"
                />
                <input
                  type="text"
                  value={platformSettings?.primaryColor}
                  onChange={(e) => setPlatformSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
                />
              </div>
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Secondary Color</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={platformSettings?.secondaryColor}
                  onChange={(e) => setPlatformSettings(prev => ({ ...prev, secondaryColor: e.target.value }))}
                  className="w-12 h-10 rounded border border-gray-600"
                />
                <input
                  type="text"
                  value={platformSettings?.secondaryColor}
                  onChange={(e) => setPlatformSettings(prev => ({ ...prev, secondaryColor: e.target.value }))}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Legal URLs */}
        <div className="bg-gaming-dark rounded-lg p-6 border border-gray-700">
          <h4 className="text-white font-medium mb-4 flex items-center">
            <Shield className="h-5 w-5 mr-2 text-gaming-accent" />
            Legal & Policies
          </h4>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Terms of Service URL</label>
              <input
                type="text"
                value={platformSettings?.termsOfServiceUrl}
                onChange={(e) => setPlatformSettings(prev => ({ ...prev, termsOfServiceUrl: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Privacy Policy URL</label>
              <input
                type="text"
                value={platformSettings?.privacyPolicyUrl}
                onChange={(e) => setPlatformSettings(prev => ({ ...prev, privacyPolicyUrl: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMaintenanceTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Maintenance Mode</h3>
        <button
          onClick={() => handleSave('Maintenance')}
          disabled={isSaving}
          className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center space-x-2"
        >
          <Save className="h-4 w-4" />
          <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Maintenance Control */}
        <div className="bg-gaming-dark rounded-lg p-6 border border-gray-700">
          <h4 className="text-white font-medium mb-4 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-gaming-accent" />
            Maintenance Control
          </h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="text-white font-medium">Maintenance Mode</h5>
                <p className="text-gray-400 text-sm">Enable to restrict access to the platform</p>
              </div>
              <button
                onClick={handleMaintenanceToggle}
                className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                  maintenanceSettings?.isMaintenanceMode
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {maintenanceSettings?.isMaintenanceMode ? (
                  <>
                    <Lock className="h-4 w-4" />
                    <span>Enabled</span>
                  </>
                ) : (
                  <>
                    <Unlock className="h-4 w-4" />
                    <span>Disabled</span>
                  </>
                )}
              </button>
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Maintenance Message</label>
              <textarea
                value={maintenanceSettings?.maintenanceMessage}
                onChange={(e) => setMaintenanceSettings(prev => ({ ...prev, maintenanceMessage: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
                placeholder="We are currently performing maintenance..."
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={maintenanceSettings?.showMaintenancePage}
                onChange={(e) => setMaintenanceSettings(prev => ({ ...prev, showMaintenancePage: e.target.checked }))}
                className="rounded"
              />
              <label className="text-gray-300 text-sm">Show maintenance page to users</label>
            </div>
          </div>
        </div>

        {/* Maintenance Schedule */}
        <div className="bg-gaming-dark rounded-lg p-6 border border-gray-700">
          <h4 className="text-white font-medium mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-gaming-accent" />
            Maintenance Schedule
          </h4>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Start Time</label>
              <input
                type="datetime-local"
                value={maintenanceSettings?.maintenanceStartTime}
                onChange={(e) => setMaintenanceSettings(prev => ({ ...prev, maintenanceStartTime: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">End Time</label>
              <input
                type="datetime-local"
                value={maintenanceSettings?.maintenanceEndTime}
                onChange={(e) => setMaintenanceSettings(prev => ({ ...prev, maintenanceEndTime: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Allowed IPs (one per line)</label>
              <textarea
                value={maintenanceSettings?.allowedIPs.join('\n')}
                onChange={(e) => setMaintenanceSettings(prev => ({ ...prev, allowedIPs: e.target.value.split('\n').filter(ip => ip.trim()) }))}
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
                placeholder="192.168.1.1&#10;10.0.0.1"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLocalizationTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Localization & Timezone Settings</h3>
        <button
          onClick={() => handleSave('Localization')}
          disabled={isSaving}
          className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center space-x-2"
        >
          <Save className="h-4 w-4" />
          <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timezone Settings */}
        <div className="bg-gaming-dark rounded-lg p-6 border border-gray-700">
          <h4 className="text-white font-medium mb-4 flex items-center">
            <Globe className="h-5 w-5 mr-2 text-gaming-accent" />
            Timezone Settings
          </h4>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Default Timezone</label>
              <select
                value={localizationSettings?.defaultTimezone}
                onChange={(e) => setLocalizationSettings(prev => ({ ...prev, defaultTimezone: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
              >
                <option value="UTC">UTC</option>
                <option value="EST">Eastern Standard Time</option>
                <option value="PST">Pacific Standard Time</option>
                <option value="GMT">Greenwich Mean Time</option>
                <option value="CET">Central European Time</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Date Format</label>
              <select
                value={localizationSettings?.dateFormat}
                onChange={(e) => setLocalizationSettings(prev => ({ ...prev, dateFormat: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Time Format</label>
              <select
                value={localizationSettings?.timeFormat}
                onChange={(e) => setLocalizationSettings(prev => ({ ...prev, timeFormat: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
              >
                <option value="12h">12-hour (AM/PM)</option>
                <option value="24h">24-hour</option>
              </select>
            </div>
          </div>
        </div>

        {/* Currency Settings */}
        <div className="bg-gaming-dark rounded-lg p-6 border border-gray-700">
          <h4 className="text-white font-medium mb-4 flex items-center">
            <DollarSign className="h-5 w-5 mr-2 text-gaming-accent" />
            Currency Settings
          </h4>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Currency</label>
              <select
                value={localizationSettings?.currency}
                onChange={(e) => setLocalizationSettings(prev => ({ ...prev, currency: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
              >
                <option value="USD">US Dollar (USD)</option>
                <option value="EUR">Euro (EUR)</option>
                <option value="GBP">British Pound (GBP)</option>
                <option value="CAD">Canadian Dollar (CAD)</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Currency Symbol</label>
              <input
                type="text"
                value={localizationSettings?.currencySymbol}
                onChange={(e) => setLocalizationSettings(prev => ({ ...prev, currencySymbol: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMatchesTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Match Settings & Timeouts</h3>
        <button
          onClick={() => handleSave('Match')}
          disabled={isSaving}
          className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center space-x-2"
        >
          <Save className="h-4 w-4" />
          <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeout Settings */}
        <div className="bg-gaming-dark rounded-lg p-6 border border-gray-700">
          <h4 className="text-white font-medium mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-gaming-accent" />
            Timeout Settings
          </h4>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Default Match Timeout (seconds)</label>
              <input
                type="number"
                value={matchSettings?.defaultMatchTimeout}
                onChange={(e) => setMatchSettings(prev => ({ ...prev, defaultMatchTimeout: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Max Match Duration (seconds)</label>
              <input
                type="number"
                value={matchSettings?.maxMatchDuration}
                onChange={(e) => setMatchSettings(prev => ({ ...prev, maxMatchDuration: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Auto Forfeit Time (seconds)</label>
              <input
                type="number"
                value={matchSettings?.autoForfeitTime}
                onChange={(e) => setMatchSettings(prev => ({ ...prev, autoForfeitTime: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Rematch Cooldown (seconds)</label>
              <input
                type="number"
                value={matchSettings?.rematchCooldown}
                onChange={(e) => setMatchSettings(prev => ({ ...prev, rematchCooldown: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
              />
            </div>
          </div>
        </div>

        {/* Match Features */}
        <div className="bg-gaming-dark rounded-lg p-6 border border-gray-700">
          <h4 className="text-white font-medium mb-4 flex items-center">
            <Gamepad2 className="h-5 w-5 mr-2 text-gaming-accent" />
            Match Features
          </h4>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Max Concurrent Matches</label>
              <input
                type="number"
                value={matchSettings?.maxConcurrentMatches}
                onChange={(e) => setMatchSettings(prev => ({ ...prev, maxConcurrentMatches: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={matchSettings?.enableSpectators}
                onChange={(e) => setMatchSettings(prev => ({ ...prev, enableSpectators: e.target.checked }))}
                className="rounded"
              />
              <label className="text-gray-300 text-sm">Enable spectators for matches</label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={matchSettings?.allowReplays}
                onChange={(e) => setMatchSettings(prev => ({ ...prev, allowReplays: e.target.checked }))}
                className="rounded"
              />
              <label className="text-gray-300 text-sm">Allow match replays</label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRegistrationTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Registration & Login Settings</h3>
        <button
          onClick={() => handleSave('Registration')}
          disabled={isSaving}
          className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center space-x-2"
        >
          <Save className="h-4 w-4" />
          <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Registration Settings */}
        <div className="bg-gaming-dark rounded-lg p-6 border border-gray-700">
          <h4 className="text-white font-medium mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2 text-gaming-accent" />
            Registration Settings
          </h4>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={registrationSettings?.allowRegistration}
                onChange={(e) => setRegistrationSettings(prev => ({ ...prev, allowRegistration: e.target.checked }))}
                className="rounded"
              />
              <label className="text-gray-300 text-sm">Allow new user registration</label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={registrationSettings?.requireEmailVerification}
                onChange={(e) => setRegistrationSettings(prev => ({ ...prev, requireEmailVerification: e.target.checked }))}
                className="rounded"
              />
              <label className="text-gray-300 text-sm">Require email verification</label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={registrationSettings?.requirePhoneVerification}
                onChange={(e) => setRegistrationSettings(prev => ({ ...prev, requirePhoneVerification: e.target.checked }))}
                className="rounded"
              />
              <label className="text-gray-300 text-sm">Require phone verification</label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={registrationSettings?.allowSocialLogin}
                onChange={(e) => setRegistrationSettings(prev => ({ ...prev, allowSocialLogin: e.target.checked }))}
                className="rounded"
              />
              <label className="text-gray-300 text-sm">Allow social media login</label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={registrationSettings?.allowGuestAccess}
                onChange={(e) => setRegistrationSettings(prev => ({ ...prev, allowGuestAccess: e.target.checked }))}
                className="rounded"
              />
              <label className="text-gray-300 text-sm">Allow guest access</label>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-gaming-dark rounded-lg p-6 border border-gray-700">
          <h4 className="text-white font-medium mb-4 flex items-center">
            <Shield className="h-5 w-5 mr-2 text-gaming-accent" />
            Security Settings
          </h4>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Minimum Password Length</label>
              <input
                type="number"
                value={registrationSettings?.minPasswordLength}
                onChange={(e) => setRegistrationSettings(prev => ({ ...prev, minPasswordLength: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={registrationSettings?.requireStrongPassword}
                onChange={(e) => setRegistrationSettings(prev => ({ ...prev, requireStrongPassword: e.target.checked }))}
                className="rounded"
              />
              <label className="text-gray-300 text-sm">Require strong password</label>
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Max Login Attempts</label>
              <input
                type="number"
                value={registrationSettings?.maxLoginAttempts}
                onChange={(e) => setRegistrationSettings(prev => ({ ...prev, maxLoginAttempts: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Lockout Duration (minutes)</label>
              <input
                type="number"
                value={registrationSettings?.lockoutDuration}
                onChange={(e) => setRegistrationSettings(prev => ({ ...prev, lockoutDuration: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Settings & Configuration</h1>
        <div className="flex items-center space-x-3">
          <button className="bg-gaming-gold text-gaming-dark px-4 py-2 rounded-lg hover:opacity-90 flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export Config</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-gaming-dark rounded-lg p-1 border border-gray-700">
        <div className="flex space-x-1">
          {[
            { id: 'general', label: 'General', icon: Settings },
            { id: 'maintenance', label: 'Maintenance', icon: AlertTriangle },
            { id: 'localization', label: 'Localization', icon: Globe },
            { id: 'matches', label: 'Matches', icon: Gamepad2 },
            { id: 'registration', label: 'Registration', icon: Users }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-gaming-accent text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-card-gradient rounded-xl p-6 border border-gray-700">
        {activeTab === 'general' && renderGeneralTab()}
        {activeTab === 'maintenance' && renderMaintenanceTab()}
        {activeTab === 'localization' && renderLocalizationTab()}
        {activeTab === 'matches' && renderMatchesTab()}
        {activeTab === 'registration' && renderRegistrationTab()}
      </div>

      {/* Platform Fee Configuration */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mt-6">
        <div className="flex items-center space-x-3 mb-6">
          <Settings className="h-6 w-6 text-blue-500" />
          <h2 className="text-xl font-semibold">Platform Fee Configuration</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 mb-2">Platform Fee Percentage</label>
            <div className="flex items-center space-x-4">
              <input
                type="number"
                min="0"
                max="50"
                value={platformConfig?.platformFeePercent}
                onChange={(e) => setPlatformConfig(prev => ({
                  ...prev,
                  platformFeePercent: parseInt(e.target.value) || 0
                }))}
                className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="Enter percentage (0-50)"
              />
              <span className="text-gray-400">%</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              This percentage will be deducted from the total pot as platform revenue. 
              Winner receives {100 - platformConfig?.platformFeePercent}% of the total pot.
            </p>
          </div>
          
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Example Calculation</h3>
            <div className="text-sm text-gray-400 space-y-1">
              <p>• Total Pot: $200 (2 players × $100 stake)</p>
              <p>• Platform Fee: ${Math.floor(200 * platformConfig?.platformFeePercent / 100)} ({platformConfig?.platformFeePercent}%)</p>
              <p>• Winner Receives: ${200 - Math.floor(200 * platformConfig?.platformFeePercent / 100)} ({100 - platformConfig?.platformFeePercent}%)</p>
            </div>
          </div>
          
          <button
            onClick={savePlatformConfig}
            disabled={isSaving || platformConfig?.platformFeePercent < 0 || platformConfig?.platformFeePercent > 50}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`flex items-center space-x-2 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-900 border border-green-700 text-green-300' 
            : 'bg-red-900 border border-red-700 text-red-300'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertTriangle className="h-5 w-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Information Section */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">Platform Fee Information</h2>
        <div className="space-y-3 text-gray-400">
          <p>• Platform fees are applied to all real money games</p>
          <p>• Virtual money games do not generate platform revenue</p>
          <p>• Changes take effect immediately for new games</p>
          <p>• All fee changes are logged for audit purposes</p>
          <p>• Recommended range: 5-15% for sustainable revenue</p>
        </div>
      </div>
    </div>
  );
}
