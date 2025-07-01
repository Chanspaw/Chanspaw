import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Users, 
  Activity, 
  Database, 
  Key, 
  Eye, 
  EyeOff,
  Download,
  Upload,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  AlertTriangle,
  Lock,
  Unlock,
  QrCode,
  Copy,
  RefreshCw,
  Save,
  Settings,
  UserCheck,
  UserX,
  Clock,
  MapPin,
  Monitor
} from 'lucide-react';
import { AdminRole, AdminUser, ActivityLog, BackupData, TwoFactorAuth, SecuritySettings, Permission } from '../../types';

export function SecurityControl() {
  const [activeTab, setActiveTab] = useState('2fa');
  const [showPassword, setShowPassword] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AdminRole | null>(null);
  const [editingRole, setEditingRole] = useState<AdminRole | null>(null);

  // Real data from API
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [backups, setBackups] = useState<BackupData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    try {
      // Load admin users from real API
      const adminResponse = await fetch(import.meta.env.VITE_API_URL + '/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (adminResponse.ok) {
        const adminData = await adminResponse.json();
        setAdminUsers(adminData.data?.users || adminData.users || []);
      } else {
        console.error('Failed to load admin users:', adminResponse.status);
        setAdminUsers([]);
      }

      // Load roles from real API
      const rolesResponse = await fetch(import.meta.env.VITE_API_URL + '/api/admin/roles', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (rolesResponse.ok) {
        const rolesData = await rolesResponse.json();
        setRoles(rolesData.data?.roles || rolesData.roles || []);
      } else {
        console.error('Failed to load roles:', rolesResponse.status);
        setRoles([]);
      }

      // Load activity logs from real API
      const logsResponse = await fetch(import.meta.env.VITE_API_URL + '/api/admin/activity-logs', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (logsResponse.ok) {
        const logsData = await logsResponse.json();
        setActivityLogs(logsData.data?.logs || logsData.logs || []);
      } else {
        console.error('Failed to load activity logs:', logsResponse.status);
        setActivityLogs([]);
      }

      // Load backups from real API
      const backupsResponse = await fetch(import.meta.env.VITE_API_URL + '/api/admin/backups', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (backupsResponse.ok) {
        const backupsData = await backupsResponse.json();
        setBackups(backupsData.data?.backups || backupsData.backups || []);
      } else {
        console.error('Failed to load backups:', backupsResponse.status);
        setBackups([]);
      }
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    requireTwoFactor: true,
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true
    },
    ipWhitelist: ['192.168.1.0/24'],
    allowedDomains: ['chanspaw.com']
  });

  const [twoFactorAuth] = useState<TwoFactorAuth>({
    secret: 'JBSWY3DPEHPK3PXP',
    qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    backupCodes: ['12345678', '87654321', '11111111', '22222222', '33333333'],
    isEnabled: true,
    lastUsed: '2024-01-15T10:30:00Z'
  });

  const tabs = [
    { id: '2fa', label: 'Two-Factor Auth', icon: Key },
    { id: 'logs', label: 'Activity Logs', icon: Activity },
    { id: 'roles', label: 'Role Management', icon: Users },
    { id: 'backup', label: 'Backup & Restore', icon: Database },
    { id: 'permissions', label: 'Permissions', icon: Shield },
    { id: 'settings', label: 'Security Settings', icon: Settings }
  ];

  const handleSaveSettings = () => {
    // Save security settings
    console.log('Saving security settings:', securitySettings);
  };

  const handleCreateBackup = () => {
    // Create backup
    console.log('Creating backup...');
  };

  const handleRestoreBackup = (backupId: string) => {
    // Restore backup
    console.log('Restoring backup:', backupId);
  };

  const handleEnable2FA = () => {
    // Enable 2FA
    console.log('Enabling 2FA...');
  };

  const handleDisable2FA = () => {
    // Disable 2FA
    console.log('Disabling 2FA...');
  };

  const handleCreateRole = () => {
    // Create new role
    console.log('Creating new role...');
  };

  const handleEditRole = (role: AdminRole) => {
    setEditingRole(role);
  };

  const handleDeleteRole = (roleId: string) => {
    // Delete role
    console.log('Deleting role:', roleId);
  };

  return (
    <div className="min-h-screen bg-gaming-dark text-white p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gaming-gold mb-2">
            Security & Admin Control
          </h1>
          <p className="text-gray-400">
            Manage admin authentication, roles, permissions, and system security
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-4 py-2 rounded-lg transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-gaming-gold text-gaming-dark shadow-lg'
                  : 'bg-gaming-card text-gray-300 hover:bg-gaming-darker hover:text-white'
              }`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-gaming-card rounded-lg p-6">
          {/* Two-Factor Authentication */}
          {activeTab === '2fa' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gaming-gold">Two-Factor Authentication</h2>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    twoFactorAuth.isEnabled 
                      ? 'bg-green-900 text-green-300' 
                      : 'bg-red-900 text-red-300'
                  }`}>
                    {twoFactorAuth.isEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>

              {twoFactorAuth.isEnabled ? (
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-gaming-darker p-4 rounded-lg">
                      <h3 className="text-lg font-medium mb-3">QR Code</h3>
                      <div className="flex justify-center">
                        <img 
                          src={twoFactorAuth.qrCode} 
                          alt="2FA QR Code" 
                          className="w-48 h-48 bg-white rounded-lg"
                        />
                      </div>
                      <p className="text-sm text-gray-400 mt-3 text-center">
                        Scan this QR code with your authenticator app
                      </p>
                    </div>

                    <div className="bg-gaming-darker p-4 rounded-lg">
                      <h3 className="text-lg font-medium mb-3">Secret Key</h3>
                      <div className="flex items-center space-x-2">
                        <code className="flex-1 bg-black p-2 rounded text-sm font-mono">
                          {showPassword ? twoFactorAuth.secret : '••••••••••••••••'}
                        </code>
                        <button
                          onClick={() => setShowPassword(!showPassword)}
                          className="p-2 text-gray-400 hover:text-white"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        <button className="p-2 text-gray-400 hover:text-white">
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-gaming-darker p-4 rounded-lg">
                      <h3 className="text-lg font-medium mb-3">Backup Codes</h3>
                      <p className="text-sm text-gray-400 mb-3">
                        Save these codes in a secure location. You can use them to access your account if you lose your authenticator device.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {twoFactorAuth.backupCodes.map((code, index) => (
                          <div key={index} className="bg-black p-2 rounded text-center font-mono text-sm">
                            {showBackupCodes ? code : '••••••••'}
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between mt-3">
                        <button
                          onClick={() => setShowBackupCodes(!showBackupCodes)}
                          className="text-sm text-gaming-gold hover:underline"
                        >
                          {showBackupCodes ? 'Hide' : 'Show'} Codes
                        </button>
                        <button className="text-sm text-gaming-gold hover:underline">
                          Generate New Codes
                        </button>
                      </div>
                    </div>

                    <div className="bg-gaming-darker p-4 rounded-lg">
                      <h3 className="text-lg font-medium mb-3">Last Used</h3>
                      <p className="text-sm text-gray-400">
                        {twoFactorAuth.lastUsed ? new Date(twoFactorAuth.lastUsed).toLocaleString() : 'Never'}
                      </p>
                    </div>

                    <button
                      onClick={handleDisable2FA}
                      className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
                    >
                      Disable Two-Factor Authentication
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Lock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Two-Factor Authentication is Disabled</h3>
                  <p className="text-gray-400 mb-6">
                    Enable two-factor authentication to add an extra layer of security to your admin account.
                  </p>
                  <button
                    onClick={handleEnable2FA}
                    className="bg-gaming-gold hover:bg-yellow-600 text-gaming-dark py-2 px-6 rounded-lg transition-colors"
                  >
                    Enable Two-Factor Authentication
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Activity Logs */}
          {activeTab === 'logs' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gaming-gold">Activity Logs</h2>
                <div className="flex items-center space-x-2">
                  <button className="bg-gaming-gold hover:bg-yellow-600 text-gaming-dark py-2 px-4 rounded-lg transition-colors">
                    Export Logs
                  </button>
                  <button className="bg-gaming-darker hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors">
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4">Admin</th>
                      <th className="text-left py-3 px-4">Action</th>
                      <th className="text-left py-3 px-4">Resource</th>
                      <th className="text-left py-3 px-4">IP Address</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityLogs.map((log) => (
                      <tr key={log.id} className="border-b border-gray-800 hover:bg-gaming-darker">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-gaming-gold rounded-full flex items-center justify-center">
                              <span className="text-gaming-dark text-sm font-medium">
                                {log.adminUsername.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium">{log.adminUsername}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm">{log.action}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-400">{log.resource}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-400">{log.ipAddress}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            log.status === 'success' ? 'bg-green-900 text-green-300' :
                            log.status === 'failed' ? 'bg-red-900 text-red-300' :
                            'bg-yellow-900 text-yellow-300'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-400">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {activityLogs.length === 0 && (
                <div className="text-center py-12">
                  <Activity className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Activity Logs</h3>
                  <p className="text-gray-400">Activity logs will appear here as admins perform actions.</p>
                </div>
              )}
            </div>
          )}

          {/* Role Management */}
          {activeTab === 'roles' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gaming-gold">Role Management</h2>
                <button
                  onClick={handleCreateRole}
                  className="bg-gaming-gold hover:bg-yellow-600 text-gaming-dark py-2 px-4 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Role</span>
                </button>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles.map((role) => (
                  <div key={role.id} className="bg-gaming-darker p-6 rounded-lg">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-white mb-1">{role.name}</h3>
                        <p className="text-sm text-gray-400">{role.description}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditRole(role)}
                          className="p-2 text-gray-400 hover:text-white"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        {role.id !== '1' && (
                          <button
                            onClick={() => handleDeleteRole(role.id)}
                            className="p-2 text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Created:</span>
                        <span>{new Date(role.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Permissions:</span>
                        <span className="text-gaming-gold">{role.permissions.length}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <h4 className="text-sm font-medium text-gray-300 mb-2">Assigned Users</h4>
                      <div className="space-y-2">
                        {adminUsers.filter(user => user.roleId === role.id).map(user => (
                          <div key={user.id} className="flex items-center justify-between">
                            <span className="text-sm">{user.username}</span>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              user.isActive ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                            }`}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Backup & Restore */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gaming-gold">Backup & Restore</h2>
                <button
                  onClick={handleCreateBackup}
                  className="bg-gaming-gold hover:bg-yellow-600 text-gaming-dark py-2 px-4 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <Database className="h-4 w-4" />
                  <span>Create Backup</span>
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Available Backups</h3>
                  <div className="space-y-3">
                    {backups.map((backup) => (
                      <div key={backup.id} className="bg-gaming-darker p-4 rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-medium text-white">{backup.name}</h4>
                            <p className="text-sm text-gray-400">{backup.description}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            backup.status === 'completed' ? 'bg-green-900 text-green-300' :
                            backup.status === 'in_progress' ? 'bg-yellow-900 text-yellow-300' :
                            'bg-red-900 text-red-300'
                          }`}>
                            {backup.status}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                          <div>
                            <span className="text-gray-400">Type:</span>
                            <span className="ml-2 capitalize">{backup.type}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Size:</span>
                            <span className="ml-2">{(backup.size / 1024).toFixed(1)} MB</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Created:</span>
                            <span className="ml-2">{new Date(backup.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">By:</span>
                            <span className="ml-2">{backup.createdBy}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded text-sm transition-colors">
                            <Download className="h-4 w-4 inline mr-1" />
                            Download
                          </button>
                          <button
                            onClick={() => handleRestoreBackup(backup.id)}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded text-sm transition-colors"
                          >
                            <Upload className="h-4 w-4 inline mr-1" />
                            Restore
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Backup Settings</h3>
                  <div className="bg-gaming-darker p-4 rounded-lg space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Auto Backup Schedule
                      </label>
                      <select className="w-full bg-black border border-gray-600 rounded-lg px-3 py-2 text-white">
                        <option>Daily</option>
                        <option>Weekly</option>
                        <option>Monthly</option>
                        <option>Disabled</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Retention Period
                      </label>
                      <select className="w-full bg-black border border-gray-600 rounded-lg px-3 py-2 text-white">
                        <option>7 days</option>
                        <option>30 days</option>
                        <option>90 days</option>
                        <option>1 year</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Backup Location
                      </label>
                      <input
                        type="text"
                        placeholder="Local storage"
                        className="w-full bg-black border border-gray-600 rounded-lg px-3 py-2 text-white"
                      />
                    </div>

                    <button className="w-full bg-gaming-gold hover:bg-yellow-600 text-gaming-dark py-2 px-4 rounded-lg transition-colors">
                      Save Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Permissions */}
          {activeTab === 'permissions' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gaming-gold">Permission Management</h2>
                <button className="bg-gaming-gold hover:bg-yellow-600 text-gaming-dark py-2 px-4 rounded-lg transition-colors">
                  Save Changes
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Available Permissions</h3>
                  <div className="space-y-3">
                    {['users', 'games', 'wallet', 'analytics', 'content', 'notifications', 'settings', 'security', 'backup'].map((resource) => (
                      <div key={resource} className="bg-gaming-darker p-4 rounded-lg">
                        <h4 className="font-medium text-white capitalize mb-3">{resource}</h4>
                        <div className="space-y-2">
                          {['read', 'write', 'delete', 'admin'].map((action) => (
                            <label key={action} className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                className="rounded border-gray-600 bg-black text-gaming-gold focus:ring-gaming-gold"
                              />
                              <span className="text-sm capitalize">{action}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Role Permissions</h3>
                  <div className="space-y-4">
                    {roles.map((role) => (
                      <div key={role.id} className="bg-gaming-darker p-4 rounded-lg">
                        <h4 className="font-medium text-white mb-3">{role.name}</h4>
                        <div className="space-y-2">
                          {['users', 'games', 'wallet', 'analytics', 'content', 'notifications', 'settings', 'security', 'backup'].map((resource) => (
                            <div key={resource} className="flex items-center justify-between">
                              <span className="text-sm capitalize text-gray-400">{resource}</span>
                              <div className="flex items-center space-x-2">
                                {['read', 'write', 'delete', 'admin'].map((action) => (
                                  <input
                                    key={action}
                                    type="checkbox"
                                    className="rounded border-gray-600 bg-black text-gaming-gold focus:ring-gaming-gold"
                                    defaultChecked={role.id === '1'} // Super admin has all permissions
                                  />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gaming-gold">Security Settings</h2>
                <button
                  onClick={handleSaveSettings}
                  className="bg-gaming-gold hover:bg-yellow-600 text-gaming-dark py-2 px-4 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>Save Settings</span>
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div className="bg-gaming-darker p-6 rounded-lg">
                    <h3 className="text-lg font-medium text-white mb-4">Session Management</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Session Timeout (minutes)
                        </label>
                        <input
                          type="number"
                          value={securitySettings.sessionTimeout}
                          onChange={(e) => setSecuritySettings({
                            ...securitySettings,
                            sessionTimeout: parseInt(e.target.value)
                          })}
                          className="w-full bg-black border border-gray-600 rounded-lg px-3 py-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Max Login Attempts
                        </label>
                        <input
                          type="number"
                          value={securitySettings.maxLoginAttempts}
                          onChange={(e) => setSecuritySettings({
                            ...securitySettings,
                            maxLoginAttempts: parseInt(e.target.value)
                          })}
                          className="w-full bg-black border border-gray-600 rounded-lg px-3 py-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Lockout Duration (minutes)
                        </label>
                        <input
                          type="number"
                          value={securitySettings.lockoutDuration}
                          onChange={(e) => setSecuritySettings({
                            ...securitySettings,
                            lockoutDuration: parseInt(e.target.value)
                          })}
                          className="w-full bg-black border border-gray-600 rounded-lg px-3 py-2 text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gaming-darker p-6 rounded-lg">
                    <h3 className="text-lg font-medium text-white mb-4">Two-Factor Authentication</h3>
                    <div className="space-y-4">
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={securitySettings.requireTwoFactor}
                          onChange={(e) => setSecuritySettings({
                            ...securitySettings,
                            requireTwoFactor: e.target.checked
                          })}
                          className="rounded border-gray-600 bg-black text-gaming-gold focus:ring-gaming-gold"
                        />
                        <span className="text-sm">Require 2FA for all admin accounts</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-gaming-darker p-6 rounded-lg">
                    <h3 className="text-lg font-medium text-white mb-4">Password Policy</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Minimum Length
                        </label>
                        <input
                          type="number"
                          value={securitySettings.passwordPolicy.minLength}
                          onChange={(e) => setSecuritySettings({
                            ...securitySettings,
                            passwordPolicy: {
                              ...securitySettings.passwordPolicy,
                              minLength: parseInt(e.target.value)
                            }
                          })}
                          className="w-full bg-black border border-gray-600 rounded-lg px-3 py-2 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={securitySettings.passwordPolicy.requireUppercase}
                            onChange={(e) => setSecuritySettings({
                              ...securitySettings,
                              passwordPolicy: {
                                ...securitySettings.passwordPolicy,
                                requireUppercase: e.target.checked
                              }
                            })}
                            className="rounded border-gray-600 bg-black text-gaming-gold focus:ring-gaming-gold"
                          />
                          <span className="text-sm">Require uppercase letters</span>
                        </label>
                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={securitySettings.passwordPolicy.requireLowercase}
                            onChange={(e) => setSecuritySettings({
                              ...securitySettings,
                              passwordPolicy: {
                                ...securitySettings.passwordPolicy,
                                requireLowercase: e.target.checked
                              }
                            })}
                            className="rounded border-gray-600 bg-black text-gaming-gold focus:ring-gaming-gold"
                          />
                          <span className="text-sm">Require lowercase letters</span>
                        </label>
                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={securitySettings.passwordPolicy.requireNumbers}
                            onChange={(e) => setSecuritySettings({
                              ...securitySettings,
                              passwordPolicy: {
                                ...securitySettings.passwordPolicy,
                                requireNumbers: e.target.checked
                              }
                            })}
                            className="rounded border-gray-600 bg-black text-gaming-gold focus:ring-gaming-gold"
                          />
                          <span className="text-sm">Require numbers</span>
                        </label>
                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={securitySettings.passwordPolicy.requireSpecialChars}
                            onChange={(e) => setSecuritySettings({
                              ...securitySettings,
                              passwordPolicy: {
                                ...securitySettings.passwordPolicy,
                                requireSpecialChars: e.target.checked
                              }
                            })}
                            className="rounded border-gray-600 bg-black text-gaming-gold focus:ring-gaming-gold"
                          />
                          <span className="text-sm">Require special characters</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gaming-darker p-6 rounded-lg">
                    <h3 className="text-lg font-medium text-white mb-4">Access Control</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          IP Whitelist
                        </label>
                        <textarea
                          value={securitySettings.ipWhitelist.join('\n')}
                          onChange={(e) => setSecuritySettings({
                            ...securitySettings,
                            ipWhitelist: e.target.value.split('\n').filter(ip => ip.trim())
                          })}
                          placeholder="Enter IP addresses or ranges (one per line)"
                          className="w-full bg-black border border-gray-600 rounded-lg px-3 py-2 text-white h-24"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Allowed Domains
                        </label>
                        <textarea
                          value={securitySettings.allowedDomains.join('\n')}
                          onChange={(e) => setSecuritySettings({
                            ...securitySettings,
                            allowedDomains: e.target.value.split('\n').filter(domain => domain.trim())
                          })}
                          placeholder="Enter allowed domains (one per line)"
                          className="w-full bg-black border border-gray-600 rounded-lg px-3 py-2 text-white h-24"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
