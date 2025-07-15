import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Gamepad2, 
  DollarSign, 
  TrendingUp, 
  Settings,
  UserPlus,
  GamepadIcon,
  AlertTriangle,
  BarChart3,
  Calendar,
  Clock,
  Trophy,
  Target,
  Activity,
  Eye,
  Download,
  Filter,
  Search,
  ArrowUp,
  ArrowDown,
  Crown,
  Star,
  TrendingDown,
  PieChart,
  LineChart,
  BarChart,
  UserCheck,
  UserX,
  Zap,
  Award,
  Medal,
  TrendingUp as TrendingUpIcon,
  Shield,
  CreditCard,
  Database,
  FileText,
  Bell,
  RefreshCw,
  MessageSquare,
  Wallet,
  Check,
  X
} from 'lucide-react';
import { supportAPI } from '../../services/supportAPI';
import { PlatformRevenue } from './PlatformRevenue';
import ComplianceManagement from './ComplianceManagement';
import { useTranslation } from 'react-i18next';

interface UserStats {
  total: number;
  active: number;
  newToday: number;
  newThisWeek: number;
  newThisMonth: number;
  premium: number;
  banned: number;
}

interface MatchStats {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  averageDuration: number;
  totalPlayers: number;
}

interface GameStats {
  id: string;
  name: string;
  totalMatches: number;
  totalPlayers: number;
  averageRating: number;
  winRate: number;
  popularity: number;
  revenue: number;
}

interface TopUser {
  id: string;
  username: string;
  wins: number;
  losses: number;
  winRate: number;
  totalEarnings: number;
  gamesPlayed: number;
  rank: number;
}

interface RevenueStats {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  averagePerUser: number;
  topGame: string;
  growthRate: number;
}

interface Transaction {
  id: string;
  userId: string;
  username: string;
  type: 'deposit' | 'withdrawal' | 'bet' | 'win' | 'refund';
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  timestamp: Date;
  gameType?: string;
  matchId?: string;
}

interface User {
  id: string;
  username: string;
  email: string;
  status: 'active' | 'suspended' | 'banned' | 'pending_verification';
  joinDate: Date;
  lastLogin: Date;
  totalGames: number;
  totalWinnings: number;
  kycStatus: 'none' | 'pending' | 'verified' | 'rejected';
  riskLevel: 'low' | 'medium' | 'high';
}

interface Dispute {
  id: string;
  userId: string;
  username: string;
  type: 'payment' | 'game_result' | 'technical' | 'fraud';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: string;
}

interface Claim {
  id: string;
  userId: string;
  username: string;
  userEmail: string;
  type: 'payment_dispute' | 'game_issue' | 'account_access' | 'refund_request' | 'technical_support' | 'fraud_report';
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'resolved';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  subject: string;
  description: string;
  evidence?: string[];
  amount?: number;
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: string;
  adminNotes?: string;
  resolution?: string;
}

interface SupportMessage {
  id: string;
  userId: string;
  username: string;
  userEmail: string;
  type: 'contact_form' | 'live_chat' | 'support_ticket';
  subject: string;
  message: string;
  status: 'new' | 'in_progress' | 'responded' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'gaming' | 'wallet' | 'technical' | 'account' | 'general';
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: string;
  adminResponse?: string;
  chatHistory?: Array<{
    id: string;
    sender: 'user' | 'admin';
    message: string;
    timestamp: Date;
  }>;
}

interface FinancialReport {
  period: string;
  totalRevenue: number;
  totalPayouts: number;
  platformFees: number;
  netProfit: number;
  activeUsers: number;
  totalTransactions: number;
  averageBetSize: number;
  popularGames: { game: string; revenue: number }[];
}

export function AdminDashboard() {
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year'>('week');
  const [selectedGame, setSelectedGame] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('overview');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [financialData, setFinancialData] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedSupportMessage, setSelectedSupportMessage] = useState<SupportMessage | null>(null);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const { t } = useTranslation();
  const [inviteMatches, setInviteMatches] = useState<any[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteFilter, setInviteFilter] = useState<string>('all');
  const [inviteSearch, setInviteSearch] = useState<string>('');
  const [invitePage, setInvitePage] = useState<number>(1);
  const [inviteTotalPages, setInviteTotalPages] = useState<number>(1);

  // Load real data on component mount
  useEffect(() => {
    loadRealData();
    const interval = setInterval(loadRealData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [timeRange]);

  const loadRealData = async () => {
    setLoading(true);
    try {
      // Load users from real API
      const usersResponse = await fetch(import.meta.env.VITE_API_URL + '/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.data?.users || usersData.users || []);
      } else {
        console.error('Failed to load users:', usersResponse.status);
        setUsers([]);
      }

      // Load transactions from real API
      const transactionsResponse = await fetch(import.meta.env.VITE_API_URL + '/api/admin/transactions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setTransactions(transactionsData.data?.transactions || transactionsData.transactions || []);
      } else {
        console.error('Failed to load transactions:', transactionsResponse.status);
        setTransactions([]);
      }

      // Load support messages from real API
      const supportResponse = await fetch(import.meta.env.VITE_API_URL + '/api/admin/support-tickets', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (supportResponse.ok) {
        const supportData = await supportResponse.json();
        setSupportMessages(supportData.data?.tickets || supportData.tickets || []);
      } else {
        console.error('Failed to load support messages:', supportResponse.status);
        setSupportMessages([]);
      }

      // Remove mock/placeholder data for disputes, claims, and financialData
      setDisputes([]);
      setClaims([]);
      setFinancialData(null);

    } catch (error) {
      console.error('Error loading admin data:', error);
      setUsers([]);
      setTransactions([]);
      setSupportMessages([]);
      setDisputes([]);
      setClaims([]);
      setFinancialData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleViewClaim = (claim: Claim) => {
    setSelectedClaim(claim);
    setShowClaimModal(true);
  };

  const handleUpdateClaimStatus = (claimId: string, status: Claim['status']) => {
    setClaims(prevClaims => 
      prevClaims.map(claim => 
        claim.id === claimId 
          ? { ...claim, status, updatedAt: new Date() }
          : claim
      )
    );
  };

  const handleAddAdminNotes = (claimId: string, notes: string) => {
    setClaims(prevClaims => 
      prevClaims.map(claim => 
        claim.id === claimId 
          ? { ...claim, adminNotes: notes, updatedAt: new Date() }
          : claim
      )
    );
  };

  const handleViewSupportMessage = (message: SupportMessage) => {
    setSelectedSupportMessage(message);
    setShowSupportModal(true);
  };

  const handleUpdateSupportStatus = (messageId: string, status: SupportMessage['status']) => {
    setSupportMessages(prevMessages => 
      prevMessages.map(message => 
        message.id === messageId 
          ? { ...message, status, updatedAt: new Date() }
          : message
      )
    );
  };

  const handleRespondToSupport = (messageId: string, response: string) => {
    setSupportMessages(prevMessages => 
      prevMessages.map(message => 
        message.id === messageId 
          ? { 
              ...message, 
              adminResponse: response, 
              status: 'responded',
              updatedAt: new Date(),
              chatHistory: [
                ...(message.chatHistory || []),
                {
                  id: `admin-${Date.now()}`,
                  sender: 'admin',
                  message: response,
                  timestamp: new Date()
                }
              ]
            }
          : message
      )
    );
  };

  const getGrowthIcon = (rate: number) => {
    return rate > 0 ? <ArrowUp className="h-4 w-4 text-green-400" /> : <ArrowDown className="h-4 w-4 text-red-400" />;
  };

  const getGrowthColor = (rate: number) => {
    return rate > 0 ? 'text-green-400' : 'text-red-400';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-500';
      case 'pending': return 'text-yellow-500';
      case 'failed': return 'text-red-500';
      case 'cancelled': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getRiskLevelColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const filteredTransactions = transactions.filter(txn => 
    txn.username.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (filterStatus === 'all' || txn.status === filterStatus)
  );

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (filterStatus === 'all' || user.status === filterStatus)
  );

  const filteredDisputes = disputes.filter(dispute => 
    dispute.username.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (filterStatus === 'all' || dispute.status === filterStatus)
  );

  const filteredClaims = claims.filter(claim => 
    claim.username.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (filterStatus === 'all' || claim.status === filterStatus)
  );

  const filteredSupportMessages = supportMessages.filter(message => 
    message.username.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (filterStatus === 'all' || message.status === filterStatus)
  );

  const loadInviteMatches = async () => {
    setInviteLoading(true);
    setInviteError(null);
    try {
      const res = await fetch(`/api/admin/invites?page=${invitePage}&limit=50&status=${inviteFilter !== 'all' ? inviteFilter : ''}&search=${inviteSearch}`);
      const data = await res.json();
      if (data.success) {
        setInviteMatches(data.data.matches);
        setInviteTotalPages(Number(data.data.pagination.pages));
      } else {
        setInviteError(data.error || t('admin.inviteLoadError'));
      }
    } catch (e) {
      setInviteError(t('admin.inviteLoadError'));
    } finally {
      setInviteLoading(false);
    }
  };

  useEffect(() => { if (activeTab === 'invite-matches') loadInviteMatches(); }, [activeTab, invitePage, inviteFilter, inviteSearch]);

  const handleInviteAction = async (id: string, action: string) => {
    setInviteLoading(true);
    setInviteError(null);
    try {
      let url = `/api/admin/invites/${id}`;
      let method = 'POST';
      if (action === 'delete') method = 'DELETE';
      if (action === 'cancel') url += '/cancel';
      if (action === 'refund') url += '/refund';
      const res = await fetch(url, { method });
      const data = await res.json();
      if (!data.success) setInviteError(data.error || t('admin.inviteActionError'));
      else loadInviteMatches();
    } catch (e) {
      setInviteError(t('admin.inviteActionError'));
    } finally {
      setInviteLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'transactions', label: 'Transactions', icon: DollarSign },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'disputes', label: 'Disputes', icon: AlertTriangle },
    { id: 'claims', label: 'Claims', icon: FileText },
    { id: 'financial', label: 'Financial', icon: TrendingUp },
    { id: 'support', label: 'Support', icon: MessageSquare },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'audit', label: 'Audit Logs', icon: Database },
    { id: 'bulk', label: 'Bulk Operations', icon: Zap },
    { id: 'manual-tx', label: 'Manual Transactions', icon: CreditCard },
    { id: 'system-health', label: 'System Health', icon: Activity },
    { id: 'invite-matches', label: t('admin.invites'), icon: Gamepad2 },
  ];

  if (activeTab === 'admin-compliance') {
    return <ComplianceManagement />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-gray-400">Complete platform administration and monitoring</p>
          </div>
          <div className="flex items-center space-x-4">
            <button className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors">
              <RefreshCw className="h-4 w-4" />
              <span>Refresh Data</span>
            </button>
            <button className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors">
              <Download className="h-4 w-4" />
              <span>Export Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="flex space-x-1 p-4">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by username, ID, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
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
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Total Revenue</p>
                        <p className="text-2xl font-bold text-green-500">${(financialData?.totalRevenue || 0).toLocaleString()}</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-500" />
                    </div>
                  </div>
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Active Users</p>
                        <p className="text-2xl font-bold text-blue-500">{(financialData?.activeUsers || 0).toLocaleString()}</p>
                      </div>
                      <Users className="h-8 w-8 text-blue-500" />
                    </div>
                  </div>
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Open Disputes</p>
                        <p className="text-2xl font-bold text-orange-500">{disputes.filter(d => d.status === 'open').length}</p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-orange-500" />
                    </div>
                  </div>
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Platform Fees</p>
                        <p className="text-2xl font-bold text-purple-500">${(financialData?.platformFees || 0).toLocaleString()}</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-purple-500" />
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
                    <div className="space-y-3">
                      {transactions.slice(0, 5).map(txn => (
                        <div key={txn.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                          <div>
                            <p className="font-medium">{txn.username}</p>
                            <p className="text-sm text-gray-400">{txn.type} - ${txn.amount}</p>
                          </div>
                          <span className={`text-sm ${getStatusColor(txn.status)}`}>
                            {txn.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-lg font-semibold mb-4">Recent Disputes</h3>
                    <div className="space-y-3">
                      {disputes.slice(0, 5).map(dispute => (
                        <div key={dispute.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                          <div>
                            <p className="font-medium">{dispute.username}</p>
                            <p className="text-sm text-gray-400">{dispute.type}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${getPriorityColor(dispute.priority)}`}></div>
                            <span className="text-sm text-gray-400">{dispute.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Transactions Tab */}
            {activeTab === 'transactions' && (
              <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-700">
                  <h3 className="text-lg font-semibold">Transaction Monitoring</h3>
                  <p className="text-gray-400">Monitor all platform transactions in real-time</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {filteredTransactions.map(txn => (
                        <tr key={txn.id} className="hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{txn.id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{txn.username}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm capitalize">{txn.type}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">${txn.amount}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(txn.status)}`}>
                              {txn.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                            {txn.timestamp.toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button className="text-blue-400 hover:text-blue-300 mr-2">View</button>
                            <button className="text-green-400 hover:text-green-300 mr-2">Approve</button>
                            <button className="text-red-400 hover:text-red-300">Reject</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-700">
                  <h3 className="text-lg font-semibold">User Management</h3>
                  <p className="text-gray-400">Manage user accounts, KYC verification, and risk assessment</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">KYC</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Risk</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Games</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Winnings</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {filteredUsers.map(user => (
                        <tr key={user.id} className="hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium">{user.username}</div>
                              <div className="text-sm text-gray-400">{user.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.status)}`}>
                              {user.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.kycStatus)}`}>
                              {user.kycStatus}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm ${getRiskLevelColor(user.riskLevel)}`}>
                              {user.riskLevel}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{user.totalGames}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">${user.totalWinnings}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button className="text-blue-400 hover:text-blue-300 mr-2">View</button>
                            <button className="text-green-400 hover:text-green-300 mr-2">Verify</button>
                            <button className="text-red-400 hover:text-red-300">Suspend</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Disputes Tab */}
            {activeTab === 'disputes' && (
              <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-700">
                  <h3 className="text-lg font-semibold">Dispute Management</h3>
                  <p className="text-gray-400">Handle user disputes and support tickets</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Priority</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Created</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {filteredDisputes.map(dispute => (
                        <tr key={dispute.id} className="hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{dispute.id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{dispute.username}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm capitalize">{dispute.type}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <div className={`w-3 h-3 rounded-full ${getPriorityColor(dispute.priority)}`}></div>
                              <span className="text-sm capitalize">{dispute.priority}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(dispute.status)}`}>
                              {dispute.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                            {dispute.createdAt.toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button className="text-blue-400 hover:text-blue-300 mr-2">View</button>
                            <button className="text-green-400 hover:text-green-300 mr-2">Assign</button>
                            <button className="text-purple-400 hover:text-purple-300">Resolve</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Claims Tab */}
            {activeTab === 'claims' && (
              <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-700">
                  <h3 className="text-lg font-semibold">Claim Management</h3>
                  <p className="text-gray-400">Handle user claims and support tickets</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Created</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {filteredClaims.map(claim => (
                        <tr key={claim.id} className="hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{claim.id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{claim.username}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm capitalize">{claim.type}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(claim.status)}`}>
                              {claim.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                            {claim.createdAt.toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button 
                              onClick={() => handleViewClaim(claim)}
                              className="text-blue-400 hover:text-blue-300 mr-2"
                            >
                              View
                            </button>
                            <button 
                              onClick={() => handleUpdateClaimStatus(claim.id, 'approved')}
                              className="text-green-400 hover:text-green-300 mr-2"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => handleUpdateClaimStatus(claim.id, 'rejected')}
                              className="text-red-400 hover:text-red-300"
                            >
                              Reject
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Financial Tab */}
            {activeTab === 'financial' && financialData && (
              <div className="space-y-6">
                {/* Financial Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Total Revenue</p>
                        <p className="text-2xl font-bold text-green-500">${(financialData.totalRevenue || 0).toLocaleString()}</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-500" />
                    </div>
                  </div>
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Total Payouts</p>
                        <p className="text-2xl font-bold text-red-500">${(financialData.totalPayouts || 0).toLocaleString()}</p>
                      </div>
                      <TrendingDown className="h-8 w-8 text-red-500" />
                    </div>
                  </div>
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Platform Fees</p>
                        <p className="text-2xl font-bold text-purple-500">${(financialData.platformFees || 0).toLocaleString()}</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-purple-500" />
                    </div>
                  </div>
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Net Profit</p>
                        <p className="text-2xl font-bold text-blue-500">${(financialData.netProfit || 0).toLocaleString()}</p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-blue-500" />
                    </div>
                  </div>
                </div>

                {/* Popular Games */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                  <h3 className="text-lg font-semibold mb-4">Popular Games Revenue</h3>
                  <div className="space-y-3">
                    {financialData.popularGames && financialData.popularGames.map((game, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                        <span className="text-gray-300">{game.game}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-gaming-gold font-semibold">
                            ${(game.revenue || 0).toFixed(2)}
                          </span>
                          <span className="text-gray-500 text-sm">
                            ({((game.revenue || 0) / (financialData.totalRevenue || 1) * 100).toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Additional Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Total Transactions</p>
                        <p className="text-2xl font-bold text-blue-500">{(financialData.totalTransactions || 0).toLocaleString()}</p>
                      </div>
                      <Activity className="h-8 w-8 text-blue-500" />
                    </div>
                  </div>
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Average Bet Size</p>
                        <p className="text-2xl font-bold text-green-500">${(financialData.averageBetSize || 0).toFixed(2)}</p>
                      </div>
                      <Target className="h-8 w-8 text-green-500" />
                    </div>
                  </div>
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Active Users</p>
                        <p className="text-2xl font-bold text-purple-500">{(financialData.activeUsers || 0).toLocaleString()}</p>
                      </div>
                      <Users className="h-8 w-8 text-purple-500" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Support Messages Tab */}
            {activeTab === 'support' && (
              <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-700">
                  <h3 className="text-lg font-semibold">Support Messages</h3>
                  <p className="text-gray-400">Manage support messages and chat from users</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Subject</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Priority</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Created</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {filteredSupportMessages.map(message => (
                        <tr key={message.id} className="hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium">{message.username}</div>
                              <div className="text-sm text-gray-400">{message.userEmail}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{message.subject}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm capitalize">{message.type}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(message.status)}`}>
                              {message.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`w-3 h-3 rounded-full ${getPriorityColor(message.priority)}`}></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                            {message.createdAt.toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button 
                              onClick={() => handleViewSupportMessage(message)}
                              className="text-blue-400 hover:text-blue-300 mr-2"
                            >
                              View
                            </button>
                            <button 
                              onClick={() => handleUpdateSupportStatus(message.id, 'in_progress')}
                              className="text-yellow-400 hover:text-yellow-300 mr-2"
                            >
                              In Progress
                            </button>
                            <button 
                              onClick={() => handleUpdateSupportStatus(message.id, 'resolved')}
                              className="text-green-400 hover:text-green-300"
                            >
                              Resolve
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-lg font-semibold mb-4">Security Overview</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span>Failed Login Attempts</span>
                        <span className="text-red-500 font-semibold">23</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Suspicious Activities</span>
                        <span className="text-orange-500 font-semibold">7</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Blocked IPs</span>
                        <span className="text-yellow-500 font-semibold">12</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Security Score</span>
                        <span className="text-green-500 font-semibold">92%</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-lg font-semibold mb-4">Recent Security Events</h3>
                    <div className="space-y-3">
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <p className="text-sm font-medium text-red-400">Multiple failed login attempts</p>
                        <p className="text-xs text-gray-400">IP: 192.168.1.100 - 2 minutes ago</p>
                      </div>
                      <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                        <p className="text-sm font-medium text-orange-400">Unusual betting pattern detected</p>
                        <p className="text-xs text-gray-400">User: Player123 - 15 minutes ago</p>
                      </div>
                      <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <p className="text-sm font-medium text-yellow-400">New device login</p>
                        <p className="text-xs text-gray-400">User: Player456 - 1 hour ago</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* System Health Tab */}
            {activeTab === 'system-health' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">System Status</p>
                        <p className="text-2xl font-bold text-green-500">Healthy</p>
                      </div>
                      <Activity className="h-8 w-8 text-green-500" />
                    </div>
                  </div>
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Database</p>
                        <p className="text-2xl font-bold text-blue-500">Online</p>
                      </div>
                      <Database className="h-8 w-8 text-blue-500" />
                    </div>
                  </div>
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Memory Usage</p>
                        <p className="text-2xl font-bold text-yellow-500">65%</p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-yellow-500" />
                    </div>
                  </div>
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">CPU Usage</p>
                        <p className="text-2xl font-bold text-purple-500">42%</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-purple-500" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-lg font-semibold mb-4">System Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Platform:</span>
                        <span>Windows 10</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Node Version:</span>
                        <span>v18.17.0</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Uptime:</span>
                        <span>2d 14h 32m</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Active Sessions:</span>
                        <span>12</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-lg font-semibold mb-4">Recent Alerts</h3>
                    <div className="space-y-3">
                      <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <p className="text-sm font-medium text-green-400">System health check passed</p>
                        <p className="text-xs text-gray-400">2 minutes ago</p>
                      </div>
                      <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <p className="text-sm font-medium text-yellow-400">Memory usage above 80%</p>
                        <p className="text-xs text-gray-400">15 minutes ago</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Audit Logs Tab */}
            {activeTab === 'audit' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Total Logs</p>
                        <p className="text-2xl font-bold text-blue-500">1,247</p>
                      </div>
                      <Database className="h-8 w-8 text-blue-500" />
                    </div>
                  </div>
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Today's Logs</p>
                        <p className="text-2xl font-bold text-green-500">89</p>
                      </div>
                      <Calendar className="h-8 w-8 text-green-500" />
                    </div>
                  </div>
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Failed Actions</p>
                        <p className="text-2xl font-bold text-red-500">3</p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-red-500" />
                    </div>
                  </div>
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Success Rate</p>
                        <p className="text-2xl font-bold text-purple-500">99.8%</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-purple-500" />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                  <div className="p-6 border-b border-gray-700">
                    <h3 className="text-lg font-semibold">Recent Audit Logs</h3>
                    <p className="text-gray-400">Track all admin actions and system events</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Admin</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Action</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Resource</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">IP Address</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                                <span className="text-sm font-medium text-white">A</span>
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-white">admin</div>
                                <div className="text-sm text-gray-400">admin@chanspaw.com</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white">user_verified</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">User: john_doe</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Success
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">192.168.1.100</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">2 minutes ago</td>
                        </tr>
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
                                <span className="text-sm font-medium text-white">M</span>
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-white">moderator</div>
                                <div className="text-sm text-gray-400">mod@chanspaw.com</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white">manual_transaction_created</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">Transaction: $50 bonus</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Success
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">192.168.1.101</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">5 minutes ago</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Bulk Operations Tab */}
            {activeTab === 'bulk' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Total Operations</p>
                        <p className="text-2xl font-bold text-blue-500">156</p>
                      </div>
                      <Zap className="h-8 w-8 text-blue-500" />
                    </div>
                  </div>
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Successful</p>
                        <p className="text-2xl font-bold text-green-500">152</p>
                      </div>
                      <Check className="h-8 w-8 text-green-500" />
                    </div>
                  </div>
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Failed</p>
                        <p className="text-2xl font-bold text-red-500">4</p>
                      </div>
                      <X className="h-8 w-8 text-red-500" />
                    </div>
                  </div>
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Success Rate</p>
                        <p className="text-2xl font-bold text-purple-500">97.4%</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-purple-500" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-lg font-semibold mb-4">Bulk User Operations</h3>
                    <div className="space-y-4">
                      <button className="w-full flex items-center justify-between p-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                        <span>Bulk Verify Users</span>
                        <Users className="h-5 w-5" />
                      </button>
                      <button className="w-full flex items-center justify-between p-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors">
                        <span>Bulk Activate Users</span>
                        <UserCheck className="h-5 w-5" />
                      </button>
                      <button className="w-full flex items-center justify-between p-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors">
                        <span>Bulk Suspend Users</span>
                        <UserX className="h-5 w-5" />
                      </button>
                      <button className="w-full flex items-center justify-between p-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors">
                        <span>Bulk Balance Adjustment</span>
                        <DollarSign className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-lg font-semibold mb-4">Recent Bulk Operations</h3>
                    <div className="space-y-3">
                      <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <p className="text-sm font-medium text-green-400">Bulk verify: 25 users</p>
                        <p className="text-xs text-gray-400">Success: 25, Failed: 0</p>
                        <p className="text-xs text-gray-400">2 minutes ago</p>
                      </div>
                      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <p className="text-sm font-medium text-blue-400">Bulk balance add: $10 bonus</p>
                        <p className="text-xs text-gray-400">Success: 50, Failed: 2</p>
                        <p className="text-xs text-gray-400">15 minutes ago</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Manual Transactions Tab */}
            {activeTab === 'manual-tx' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Total Manual TX</p>
                        <p className="text-2xl font-bold text-blue-500">89</p>
                      </div>
                      <CreditCard className="h-8 w-8 text-blue-500" />
                    </div>
                  </div>
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Total Amount</p>
                        <p className="text-2xl font-bold text-green-500">$12,450</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-500" />
                    </div>
                  </div>
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Today's TX</p>
                        <p className="text-2xl font-bold text-purple-500">12</p>
                      </div>
                      <Calendar className="h-8 w-8 text-purple-500" />
                    </div>
                  </div>
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Pending Approval</p>
                        <p className="text-2xl font-bold text-yellow-500">3</p>
                      </div>
                      <Clock className="h-8 w-8 text-yellow-500" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-lg font-semibold mb-4">Create Manual Transaction</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">User ID</label>
                        <input type="text" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" placeholder="Enter user ID" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Transaction Type</label>
                        <select className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                          <option>Deposit</option>
                          <option>Withdrawal</option>
                          <option>Bonus</option>
                          <option>Refund</option>
                          <option>Penalty</option>
                          <option>Adjustment</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Amount</label>
                        <input type="number" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" placeholder="0.00" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Reason</label>
                        <textarea className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" rows="3" placeholder="Enter reason for transaction"></textarea>
                      </div>
                      <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                        Create Transaction
                      </button>
                    </div>
                  </div>
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-lg font-semibold mb-4">Recent Manual Transactions</h3>
                    <div className="space-y-3">
                      <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <p className="text-sm font-medium text-green-400">Bonus: $50 to user123</p>
                        <p className="text-xs text-gray-400">Reason: Welcome bonus</p>
                        <p className="text-xs text-gray-400">2 minutes ago</p>
                      </div>
                      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <p className="text-sm font-medium text-blue-400">Refund: $25 from user456</p>
                        <p className="text-xs text-gray-400">Reason: Game error compensation</p>
                        <p className="text-xs text-gray-400">15 minutes ago</p>
                      </div>
                      <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <p className="text-sm font-medium text-yellow-400">Penalty: $10 from user789</p>
                        <p className="text-xs text-gray-400">Reason: Terms violation</p>
                        <p className="text-xs text-gray-400">1 hour ago</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'invite-matches' && (
              <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-700 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <h3 className="text-lg font-semibold text-white">{t('admin.invites')}</h3>
                  <div className="flex flex-col md:flex-row gap-2 items-center">
                    <input
                      type="text"
                      placeholder={t('admin.searchByUserOrGame')}
                      value={inviteSearch}
                      onChange={e => setInviteSearch(e.target.value)}
                      className="px-3 py-1 bg-gaming-dark border border-gray-600 rounded text-white text-sm placeholder-gray-400 focus:outline-none focus:border-gaming-accent"
                    />
                    <select
                      value={inviteFilter}
                      onChange={e => setInviteFilter(e.target.value)}
                      className="px-3 py-1 bg-gaming-dark border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-gaming-accent"
                    >
                      <option value="all">{t('admin.all')}</option>
                      <option value="active">{t('admin.active')}</option>
                      <option value="cancelled">{t('admin.cancelled')}</option>
                      <option value="refunded">{t('admin.refunded')}</option>
                      <option value="completed">{t('admin.completed')}</option>
                    </select>
                  </div>
                </div>
                {inviteError && <div className="text-red-400 p-4">{inviteError}</div>}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">{t('admin.user')}</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">{t('admin.game')}</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">{t('admin.bet')}</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">{t('admin.currency')}</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">{t('admin.status')}</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">{t('admin.created')}</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">{t('admin.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {inviteLoading ? (
                        <tr><td colSpan={7} className="text-center text-gray-400 py-8">{t('general.loading')}</td></tr>
                      ) : inviteMatches.length === 0 ? (
                        <tr><td colSpan={7} className="text-center text-gray-400 py-8">{t('admin.noInvites')}</td></tr>
                      ) : inviteMatches.map(match => (
                        <tr key={match.id} className="hover:bg-gray-700">
                          <td className="px-4 py-2 text-sm text-white">{match.player1?.username} vs {match.player2?.username}</td>
                          <td className="px-4 py-2 text-sm text-white">{match.gameType}</td>
                          <td className="px-4 py-2 text-sm text-white">{match.betAmount}</td>
                          <td className="px-4 py-2 text-sm text-white">{match.matchType}</td>
                          <td className="px-4 py-2 text-sm text-white">{t(`admin.${match.status}`)}</td>
                          <td className="px-4 py-2 text-sm text-white">{new Date(match.createdAt).toLocaleString()}</td>
                          <td className="px-4 py-2 text-sm">
                            <button onClick={() => handleInviteAction(match.id, 'cancel')} className="text-yellow-400 hover:text-yellow-300 mr-2">{t('admin.cancel')}</button>
                            <button onClick={() => handleInviteAction(match.id, 'refund')} className="text-blue-400 hover:text-blue-300 mr-2">{t('admin.refund')}</button>
                            <button onClick={() => handleInviteAction(match.id, 'delete')} className="text-red-400 hover:text-red-300">{t('admin.delete')}</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-between items-center p-4">
                  <button disabled={invitePage === 1} onClick={() => setInvitePage(p => Math.max(1, Number(p) - 1))} className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50">{t('admin.prev')}</button>
                  <span className="text-gray-300 text-sm">{t('admin.page')} {invitePage} / {inviteTotalPages}</span>
                  <button disabled={invitePage === inviteTotalPages} onClick={() => setInvitePage(p => Math.min(Number(inviteTotalPages), Number(p) + 1))} className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50">{t('admin.next')}</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Support Modal */}
      {showSupportModal && selectedSupportMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Support Message Details</h3>
              <button 
                onClick={() => setShowSupportModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Message Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">User</label>
                  <p className="font-medium">{selectedSupportMessage.username}</p>
                  <p className="text-sm text-gray-400">{selectedSupportMessage.userEmail}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Type</label>
                  <p className="font-medium capitalize">{selectedSupportMessage.type}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Subject</label>
                  <p className="font-medium">{selectedSupportMessage.subject}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Status</label>
                  <p className="font-medium">{selectedSupportMessage.status}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Priority</label>
                  <p className="font-medium capitalize">{selectedSupportMessage.priority}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Created</label>
                  <p className="font-medium">{selectedSupportMessage.createdAt.toLocaleString()}</p>
                </div>
              </div>

              {/* Original Message */}
              <div>
                <label className="text-sm text-gray-400">Original Message</label>
                <div className="mt-2 p-4 bg-gray-700 rounded-lg">
                  <p className="text-white">{selectedSupportMessage.message}</p>
                </div>
              </div>

              {/* Chat History */}
              {selectedSupportMessage.chatHistory && selectedSupportMessage.chatHistory.length > 0 && (
                <div>
                  <label className="text-sm text-gray-400">Chat History</label>
                  <div className="mt-2 space-y-3 max-h-64 overflow-y-auto">
                    {selectedSupportMessage.chatHistory.map((chat) => (
                      <div key={chat.id} className={`p-3 rounded-lg ${
                        chat.sender === 'admin' ? 'bg-blue-600 ml-8' : 'bg-gray-700 mr-8'
                      }`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">
                            {chat.sender === 'admin' ? 'Admin' : selectedSupportMessage.username}
                          </span>
                          <span className="text-xs text-gray-300">
                            {chat.timestamp.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm">{chat.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Response */}
              <div>
                <label className="text-sm text-gray-400">Admin Response</label>
                <textarea
                  className="mt-2 w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  rows={4}
                  placeholder="Type your response..."
                  defaultValue={selectedSupportMessage.adminResponse || ''}
                  onChange={(e) => {
                    setSelectedSupportMessage({
                      ...selectedSupportMessage,
                      adminResponse: e.target.value
                    });
                  }}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleUpdateSupportStatus(selectedSupportMessage.id, 'in_progress')}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg"
                  >
                    Mark In Progress
                  </button>
                  <button
                    onClick={() => handleUpdateSupportStatus(selectedSupportMessage.id, 'resolved')}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                  >
                    Mark Resolved
                  </button>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      if (selectedSupportMessage.adminResponse) {
                        handleRespondToSupport(selectedSupportMessage.id, selectedSupportMessage.adminResponse);
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    Send Response
                  </button>
                  <button
                    onClick={() => setShowSupportModal(false)}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Claim Modal */}
      {showClaimModal && selectedClaim && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Claim Details</h3>
              <button 
                onClick={() => setShowClaimModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Claim Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">User</label>
                  <p className="font-medium">{selectedClaim.username}</p>
                  <p className="text-sm text-gray-400">{selectedClaim.userEmail}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Type</label>
                  <p className="font-medium capitalize">{selectedClaim.type}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Subject</label>
                  <p className="font-medium">{selectedClaim.subject}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Status</label>
                  <p className="font-medium">{selectedClaim.status}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Priority</label>
                  <p className="font-medium capitalize">{selectedClaim.priority}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Amount</label>
                  <p className="font-medium">${selectedClaim.amount || 0}</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-sm text-gray-400">Description</label>
                <div className="mt-2 p-4 bg-gray-700 rounded-lg">
                  <p className="text-white">{selectedClaim.description}</p>
                </div>
              </div>

              {/* Evidence */}
              {selectedClaim.evidence && selectedClaim.evidence.length > 0 && (
                <div>
                  <label className="text-sm text-gray-400">Evidence</label>
                  <div className="mt-2 space-y-2">
                    {selectedClaim.evidence.map((evidence, index) => (
                      <div key={index} className="p-3 bg-gray-700 rounded-lg">
                        <p className="text-sm">{evidence}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              <div>
                <label className="text-sm text-gray-400">Admin Notes</label>
                <textarea
                  className="mt-2 w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  rows={4}
                  placeholder="Add admin notes..."
                  defaultValue={selectedClaim.adminNotes || ''}
                  onChange={(e) => {
                    setSelectedClaim({
                      ...selectedClaim,
                      adminNotes: e.target.value
                    });
                  }}
                />
              </div>

              {/* Resolution */}
              <div>
                <label className="text-sm text-gray-400">Resolution</label>
                <textarea
                  className="mt-2 w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  rows={4}
                  placeholder="Add resolution details..."
                  defaultValue={selectedClaim.resolution || ''}
                  onChange={(e) => {
                    setSelectedClaim({
                      ...selectedClaim,
                      resolution: e.target.value
                    });
                  }}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleUpdateClaimStatus(selectedClaim.id, 'approved')}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                  >
                    Approve Claim
                  </button>
                  <button
                    onClick={() => handleUpdateClaimStatus(selectedClaim.id, 'rejected')}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                  >
                    Reject Claim
                  </button>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      if (selectedClaim.adminNotes) {
                        handleAddAdminNotes(selectedClaim.id, selectedClaim.adminNotes);
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    Save Notes
                  </button>
                  <button
                    onClick={() => setShowClaimModal(false)}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
