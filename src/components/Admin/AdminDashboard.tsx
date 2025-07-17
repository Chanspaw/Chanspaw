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

  // [MAJOR EDIT] Refactor invite-based match management to use new /api/admin/invites endpoints. Ensure all admin actions (view, cancel, delete, refund) are production-ready, logged, and UI is multilingual and responsive. Remove any legacy logic.
  const loadInviteMatches = async () => {
    setInviteLoading(true);
    setInviteError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/invites?page=${invitePage}&limit=50&status=${inviteFilter !== 'all' ? inviteFilter : ''}&search=${inviteSearch}`);
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
      let url = `${import.meta.env.VITE_API_URL}/api/admin/invites/${id}`;
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
    <div className="min-h-screen bg-card-gradient text-white">
      {/* Header */}
      <div className="bg-gaming-dark border-b border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gaming-accent">Admin Panel</h1>
            <p className="text-gray-400">All platform controls and analytics</p>
          </div>
        </div>
      </div>
      {/* Sidebar and Content */}
      <div className="flex">
        <div className="sidebar-mobile bg-gaming-darker border-r border-gaming-card">
          {/* Sidebar component here */}
        </div>
        <main className="flex-1 p-6">
          {/* All admin content/tabs here, wrap each section/card in bg-gaming-dark or bg-card-gradient as appropriate */}
          {/* Example: */}
          <div className="bg-gaming-dark rounded-xl p-6 border border-gray-700 mb-6">
            {/* Section content */}
          </div>
          {/* ...repeat for all admin sections/tabs... */}
        </main>
      </div>
    </div>
  );
}
