import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Shield, 
  AlertTriangle, 
  Eye, 
  Edit, 
  Trash2,
  Search,
  Filter,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Flag,
  Activity,
  CreditCard,
  Calendar,
  Mail,
  Phone,
  MapPin,
  FileText,
  Camera,
  Lock,
  Unlock
} from 'lucide-react';

interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  real_balance: number;
  virtual_balance: number;
  isAdmin: boolean;
  isVerified: boolean;
  isActive: boolean;
  status?: 'active' | 'suspended' | 'banned' | 'pending_verification';
  dateOfBirth?: string;
  createdAt: string;
  updatedAt: string;
}

interface KYCRequest {
  id: string;
  userId: string;
  username: string;
  documentType: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Date;
  reviewedAt?: Date;
  reviewer?: string;
  notes?: string;
}

export function UserManagement() {
  const [activeTab, setActiveTab] = useState<'users' | 'kyc' | 'bulk'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [kycRequests, setKycRequests] = useState<KYCRequest[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedKYC, setSelectedKYC] = useState<KYCRequest | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showKYCModal, setShowKYCModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Remove hardcoded data - load from API only
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'banned'>('all');
  const [kycFilter, setKycFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [bulkAction, setBulkAction] = useState<'suspend' | 'activate' | 'delete' | 'verify'>('suspend');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  // Add missing state variables for edit balance modal
  const [showEditBalanceModal, setShowEditBalanceModal] = useState(false);
  const [editRealBalance, setEditRealBalance] = useState(0);
  const [editVirtualBalance, setEditVirtualBalance] = useState(0);

  useEffect(() => {
    loadUsers();
    loadKYCRequests();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Handle the nested response structure: { success: true, data: { users } }
        const users = data.data?.users || data.users || data || [];
        setUsers(Array.isArray(users) ? users : []);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
    }
  };

  const loadKYCRequests = async () => {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/api/admin/kyc-requests', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Handle the nested response structure: { success: true, data: { kycRequests } }
        const kycRequests = data.data?.kycRequests || data.requests || data || [];
        setKycRequests(Array.isArray(kycRequests) ? kycRequests : []);
      } else {
        setKycRequests([]);
      }
    } catch (error) {
      console.error('Error loading KYC requests:', error);
      setKycRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUserStatus = async (userId: string, status: 'active' | 'suspended' | 'banned' | 'pending_verification') => {
    setIsSaving(true);
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + `/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'User status updated successfully' });
        loadUsers();
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.message || 'Failed to update user status' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error updating user status' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateKYCStatus = async (requestId: string, status: 'approved' | 'rejected', reason?: string) => {
    setIsSaving(true);
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + `/api/admin/kyc-requests/${requestId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, reason })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'KYC status updated successfully' });
        setShowKYCModal(false);
        setSelectedKYC(null);
        loadKYCRequests();
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.message || 'Failed to update KYC status' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error updating KYC status' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkAction = async () => {
    if (selectedUsers.length === 0) {
      setMessage({ type: 'error', text: 'Please select users to perform bulk action' });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/api/admin/users/bulk-action', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userIds: selectedUsers,
          action: bulkAction
        })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: `Bulk ${bulkAction} completed successfully` });
        setShowBulkModal(false);
        setSelectedUsers([]);
        loadUsers();
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.message || 'Failed to perform bulk action' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error performing bulk action' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + `/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'User deleted successfully' });
        loadUsers();
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.message || 'Failed to delete user' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error deleting user' });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredUsers = (Array.isArray(users) ? users : []).filter(user => {
    if (!user || typeof user !== 'object') return false;
    const matchesSearch = (user.username?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredKYCRequests = (Array.isArray(kycRequests) ? kycRequests : []).filter(request => {
    if (!request || typeof request !== 'object') return false;
    return kycFilter === 'all' || request.status === kycFilter;
  });

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'text-green-500' : 'text-red-500';
  };

  const getRiskLevelColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const getKYCStatusColor = (isVerified: boolean) => {
    return isVerified ? 'text-green-500' : 'text-yellow-500';
  };

  const handleRefresh = () => {
    setLoading(true);
    loadUsers();
    loadKYCRequests();
    setLoading(false);
  };

  const handleExportUsers = () => {
    // Create CSV content
    const csvContent = [
      ['Username', 'Email', 'First Name', 'Last Name', 'Status', 'KYC Status', 'Real Balance', 'Virtual Balance', 'Created At'],
      ...(Array.isArray(users) ? users : []).map(user => [
        user.username,
        user.email,
        user.firstName,
        user.lastName,
        user.isActive ? 'Active' : 'Suspended',
        user.isVerified ? 'Verified' : 'Pending',
        user.real_balance.toString(),
        user.virtual_balance.toString(),
        new Date(user.createdAt).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const openEditBalanceModal = (user: User) => {
    setSelectedUser(user);
    setEditRealBalance(user.real_balance);
    setEditVirtualBalance(user.virtual_balance);
    setShowEditBalanceModal(true);
  };

  const handleEditBalanceSave = async () => {
    if (!selectedUser) return;
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + `/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          real_balance: editRealBalance,
          virtual_balance: editVirtualBalance
        })
      });
      if (response.ok) {
        setShowEditBalanceModal(false);
        setSelectedUser(null);
        loadUsers();
      } else {
        alert('Failed to update balances.');
      }
    } catch (error) {
      alert('Error updating balances.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">User Management</h1>
            <p className="text-gray-400">Comprehensive user administration and KYC verification</p>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              onClick={handleRefresh}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
            <button 
              onClick={handleExportUsers}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export Users</span>
            </button>
          </div>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`p-4 mx-6 mt-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-600 text-white' 
            : 'bg-red-600 text-white'
        }`}>
          <div className="flex items-center justify-between">
            <span>{message.text}</span>
            <button 
              onClick={() => setMessage(null)}
              className="text-white hover:text-gray-200"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="flex space-x-1 p-4">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Users ({(Array.isArray(users) ? users : []).length})</span>
          </button>
          <button
            onClick={() => setActiveTab('kyc')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'kyc'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <UserCheck className="h-4 w-4" />
            <span>KYC Verification ({filteredKYCRequests.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'bulk'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Bulk Actions</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search users by username or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'suspended' | 'banned')}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
          </select>
          <select
            value={kycFilter}
            onChange={(e) => setKycFilter(e.target.value as 'all' | 'pending' | 'verified' | 'rejected')}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All KYC Status</option>
            <option value="pending">Pending KYC</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-700">
                  <h3 className="text-lg font-semibold">User Management</h3>
                  <p className="text-gray-400">Manage user accounts, status, and restrictions</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">KYC</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">KYC</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Financial</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center space-y-4">
                              <Users className="h-12 w-12 text-gray-500" />
                              <div>
                                <h3 className="text-lg font-medium text-gray-300">No users found</h3>
                                <p className="text-gray-500">No users match your current filters or no users exist yet.</p>
                              </div>
                              {searchTerm || statusFilter !== 'all' || kycFilter !== 'all' ? (
                                <button
                                  onClick={() => {
                                    setSearchTerm('');
                                    setStatusFilter('all');
                                    setKycFilter('all');
                                  }}
                                  className="text-blue-400 hover:text-blue-300"
                                >
                                  Clear filters
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map(user => (
                          <tr key={user?.id || 'unknown'} className="hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium">{user?.username || 'Unknown'}</div>
                                <div className="text-sm text-gray-400">{user?.email || 'No email'}</div>
                                <div className="text-xs text-gray-500">{user?.firstName || ''} {user?.lastName || ''}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user?.isActive || false)}`}>
                                  {user?.isActive ? 'Active' : 'Suspended'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getKYCStatusColor(user?.isVerified || false)}`}>
                                {user?.isVerified ? 'Verified' : 'Pending'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm">
                                <div>Admin: {user?.isAdmin ? 'Yes' : 'No'}</div>
                                <div className="text-gray-400">Created: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm">
                                <div className="text-green-500">Real: ${user?.real_balance || 0}</div>
                                <div className="text-gray-400">Virtual: ${user?.virtual_balance || 0}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex items-center space-x-2">
                                <button 
                                  onClick={() => setSelectedUser(user)}
                                  className="text-blue-400 hover:text-blue-300"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => openEditBalanceModal(user)}
                                  className="text-yellow-400 hover:text-yellow-300"
                                  title="Edit Balance"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                {user?.isActive ? (
                                  <button 
                                    onClick={() => user?.id && handleUpdateUserStatus(user.id, 'suspended')}
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    Suspend
                                  </button>
                                ) : (
                                  <button 
                                    onClick={() => user?.id && handleUpdateUserStatus(user.id, 'active')}
                                    className="text-green-400 hover:text-green-300"
                                  >
                                    Activate
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* KYC Tab */}
            {activeTab === 'kyc' && (
              <div className="space-y-6">
                {/* KYC Requests */}
                <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                  <div className="p-6 border-b border-gray-700">
                    <h3 className="text-lg font-semibold">KYC Verification Requests</h3>
                    <p className="text-gray-400">Review and approve user identity verification documents</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">User</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Document</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Submitted</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {filteredKYCRequests.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center">
                              <div className="flex flex-col items-center space-y-4">
                                <UserCheck className="h-12 w-12 text-gray-500" />
                                <div>
                                  <h3 className="text-lg font-medium text-gray-300">No KYC requests</h3>
                                  <p className="text-gray-500">No KYC verification requests are currently pending.</p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredKYCRequests.map(request => (
                            <tr key={request?.id || 'unknown'} className="hover:bg-gray-700">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium">{request?.username || 'Unknown'}</div>
                                  <div className="text-sm text-gray-400">ID: {request?.userId || 'Unknown'}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm capitalize">{request?.documentType?.replace('_', ' ') || 'Unknown'}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getKYCStatusColor(request?.status === 'approved')}`}>
                                  {request?.status || 'Unknown'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                {request?.submittedAt ? request.submittedAt.toLocaleDateString() : 'Unknown'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <div className="flex items-center space-x-2">
                                  <button className="text-blue-400 hover:text-blue-300">View</button>
                                  {request?.status === 'pending' && (
                                    <>
                                      <button 
                                        onClick={() => request?.id && handleUpdateKYCStatus(request.id, 'approved')}
                                        className="text-green-400 hover:text-green-300"
                                      >
                                        Approve
                                      </button>
                                      <button 
                                        onClick={() => request?.id && handleUpdateKYCStatus(request.id, 'rejected')}
                                        className="text-red-400 hover:text-red-300"
                                      >
                                        Reject
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Bulk Actions Tab */}
            {activeTab === 'bulk' && (
              <div className="space-y-6">
                {/* Bulk Actions */}
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                  <h3 className="text-lg font-semibold mb-4">Bulk Actions</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Select Action</span>
                      <select
                        value={bulkAction}
                        onChange={(e) => setBulkAction(e.target.value as 'suspend' | 'activate' | 'delete' | 'verify')}
                        className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="suspend">Suspend</option>
                        <option value="activate">Activate</option>
                        <option value="delete">Delete</option>
                        <option value="verify">Verify</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Select Users</span>
                      <select
                        value={selectedUsers}
                        onChange={(e) => setSelectedUsers(e.target.value.split(','))}
                        className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        multiple
                      >
                        {(Array.isArray(users) ? users : []).map(user => (
                          <option key={user.id} value={user.id}>{user.username}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Bulk Action Button */}
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={handleBulkAction}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    Perform Bulk Action
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* User Detail Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">User Details - {selectedUser.username}</h3>
              <button 
                onClick={() => setShowUserModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">Personal Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>{selectedUser.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400">Name:</span>
                    <span>{selectedUser.firstName} {selectedUser.lastName}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>Created: {new Date(selectedUser.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>Updated: {new Date(selectedUser.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3">Account Status</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Status:</span>
                    <span className={getStatusColor(selectedUser.isActive)}>{selectedUser.isActive ? 'Active' : 'Suspended'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>KYC Status:</span>
                    <span className={getKYCStatusColor(selectedUser.isVerified)}>{selectedUser.isVerified ? 'Verified' : 'Pending'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Admin:</span>
                    <span className={selectedUser.isAdmin ? 'text-purple-500' : 'text-gray-400'}>
                      {selectedUser.isAdmin ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="font-semibold mb-3">Financial Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-700 p-3 rounded-lg">
                  <div className="text-gray-400">Real Balance</div>
                  <div className="font-semibold text-green-500">${selectedUser.real_balance}</div>
                </div>
                <div className="bg-gray-700 p-3 rounded-lg">
                  <div className="text-gray-400">Virtual Balance</div>
                  <div className="font-semibold text-blue-500">${selectedUser.virtual_balance}</div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button 
                onClick={() => setShowUserModal(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
              >
                Close
              </button>
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                Edit User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Balance Modal */}
      {showEditBalanceModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-800 rounded-lg p-8 w-full max-w-md border border-gray-700">
            <h2 className="text-xl font-bold mb-4">Edit Balance for {selectedUser.username}</h2>
            <div className="mb-4">
              <label className="block text-gray-300 mb-1">Real Balance ($)</label>
              <input
                type="number"
                value={editRealBalance}
                onChange={e => setEditRealBalance(Number(e.target.value))}
                className="w-full px-4 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none"
              />
            </div>
            <div className="mb-6">
              <label className="block text-gray-300 mb-1">Virtual Balance ($)</label>
              <input
                type="number"
                value={editVirtualBalance}
                onChange={e => setEditVirtualBalance(Number(e.target.value))}
                className="w-full px-4 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowEditBalanceModal(false)}
                className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-700 text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleEditBalanceSave}
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
