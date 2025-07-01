import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Download,
  Search,
  Eye,
  Edit,
  RefreshCw,
  BarChart3,
  FileText,
  CreditCard,
  Banknote,
  Bitcoin,
  Settings
} from 'lucide-react';
import { PaymentAPI } from '../../services/paymentAPI';
import { Transaction, WithdrawalRequest, PaymentStats } from '../../types/payment';
import { useAuth } from '../../contexts/AuthContext';

interface RealTimeStats {
  totalTransactions: number;
  pendingTransactions: number;
  totalVolume: number;
  successRate: number;
  averageProcessingTime: number;
}

export function PaymentManagement() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'withdrawals' | 'settings' | 'reports'>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [realTimeStats, setRealTimeStats] = useState<RealTimeStats | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'24h' | '7d' | '30d' | '90d'>('7d');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Load data on component mount
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load transactions
      const transactionsResponse = await PaymentAPI.getAllTransactions(100);
      if (transactionsResponse.success) {
        setTransactions(transactionsResponse.data || []);
      }

      // Load withdrawals
      const withdrawalsResponse = await PaymentAPI.getPendingWithdrawals();
      if (withdrawalsResponse.success) {
        setWithdrawals(withdrawalsResponse.data || []);
      }

      // Load stats
      const statsResponse = await PaymentAPI.getPaymentStats();
      if (statsResponse.success) {
        setStats(statsResponse.data || null);
      }

      // Load real-time stats
      await loadRealTimeStats();
    } catch (error) {
      console.error('Error loading payment data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRealTimeStats = async () => {
    try {
      // Calculate real-time stats from transactions
      const totalTransactions = transactions.length;
      const pendingTransactions = transactions.filter(t => t.status === 'pending').length;
      const totalVolume = transactions
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const successRate = totalTransactions > 0 ? 
        ((totalTransactions - transactions.filter(t => t.status === 'failed').length) / totalTransactions) * 100 : 0;

      setRealTimeStats({
        totalTransactions,
        pendingTransactions,
        totalVolume,
        successRate,
        averageProcessingTime: 2.5
      });
    } catch (error) {
      console.error('Error loading real-time stats:', error);
    }
  };

  const handleApproveWithdrawal = async (withdrawalId: string) => {
    try {
      const response = await PaymentAPI.approveWithdrawal(withdrawalId, 'admin_1', 'Approved by admin');
      if (response.success) {
        await loadData(); // Reload data
        alert('Withdrawal approved successfully');
      } else {
        alert('Failed to approve withdrawal: ' + response.error);
      }
    } catch (error) {
      alert('Error approving withdrawal');
    }
  };

  const handleRejectWithdrawal = async (withdrawalId: string, reason: string) => {
    try {
      const response = await PaymentAPI.rejectWithdrawal(withdrawalId, 'admin_1', reason);
      if (response.success) {
        await loadData(); // Reload data
        alert('Withdrawal rejected successfully');
      } else {
        alert('Failed to reject withdrawal: ' + response.error);
      }
    } catch (error) {
      alert('Error rejecting withdrawal');
    }
  };

  const handleAdjustBalance = async (userId: string, amount: number, reason: string) => {
    try {
      const response = await PaymentAPI.adjustWalletBalance(userId, amount, reason, 'admin_1');
      if (response.success) {
        await loadData(); // Reload data
        alert('Balance adjusted successfully');
      } else {
        alert('Failed to adjust balance: ' + response.error);
      }
    } catch (error) {
      alert('Error adjusting balance');
    }
  };

  const exportTransactions = async (format: 'csv' | 'json' | 'pdf') => {
    try {
      // In a real app, this would call the API to export data
      const data = format === 'csv' ? 
        'ID,User,Type,Amount,Status,Date\n' + 
        transactions.map(t => `${t.id},${t.username || 'Unknown'},${t.type},${t.amount},${t.status},${t.createdAt}`).join('\n') :
        JSON.stringify(transactions, null, 2);
      
      const blob = new Blob([data], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions_${Date.now()}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Error exporting data');
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = (transaction.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-500 bg-green-500/10';
      case 'pending': return 'text-yellow-500 bg-yellow-500/10';
      case 'failed': return 'text-red-500 bg-red-500/10';
      case 'cancelled': return 'text-gray-500 bg-gray-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit': return <TrendingUp className="h-4 w-4" />;
      case 'withdrawal': return <TrendingDown className="h-4 w-4" />;
      case 'bet': return <Activity className="h-4 w-4" />;
      case 'win': return <CheckCircle className="h-4 w-4" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Paiements & Rapports</h2>
          <p className="text-gray-400">Gestion complète des transactions et rapports financiers</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="bg-gaming-dark border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
          >
            <option value="24h">24 heures</option>
            <option value="7d">7 jours</option>
            <option value="30d">30 jours</option>
            <option value="90d">90 jours</option>
          </select>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center space-x-2 bg-gaming-accent hover:bg-gaming-accent/80 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gaming-dark p-1 rounded-lg">
        {[
          { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
          { id: 'transactions', label: 'Transactions', icon: Activity },
          { id: 'withdrawals', label: 'Retraits', icon: TrendingDown },
          { id: 'settings', label: 'Paramètres', icon: Settings },
          { id: 'reports', label: 'Rapports', icon: FileText }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${
              activeTab === tab.id
                ? 'bg-gaming-accent text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span className="text-sm font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Real-time Stats */}
          {realTimeStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gaming-dark p-6 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Transactions</p>
                    <p className="text-2xl font-bold text-white">{realTimeStats.totalTransactions.toLocaleString()}</p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-500" />
                </div>
              </div>
              
              <div className="bg-gaming-dark p-6 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Pending Transactions</p>
                    <p className="text-2xl font-bold text-white">{realTimeStats.pendingTransactions.toLocaleString()}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-500" />
                </div>
              </div>
              
              <div className="bg-gaming-dark p-6 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Volume</p>
                    <p className="text-2xl font-bold text-white">${realTimeStats.totalVolume.toLocaleString()}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500" />
                </div>
              </div>
              
              <div className="bg-gaming-dark p-6 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Success Rate</p>
                    <p className="text-2xl font-bold text-white">{realTimeStats.successRate.toFixed(1)}%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-500" />
                </div>
              </div>
            </div>
          )}

          {/* Payment Stats */}
          {stats && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gaming-dark p-6 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Statistiques de Paiement</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Dépôts totaux</span>
                    <span className="text-white font-semibold">${stats.totalDeposits?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Retraits totaux</span>
                    <span className="text-white font-semibold">${stats.totalWithdrawals?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Retraits en attente</span>
                    <span className="text-white font-semibold">{stats.pendingWithdrawals?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Utilisateurs totaux</span>
                    <span className="text-white font-semibold">{stats.totalUsers?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Solde moyen</span>
                    <span className="text-green-400 font-semibold">${stats.averageBalance?.toLocaleString() || '0'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gaming-dark p-6 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Méthodes de Paiement</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CreditCard className="h-5 w-5 text-blue-400" />
                      <span className="text-gray-300">Cartes de crédit</span>
                    </div>
                    <span className="text-green-400 text-sm">Actif</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Banknote className="h-5 w-5 text-green-400" />
                      <span className="text-gray-300">Virements bancaires</span>
                    </div>
                    <span className="text-green-400 text-sm">Actif</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Bitcoin className="h-5 w-5 text-orange-400" />
                      <span className="text-gray-300">Cryptomonnaies</span>
                    </div>
                    <span className="text-red-400 text-sm">Inactif</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par utilisateur ou ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gaming-dark border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gaming-accent"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gaming-dark border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="all">Tous les statuts</option>
              <option value="completed">Complété</option>
              <option value="pending">En attente</option>
              <option value="failed">Échoué</option>
              <option value="cancelled">Annulé</option>
            </select>
            <button
              onClick={() => exportTransactions('csv')}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Exporter CSV</span>
            </button>
          </div>

          {/* Transactions Table */}
          <div className="bg-gaming-dark rounded-lg border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Transaction</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Utilisateur</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Montant</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-800/50">
                      <td className="px-6 py-4 whitespace-nowrap text-white font-medium">{transaction.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-300">{transaction.username || 'Unknown'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getTypeIcon(transaction.type)}
                          <span className="text-gray-300 capitalize">{transaction.type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-300">${transaction.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                          {transaction.status === 'completed' ? 'Complété' :
                           transaction.status === 'pending' ? 'En attente' :
                           transaction.status === 'failed' ? 'Échoué' : 'Annulé'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button className="text-blue-400 hover:text-blue-300">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="text-yellow-400 hover:text-yellow-300">
                            <Edit className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawals Tab */}
      {activeTab === 'withdrawals' && (
        <div className="space-y-6">
          <div className="bg-gaming-dark rounded-lg border border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Demandes de Retrait en Attente</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Utilisateur</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Montant</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Méthode</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {withdrawals.map((withdrawal) => (
                    <tr key={withdrawal.id} className="hover:bg-gray-800/50">
                      <td className="px-6 py-4 whitespace-nowrap text-white font-medium">{withdrawal.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-300">{withdrawal.username}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-300">${withdrawal.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-300">{withdrawal.paymentMethod}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                        {new Date(withdrawal.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleApproveWithdrawal(withdrawal.id)}
                            className="flex items-center space-x-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                          >
                            <CheckCircle className="h-3 w-3" />
                            <span>Approuver</span>
                          </button>
                          <button
                            onClick={() => handleRejectWithdrawal(withdrawal.id, 'Rejeté par admin')}
                            className="flex items-center space-x-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                          >
                            <XCircle className="h-3 w-3" />
                            <span>Rejeter</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-gaming-dark p-6 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Paramètres de Paiement</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Montant minimum de dépôt</label>
                <input
                  type="number"
                  defaultValue="10"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm font-medium mb-2">Montant maximum de dépôt</label>
                <input
                  type="number"
                  defaultValue="50000"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Montant minimum de retrait</label>
                <input
                  type="number"
                  defaultValue="25"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Limite quotidienne de retrait</label>
                <input
                  type="number"
                  defaultValue="10000"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
                />
              </div>
            </div>
            <div className="mt-6">
              <button className="bg-gaming-accent hover:bg-gaming-accent/80 text-white px-6 py-2 rounded-lg transition-colors">
                Sauvegarder les paramètres
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gaming-dark p-6 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Générer des Rapports</h3>
              <div className="space-y-4">
                <button
                  onClick={() => exportTransactions('csv')}
                  className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition-colors"
                >
                  <Download className="h-5 w-5" />
                  <span>Exporter Transactions (CSV)</span>
                </button>
                <button
                  onClick={() => exportTransactions('json')}
                  className="w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg transition-colors"
                >
                  <FileText className="h-5 w-5" />
                  <span>Exporter Données (JSON)</span>
                </button>
                <button
                  onClick={() => exportTransactions('pdf')}
                  className="w-full flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg transition-colors"
                >
                  <FileText className="h-5 w-5" />
                  <span>Générer Rapport (PDF)</span>
                </button>
              </div>
            </div>

            <div className="bg-gaming-dark p-6 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Rapports Automatiques</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Rapport quotidien</span>
                  <span className="text-green-400 text-sm">Activé</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Rapport hebdomadaire</span>
                  <span className="text-green-400 text-sm">Activé</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Rapport mensuel</span>
                  <span className="text-green-400 text-sm">Activé</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Alertes de fraude</span>
                  <span className="text-green-400 text-sm">Activé</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
