import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { KYCVerification, User } from '../../types';
import { Eye, Check, X, Download, Clock, AlertTriangle, Shield, UserCheck } from 'lucide-react';

export default function KYCManagement() {
  const { getAllUsers, approveKYC, rejectKYC, isLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [kycVerifications, setKycVerifications] = useState<KYCVerification[]>([]);
  const [selectedKYC, setSelectedKYC] = useState<KYCVerification | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const result = await getAllUsers();
      if (result.success && result.data) {
        setUsers(result.data);
        // Load KYC verifications from real API
        const kycResponse = await fetch(import.meta.env.VITE_API_URL + '/api/admin/kyc-requests', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (kycResponse.ok) {
          const kycData = await kycResponse.json();
          setKycVerifications(kycData.data?.kycRequests || kycData.kycRequests || []);
        } else {
          console.error('Failed to load KYC verifications:', kycResponse.status);
          setKycVerifications([]);
        }
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleApproveKYC = async (kycId: string) => {
    try {
      const result = await approveKYC(kycId);
      if (result.success) {
        // Update local state
        setKycVerifications(prev => 
          prev.map(kyc => 
            kyc.id === kycId 
              ? { ...kyc, status: 'approved', reviewedAt: new Date().toISOString() }
              : kyc
          )
        );
        setUsers(prev => 
          prev.map(user => {
            const kyc = kycVerifications.find(k => k.id === kycId);
            return kyc && kyc.userId === user.id 
              ? { ...user, kycStatus: 'verified', identityVerified: true }
              : user;
          })
        );
      }
    } catch (error) {
      console.error('Failed to approve KYC:', error);
    }
  };

  const handleRejectKYC = async () => {
    if (!selectedKYC || !rejectionReason.trim()) return;

    try {
      const result = await rejectKYC(selectedKYC.id, rejectionReason);
      if (result.success) {
        // Update local state
        setKycVerifications(prev => 
          prev.map(kyc => 
            kyc.id === selectedKYC.id 
              ? { 
                  ...kyc, 
                  status: 'rejected', 
                  reviewedAt: new Date().toISOString(),
                  rejectionReason 
                }
              : kyc
          )
        );
        setUsers(prev => 
          prev.map(user => 
            user.id === selectedKYC.userId 
              ? { ...user, kycStatus: 'rejected' }
              : user
          )
        );
        setShowRejectModal(false);
        setRejectionReason('');
        setSelectedKYC(null);
      }
    } catch (error) {
      console.error('Failed to reject KYC:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'approved':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'approved':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'rejected':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const filteredKYC = kycVerifications.filter(kyc => {
    const user = users.find(u => u.id === kyc.userId);
    const matchesFilter = filter === 'all' || kyc.status === filter;
    const matchesSearch = user && (
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.firstName && user.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.lastName && user.lastName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    return matchesFilter && matchesSearch;
  });

  const pendingCount = kycVerifications.filter(k => k.status === 'pending').length;
  const approvedCount = kycVerifications.filter(k => k.status === 'approved').length;
  const rejectedCount = kycVerifications.filter(k => k.status === 'rejected').length;

  return (
    <div className="min-h-screen bg-card-gradient text-white">
      <div className="p-6">
        <div className="bg-gaming-dark rounded-xl p-6 border border-gray-700 mb-6">
          <h1 className="text-2xl font-bold text-gaming-accent">KYC Management</h1>
          <p className="text-gray-400">Review and manage user identity verification</p>
        </div>

        {/* Stats */}
        <div className="bg-gaming-dark rounded-xl p-6 border border-gray-700 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total KYC</p>
                  <p className="text-2xl font-semibold text-white">{kycVerifications.length}</p>
                </div>
                <UserCheck className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Pending</p>
                  <p className="text-2xl font-semibold text-yellow-500">{pendingCount}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Approved</p>
                  <p className="text-2xl font-semibold text-green-500">{approvedCount}</p>
                </div>
                <Check className="h-8 w-8 text-green-500" />
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Rejected</p>
                  <p className="text-2xl font-semibold text-red-500">{rejectedCount}</p>
                </div>
                <X className="h-8 w-8 text-red-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gaming-dark rounded-xl p-6 border border-gray-700 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by username, email, or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* KYC List */}
        <div className="bg-gaming-dark rounded-xl p-6 border border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    KYC Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Documents
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredKYC.map((kyc) => {
                  const user = users.find(u => u.id === kyc.userId);
                  if (!user) return null;

                  return (
                    <tr key={kyc.id} className="hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-600 flex items-center justify-center">
                              <span className="text-sm font-medium text-white">
                                {user.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-white">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-gray-400">
                              {user.username} • {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-300 capitalize">
                          {kyc.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(kyc.status)}`}>
                          {getStatusIcon(kyc.status)}
                          <span className="ml-1 capitalize">{kyc.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {new Date(kyc.submittedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {kyc.documents.length} documents
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedKYC(kyc);
                              setShowDetailsModal(true);
                            }}
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {kyc.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApproveKYC(kyc.id)}
                                className="text-green-400 hover:text-green-300 transition-colors"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedKYC(kyc);
                                  setShowRejectModal(true);
                                }}
                                className="text-red-400 hover:text-red-300 transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Reject Modal */}
        {showRejectModal && selectedKYC && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-medium text-white mb-4">Reject KYC Verification</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Rejection Reason
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Please provide a reason for rejection..."
                    rows={4}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowRejectModal(false);
                      setRejectionReason('');
                      setSelectedKYC(null);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRejectKYC}
                    disabled={!rejectionReason.trim()}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-600/50 disabled:cursor-not-allowed transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Details Modal */}
        {showDetailsModal && selectedKYC && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">KYC Details</h3>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedKYC(null);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300">Status</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(selectedKYC.status)}`}>
                      {getStatusIcon(selectedKYC.status)}
                      <span className="ml-1 capitalize">{selectedKYC.status}</span>
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">Type</label>
                    <p className="text-white capitalize">{selectedKYC.type.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">Submitted</label>
                    <p className="text-white">{new Date(selectedKYC.submittedAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">Expires</label>
                    <p className="text-white">{selectedKYC.expiryDate ? new Date(selectedKYC.expiryDate).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>

                {selectedKYC.rejectionReason && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300">Rejection Reason</label>
                    <p className="text-red-400 bg-red-500/10 p-3 rounded-lg">{selectedKYC.rejectionReason}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Documents</label>
                  <div className="space-y-2">
                    {selectedKYC.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Download className="h-4 w-4 text-blue-400" />
                          <div>
                            <p className="text-white text-sm">{doc.originalName}</p>
                            <p className="text-gray-400 text-xs">
                              {doc.type} • {(doc.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <button className="text-blue-400 hover:text-blue-300 text-sm">
                          Download
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
