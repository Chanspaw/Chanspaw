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

interface AdminUser {
  id: string;
  username: string;
  email: string;
  isActive: boolean;
  isAdmin: boolean;
  createdAt: string;
}

interface AdminRole {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

interface ActivityLog {
  id: string;
  type: string;
  amount: number;
  status: string;
  createdAt: string;
  user: { id: string; username: string };
}

interface BackupData {
  id: string;
  name: string;
  size: string;
  createdAt: string;
  status: string;
}

export function SecurityControl() {
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'logs' | 'backups'>('users');
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [backups, setBackups] = useState<BackupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setLoading(true);
    if (activeTab === 'users') loadAdminUsers();
    if (activeTab === 'roles') loadRoles();
    if (activeTab === 'logs') loadActivityLogs();
    if (activeTab === 'backups') loadBackups();
    setLoading(false);
  }, [activeTab]);

  const loadAdminUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}` }
      });
      const data = await res.json();
      setAdminUsers(data.data?.users || []);
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to load admin users' });
    }
  };

  const loadRoles = async () => {
    try {
      const res = await fetch('/api/admin/roles', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}` }
      });
      const data = await res.json();
      setRoles(data.data?.roles || []);
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to load roles' });
    }
  };

  const loadActivityLogs = async () => {
    try {
      const res = await fetch('/api/admin/activity-logs', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}` }
      });
      const data = await res.json();
      setActivityLogs(data.data?.logs || []);
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to load activity logs' });
    }
  };

  const loadBackups = async () => {
    try {
      const res = await fetch('/api/admin/backups', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}` }
      });
      const data = await res.json();
      setBackups(data.data?.backups || []);
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to load backups' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="bg-gray-800 border-b border-gray-700 p-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Security & Admin Control</h1>
          <p className="text-gray-400">Manage admin users, roles, logs, and system backups</p>
        </div>
      </div>
      {message && (
        <div className="p-4 mx-6 mt-4 rounded-lg bg-gray-800 text-gray-300 border border-gray-700">
          <div className="flex items-center justify-between">
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="text-gray-400 hover:text-gray-200">×</button>
          </div>
        </div>
      )}
      <div className="p-6">
        <div className="mb-6 flex space-x-4">
          <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-lg ${activeTab === 'users' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400'}`}>Admin Users</button>
          <button onClick={() => setActiveTab('roles')} className={`px-4 py-2 rounded-lg ${activeTab === 'roles' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400'}`}>Roles</button>
          <button onClick={() => setActiveTab('logs')} className={`px-4 py-2 rounded-lg ${activeTab === 'logs' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400'}`}>Activity Logs</button>
          <button onClick={() => setActiveTab('backups')} className={`px-4 py-2 rounded-lg ${activeTab === 'backups' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400'}`}>Backups</button>
        </div>
        {activeTab === 'users' && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-x-auto">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Admin Users</h3>
            </div>
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Username</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Active</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Admin</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center text-gray-400 py-8">Loading...</td></tr>
                ) : adminUsers.length === 0 ? (
                  <tr><td colSpan={5} className="text-center text-gray-400 py-8">No admin users found.</td></tr>
                ) : adminUsers.map(user => (
                  <tr key={user.id} className="hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">{user.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{user.isActive ? 'Yes' : 'No'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{user.isAdmin ? 'Yes' : 'No'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(user.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {activeTab === 'roles' && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-x-auto">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Admin Roles</h3>
            </div>
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={3} className="text-center text-gray-400 py-8">Loading...</td></tr>
                ) : roles.length === 0 ? (
                  <tr><td colSpan={3} className="text-center text-gray-400 py-8">No roles found.</td></tr>
                ) : roles.map(role => (
                  <tr key={role.id} className="hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">{role.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{role.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(role.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {activeTab === 'logs' && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-x-auto">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Activity Logs</h3>
            </div>
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center text-gray-400 py-8">Loading...</td></tr>
                ) : activityLogs.length === 0 ? (
                  <tr><td colSpan={5} className="text-center text-gray-400 py-8">No activity logs found.</td></tr>
                ) : activityLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">{log.user?.username || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{log.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{log.amount}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{log.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(log.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {activeTab === 'backups' && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-x-auto">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold">System Backups</h3>
            </div>
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Size</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="text-center text-gray-400 py-8">Loading...</td></tr>
                ) : backups.length === 0 ? (
                  <tr><td colSpan={4} className="text-center text-gray-400 py-8">No backups found.</td></tr>
                ) : backups.map(backup => (
                  <tr key={backup.id} className="hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">{backup.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{backup.size}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{backup.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(backup.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 
