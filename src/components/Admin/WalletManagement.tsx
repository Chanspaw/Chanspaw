import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  CreditCard, 
  Bitcoin, 
  CheckCircle,
  X,
  AlertTriangle,
  Lock,
  Unlock,
  Settings,
  Users,
  Gift,
  TrendingUp,
  Clock,
  Eye,
  Filter,
  Search,
  Download,
  Upload,
  Shield,
  Zap,
  Star,
  UserPlus,
  RefreshCw,
  BarChart3,
  Calendar,
  DollarSign as DollarIcon,
  ArrowUpRight,
  ArrowDownLeft,
  MoreVertical,
  Edit,
  Trash2,
  Plus
} from 'lucide-react';

interface Transaction {
  id: string;
  userId: string;
  username: string;
  type: 'deposit' | 'withdrawal' | 'bet' | 'win' | 'bonus' | 'refund';
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'rejected';
  paymentMethod: 'stripe' | 'paypal' | 'bitcoin' | 'ethereum' | 'bank_transfer' | 'internal';
  createdAt: string;
  processedAt?: string;
  reference?: string;
  description?: string;
  adminNotes?: string;
}

interface WithdrawalRequest {
  id: string;
  userId: string;
  username: string;
  amount: number;
  paymentMethod: string;
  accountDetails: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  processedAt?: string;
  adminNotes?: string;
}

interface PaymentProvider {
  id: string;
  name: string;
  type: 'stripe' | 'paypal' | 'crypto' | 'bank';
  isActive: boolean;
  apiKey?: string;
  webhookUrl?: string;
  fees: number;
  minAmount: number;
  maxAmount: number;
}

interface WalletLimit {
  id: string;
  type: 'daily_deposit' | 'daily_withdrawal' | 'monthly_deposit' | 'monthly_withdrawal' | 'max_balance';
  value: number;
  isActive: boolean;
  description: string;
}

interface BonusSystem {
  id: string;
  name: string;
  type: 'welcome' | 'referral' | 'deposit' | 'loyalty' | 'promotional';
  amount: number;
  percentage?: number;
  minDeposit?: number;
  maxBonus?: number;
  wageringRequirement: number;
  isActive: boolean;
  validFrom: string;
  validTo?: string;
  description: string;
}

interface FrozenWallet {
  id: string;
  userId: string;
  username: string;
  reason: string;
  frozenAt: string;
  frozenBy: string;
  notes?: string;
}

export function WalletManagement() {
  const [activeTab, setActiveTab] = useState<'transactions' | 'withdrawals' | 'providers' | 'limits' | 'frozen' | 'bonuses'>('transactions');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'failed'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'deposit' | 'withdrawal' | 'bet' | 'win'>('all');
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Real data from API
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [paymentProviders, setPaymentProviders] = useState<PaymentProvider[]>([]);
  const [walletLimits, setWalletLimits] = useState<WalletLimit[]>([]);
  const [bonusSystems, setBonusSystems] = useState<BonusSystem[]>([]);
  const [frozenWallets, setFrozenWallets] = useState<FrozenWallet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
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

      // Load withdrawal requests from real API
      const withdrawalsResponse = await fetch(import.meta.env.VITE_API_URL + '/api/admin/withdrawals', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (withdrawalsResponse.ok) {
        const withdrawalsData = await withdrawalsResponse.json();
        setWithdrawalRequests(withdrawalsData.data?.requests || withdrawalsData.requests || []);
      } else {
        console.error('Failed to load withdrawal requests:', withdrawalsResponse.status);
        setWithdrawalRequests([]);
      }

      // Load payment providers from real API
      const providersResponse = await fetch(import.meta.env.VITE_API_URL + '/api/admin/payment-providers', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (providersResponse.ok) {
        const providersData = await providersResponse.json();
        setPaymentProviders(providersData.data?.providers || providersData.providers || []);
      } else {
        console.error('Failed to load payment providers:', providersResponse.status);
        setPaymentProviders([]);
      }

      // Load wallet limits from real API
      const limitsResponse = await fetch(import.meta.env.VITE_API_URL + '/api/admin/wallet-limits', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (limitsResponse.ok) {
        const limitsData = await limitsResponse.json();
        setWalletLimits(limitsData.data?.limits || limitsData.limits || []);
      } else {
        console.error('Failed to load wallet limits:', limitsResponse.status);
        setWalletLimits([]);
      }

      // Load bonus systems from real API
      const bonusesResponse = await fetch(import.meta.env.VITE_API_URL + '/api/admin/bonus-systems', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (bonusesResponse.ok) {
        const bonusesData = await bonusesResponse.json();
        setBonusSystems(bonusesData.data?.bonuses || bonusesData.bonuses || []);
      } else {
        console.error('Failed to load bonus systems:', bonusesResponse.status);
        setBonusSystems([]);
      }

      // Load frozen wallets from real API
      const frozenResponse = await fetch(import.meta.env.VITE_API_URL + '/api/admin/frozen-wallets', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (frozenResponse.ok) {
        const frozenData = await frozenResponse.json();
        setFrozenWallets(frozenData.data?.wallets || frozenData.wallets || []);
      } else {
        console.error('Failed to load frozen wallets:', frozenResponse.status);
        setFrozenWallets([]);
      }
    } catch (error) {
      console.error('Error loading wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveWithdrawal = (requestId: string) => {
    // In real app, this would make an API call
    console.log('Approving withdrawal:', requestId);
    alert('Withdrawal approved successfully');
  };

  const handleRejectWithdrawal = (requestId: string, reason: string) => {
    // In real app, this would make an API call
    console.log('Rejecting withdrawal:', requestId, 'Reason:', reason);
    alert('Withdrawal rejected');
  };

  const handleFreezeWallet = (userId: string, reason: string) => {
    // In real app, this would make an API call
    console.log('Freezing wallet for user:', userId, 'Reason:', reason);
    alert('Wallet frozen successfully');
  };

  const handleUnfreezeWallet = (userId: string) => {
    // In real app, this would make an API call
    console.log('Unfreezing wallet for user:', userId);
    alert('Wallet unfrozen successfully');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-400/10';
      case 'pending': return 'text-yellow-400 bg-yellow-400/10';
      case 'failed': return 'text-red-400 bg-red-400/10';
      case 'rejected': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'deposit': return 'text-green-400';
      case 'withdrawal': return 'text-red-400';
      case 'win': return 'text-gaming-gold';
      case 'bet': return 'text-blue-400';
      case 'bonus': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'stripe': return CreditCard;
      case 'paypal': return CreditCard;
      case 'bitcoin': return Bitcoin;
      case 'ethereum': return Bitcoin;
      default: return DollarSign;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-card-gradient text-white">
      <div className="p-6">
        <div className="bg-gaming-dark rounded-xl p-6 border border-gray-700 mb-6">
          <h1 className="text-2xl font-bold text-gaming-accent">Wallet Management</h1>
          <div className="flex items-center justify-between mt-4">
            <div className="flex space-x-3">
              <button className="bg-gaming-accent text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span>Reports</span>
              </button>
              <button className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center space-x-2">
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-card-gradient rounded-xl border border-gray-700">
          <div className="flex border-b border-gray-700 overflow-x-auto">
            <button
              onClick={() => setActiveTab('transactions')}
              className={`flex-shrink-0 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'transactions'
                  ? 'text-gaming-accent border-b-2 border-gaming-accent'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <DollarSign className="h-4 w-4 inline mr-2" />
              Transactions
            </button>
            <button
              onClick={() => setActiveTab('withdrawals')}
              className={`flex-shrink-0 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'withdrawals'
                  ? 'text-gaming-accent border-b-2 border-gaming-accent'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Upload className="h-4 w-4 inline mr-2" />
              Withdrawals
            </button>
            <button
              onClick={() => setActiveTab('providers')}
              className={`flex-shrink-0 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'providers'
                  ? 'text-gaming-accent border-b-2 border-gaming-accent'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <CreditCard className="h-4 w-4 inline mr-2" />
              Payment Providers
            </button>
            <button
              onClick={() => setActiveTab('limits')}
              className={`flex-shrink-0 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'limits'
                  ? 'text-gaming-accent border-b-2 border-gaming-accent'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Shield className="h-4 w-4 inline mr-2" />
              Limits
            </button>
            <button
              onClick={() => setActiveTab('frozen')}
              className={`flex-shrink-0 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'frozen'
                  ? 'text-gaming-accent border-b-2 border-gaming-accent'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Lock className="h-4 w-4 inline mr-2" />
              Frozen Wallets
            </button>
            <button
              onClick={() => setActiveTab('bonuses')}
              className={`flex-shrink-0 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'bonuses'
                  ? 'text-gaming-accent border-b-2 border-gaming-accent'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Gift className="h-4 w-4 inline mr-2" />
              Bonus Systems
            </button>
          </div>

          <div className="p-6">
            {/* Transactions Tab */}
            {activeTab === 'transactions' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">All Transactions</h3>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Search className="h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search transactions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="px-3 py-1 bg-gaming-dark border border-gray-600 rounded text-white text-sm placeholder-gray-400 focus:outline-none focus:border-gaming-accent"
                      />
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="px-3 py-1 bg-gaming-dark border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-gaming-accent"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="failed">Failed</option>
                    </select>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value as any)}
                      className="px-3 py-1 bg-gaming-dark border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-gaming-accent"
                    >
                      <option value="all">All Types</option>
                      <option value="deposit">Deposits</option>
                      <option value="withdrawal">Withdrawals</option>
                      <option value="bet">Bets</option>
                      <option value="win">Wins</option>
                    </select>
                  </div>
                </div>

                {transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-400">No transactions found</p>
                    <p className="text-gray-500 text-sm">Transactions will appear here once users start making payments</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gaming-dark">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">User</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Amount</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Method</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {transactions.map((transaction) => (
                          <tr key={transaction.id} className="hover:bg-gray-800/50">
                            <td className="px-4 py-3">
                              <span className="text-white font-medium">{transaction.username}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`font-medium ${getTypeColor(transaction.type)}`}>
                                {transaction.type.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`font-medium ${transaction.type === 'deposit' || transaction.type === 'win' ? 'text-green-400' : 'text-red-400'}`}>
                                {transaction.type === 'deposit' || transaction.type === 'win' ? '+' : '-'}{formatCurrency(transaction.amount)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center space-x-2">
                                {React.createElement(getPaymentMethodIcon(transaction.paymentMethod), { className: 'h-4 w-4 text-gray-400' })}
                                <span className="text-gray-300 capitalize">{transaction.paymentMethod.replace('_', ' ')}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs ${getStatusColor(transaction.status)}`}>
                                {transaction.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-300 text-sm">
                              {new Date(transaction.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3">
                              <button className="text-blue-400 hover:text-blue-300">
                                <Eye className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Withdrawals Tab */}
            {activeTab === 'withdrawals' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Withdrawal Requests</h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-400">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                    <span>{withdrawalRequests.filter(w => w.status === 'pending').length} pending</span>
                  </div>
                </div>

                {withdrawalRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-400">No withdrawal requests</p>
                    <p className="text-gray-500 text-sm">Withdrawal requests will appear here when users submit them</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {withdrawalRequests.map((request) => (
                      <div key={request.id} className="bg-gaming-dark rounded-lg p-4 border border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-white font-medium">{request.username}</h4>
                          <span className={`px-2 py-1 rounded text-xs ${getStatusColor(request.status)}`}>
                            {request.status}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Amount:</span>
                            <span className="text-red-400 font-medium">{formatCurrency(request.amount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Method:</span>
                            <span className="text-white">{request.paymentMethod}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Requested:</span>
                            <span className="text-white">{new Date(request.requestedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        {request.status === 'pending' && (
                          <div className="mt-3 flex space-x-2">
                            <button 
                              onClick={() => handleApproveWithdrawal(request.id)}
                              className="flex-1 bg-green-600 text-white px-3 py-1 rounded text-xs hover:opacity-90"
                            >
                              <CheckCircle className="h-3 w-3 inline mr-1" />
                              Approve
                            </button>
                            <button 
                              onClick={() => handleRejectWithdrawal(request.id, 'Manual rejection')}
                              className="flex-1 bg-red-600 text-white px-3 py-1 rounded text-xs hover:opacity-90"
                            >
                              <X className="h-3 w-3 inline mr-1" />
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Payment Providers Tab */}
            {activeTab === 'providers' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Payment Providers</h3>
                  <button 
                    onClick={() => setShowProviderModal(true)}
                    className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Provider</span>
                  </button>
                </div>

                {paymentProviders.length === 0 ? (
                  <div className="text-center py-12">
                    <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-400">No payment providers configured</p>
                    <p className="text-gray-500 text-sm">Add payment providers to enable deposits and withdrawals</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paymentProviders.map((provider) => (
                      <div key={provider.id} className="bg-gaming-dark rounded-lg p-4 border border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            {React.createElement(getPaymentMethodIcon(provider.type), { className: 'h-5 w-5 text-gaming-accent' })}
                            <h4 className="text-white font-medium">{provider.name}</h4>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs ${provider.isActive ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'}`}>
                            {provider.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Fees:</span>
                            <span className="text-white">{provider.fees}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Min Amount:</span>
                            <span className="text-white">{formatCurrency(provider.minAmount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Max Amount:</span>
                            <span className="text-white">{formatCurrency(provider.maxAmount)}</span>
                          </div>
                        </div>
                        <div className="mt-3 flex space-x-2">
                          <button className="flex-1 bg-blue-600 text-white px-3 py-1 rounded text-xs hover:opacity-90">
                            <Edit className="h-3 w-3 inline mr-1" />
                            Edit
                          </button>
                          <button className="flex-1 bg-gray-600 text-white px-3 py-1 rounded text-xs hover:opacity-90">
                            <Settings className="h-3 w-3 inline mr-1" />
                            Configure
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Limits Tab */}
            {activeTab === 'limits' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Wallet Limits</h3>
                  <button 
                    onClick={() => setShowLimitModal(true)}
                    className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Limit</span>
                  </button>
                </div>

                {walletLimits.length === 0 ? (
                  <div className="text-center py-12">
                    <Shield className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-400">No wallet limits configured</p>
                    <p className="text-gray-500 text-sm">Set limits to control user deposit and withdrawal amounts</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {walletLimits.map((limit) => (
                      <div key={limit.id} className="bg-gaming-dark rounded-lg p-4 border border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-white font-medium">{limit.type.replace('_', ' ').toUpperCase()}</h4>
                          <span className={`px-2 py-1 rounded text-xs ${limit.isActive ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'}`}>
                            {limit.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Limit:</span>
                            <span className="text-white">{formatCurrency(limit.value)}</span>
                          </div>
                          <p className="text-gray-400 text-xs">{limit.description}</p>
                        </div>
                        <div className="mt-3 flex space-x-2">
                          <button className="flex-1 bg-blue-600 text-white px-3 py-1 rounded text-xs hover:opacity-90">
                            <Edit className="h-3 w-3 inline mr-1" />
                            Edit
                          </button>
                          <button className="flex-1 bg-gray-600 text-white px-3 py-1 rounded text-xs hover:opacity-90">
                            <Settings className="h-3 w-3 inline mr-1" />
                            Toggle
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Frozen Wallets Tab */}
            {activeTab === 'frozen' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Frozen Wallets</h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-400">
                    <Lock className="h-4 w-4" />
                    <span>{frozenWallets.length} frozen wallets</span>
                  </div>
                </div>

                {frozenWallets.length === 0 ? (
                  <div className="text-center py-12">
                    <Unlock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-400">No frozen wallets</p>
                    <p className="text-gray-500 text-sm">All user wallets are currently active</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {frozenWallets.map((wallet) => (
                      <div key={wallet.id} className="bg-gaming-dark rounded-lg p-4 border border-red-500/20">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-white font-medium">{wallet.username}</h4>
                          <Lock className="h-4 w-4 text-red-400" />
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Frozen by:</span>
                            <span className="text-white">{wallet.frozenBy}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Frozen at:</span>
                            <span className="text-white">{new Date(wallet.frozenAt).toLocaleDateString()}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Reason:</span>
                            <p className="text-white text-xs mt-1">{wallet.reason}</p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <button 
                            onClick={() => handleUnfreezeWallet(wallet.userId)}
                            className="w-full bg-green-600 text-white px-3 py-1 rounded text-xs hover:opacity-90"
                          >
                            <Unlock className="h-3 w-3 inline mr-1" />
                            Unfreeze Wallet
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Bonus Systems Tab */}
            {activeTab === 'bonuses' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Bonus Systems</h3>
                  <button 
                    onClick={() => setShowBonusModal(true)}
                    className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Bonus</span>
                  </button>
                </div>

                {bonusSystems.length === 0 ? (
                  <div className="text-center py-12">
                    <Gift className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-400">No bonus systems configured</p>
                    <p className="text-gray-500 text-sm">Create bonus systems to reward users</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {bonusSystems.map((bonus) => (
                      <div key={bonus.id} className="bg-gaming-dark rounded-lg p-4 border border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <Gift className="h-4 w-4 text-gaming-gold" />
                            <h4 className="text-white font-medium">{bonus.name}</h4>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs ${bonus.isActive ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'}`}>
                            {bonus.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Type:</span>
                            <span className="text-white capitalize">{bonus.type}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Amount:</span>
                            <span className="text-gaming-gold font-medium">{formatCurrency(bonus.amount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Wagering:</span>
                            <span className="text-white">{bonus.wageringRequirement}x</span>
                          </div>
                          <p className="text-gray-400 text-xs">{bonus.description}</p>
                        </div>
                        <div className="mt-3 flex space-x-2">
                          <button className="flex-1 bg-blue-600 text-white px-3 py-1 rounded text-xs hover:opacity-90">
                            <Edit className="h-3 w-3 inline mr-1" />
                            Edit
                          </button>
                          <button className="flex-1 bg-gray-600 text-white px-3 py-1 rounded text-xs hover:opacity-90">
                            <Settings className="h-3 w-3 inline mr-1" />
                            Toggle
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
