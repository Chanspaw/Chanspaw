import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Filter,
  Download,
  Plus,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  BarChart3,
  Settings,
  RefreshCw,
  Calculator
} from 'lucide-react';
import { ownerProfitAPI, OwnerProfitStats, ProfitStatistics, OwnerWithdrawal } from '../../services/ownerProfitAPI';

export function OwnerProfitManagement() {
  const [activeTab, setActiveTab] = useState('overview');
  const [profitStats, setProfitStats] = useState<OwnerProfitStats | null>(null);
  const [profitStatistics, setProfitStatistics] = useState<ProfitStatistics | null>(null);
  const [withdrawals, setWithdrawals] = useState<OwnerWithdrawal[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [showCalculateModal, setShowCalculateModal] = useState(false);
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: '',
    method: 'bank_transfer',
    accountDetails: '',
    notes: ''
  });
  const [calculateForm, setCalculateForm] = useState({
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    loadData();
  }, [selectedTimeRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profitsResponse, statsResponse, withdrawalsResponse] = await Promise.all([
        ownerProfitAPI.getAvailableProfits(),
        ownerProfitAPI.getProfitStatistics(selectedTimeRange),
        ownerProfitAPI.getWithdrawals()
      ]);

      if (profitsResponse.success) {
        setProfitStats(profitsResponse.data);
      }

      if (statsResponse.success) {
        setProfitStatistics(statsResponse.data);
      }

      if (withdrawalsResponse.success) {
        setWithdrawals(withdrawalsResponse.data.withdrawals);
      }
    } catch (error) {
      console.error('Error loading owner profit data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await ownerProfitAPI.createWithdrawal({
        amount: parseFloat(withdrawalForm.amount),
        method: withdrawalForm.method,
        accountDetails: withdrawalForm.accountDetails ? JSON.parse(withdrawalForm.accountDetails) : undefined,
        notes: withdrawalForm.notes
      });

      if (response.success) {
        setShowWithdrawalModal(false);
        setWithdrawalForm({ amount: '', method: 'bank_transfer', accountDetails: '', notes: '' });
        await loadData();
        alert('Withdrawal request created successfully');
      }
    } catch (error) {
      alert('Error creating withdrawal request: ' + error);
    }
  };

  const handleCalculateProfits = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await ownerProfitAPI.calculateProfits(
        calculateForm.startDate,
        calculateForm.endDate
      );

      if (response.success) {
        setShowCalculateModal(false);
        setCalculateForm({ startDate: '', endDate: '' });
        await loadData();
        alert('Profits calculated and recorded successfully');
      }
    } catch (error) {
      alert('Error calculating profits: ' + error);
    }
  };

  const handleProcessWithdrawal = async (withdrawalId: string, action: 'approve' | 'reject') => {
    try {
      const reason = action === 'reject' ? prompt('Reason for rejection:') : undefined;
      const response = await ownerProfitAPI.processWithdrawal(withdrawalId, action, reason);

      if (response.success) {
        await loadData();
        alert(`Withdrawal ${action}ed successfully`);
      }
    } catch (error) {
      alert(`Error ${action}ing withdrawal: ` + error);
    }
  };

  const handleCompleteWithdrawal = async (withdrawalId: string) => {
    try {
      const response = await ownerProfitAPI.completeWithdrawal(withdrawalId);

      if (response.success) {
        await loadData();
        alert('Withdrawal marked as completed');
      }
    } catch (error) {
      alert('Error completing withdrawal: ' + error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-green-500';
      case 'APPROVED':
        return 'text-blue-500';
      case 'PROCESSING':
        return 'text-yellow-500';
      case 'PENDING':
        return 'text-orange-500';
      case 'REJECTED':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4" />;
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4" />;
      case 'PROCESSING':
        return <Clock className="h-4 w-4" />;
      case 'PENDING':
        return <AlertCircle className="h-4 w-4" />;
      case 'REJECTED':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gaming-darker text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gaming-gold mb-2">
            Owner Profit Management
          </h1>
          <p className="text-gray-400">
            Track platform profits and manage owner withdrawals
          </p>
        </div>

        <div className="flex space-x-1 bg-gaming-card rounded-lg p-1 mb-6">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'withdrawals', label: 'Withdrawals', icon: DollarSign },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp },
            { id: 'calculate', label: 'Calculate Profits', icon: Calculator }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-4 py-2 rounded-md transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-gaming-gold text-gaming-darker'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Profit Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gaming-card rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Profits</p>
                    <p className="text-2xl font-bold text-gaming-gold">
                      ${profitStats?.totalProfits.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-gaming-gold" />
                </div>
              </div>

              <div className="bg-gaming-card rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Withdrawn</p>
                    <p className="text-2xl font-bold text-blue-400">
                      ${profitStats?.totalWithdrawn.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-blue-400" />
                </div>
              </div>

              <div className="bg-gaming-card rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Available for Withdrawal</p>
                    <p className="text-2xl font-bold text-green-400">
                      ${profitStats?.availableProfits.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-400" />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gaming-card rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowWithdrawalModal(true)}
                  className="bg-gaming-gold text-gaming-darker px-4 py-2 rounded-lg hover:bg-yellow-400 transition-colors flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Request Withdrawal
                </button>
                <button
                  onClick={() => setShowCalculateModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  Calculate Profits
                </button>
                <button
                  onClick={loadData}
                  className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Data
                </button>
              </div>
            </div>

            {/* Recent Withdrawals */}
            <div className="bg-gaming-card rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Recent Withdrawals</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4">Amount</th>
                      <th className="text-left py-3 px-4">Method</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Date</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.slice(0, 5).map((withdrawal) => (
                      <tr key={withdrawal.id} className="border-b border-gray-800 hover:bg-gray-800">
                        <td className="py-3 px-4 text-gaming-gold font-semibold">
                          ${withdrawal.amount.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 capitalize">{withdrawal.method.replace('_', ' ')}</td>
                        <td className="py-3 px-4">
                          <span className={`flex items-center ${getStatusColor(withdrawal.status)}`}>
                            {getStatusIcon(withdrawal.status)}
                            <span className="ml-1">{withdrawal.status}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {new Date(withdrawal.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <button className="text-blue-400 hover:text-blue-300">
                              <Eye className="h-4 w-4" />
                            </button>
                            {withdrawal.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => handleProcessWithdrawal(withdrawal.id, 'approve')}
                                  className="text-green-400 hover:text-green-300"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleProcessWithdrawal(withdrawal.id, 'reject')}
                                  className="text-red-400 hover:text-red-300"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              </>
                            )}
                            {withdrawal.status === 'APPROVED' && (
                              <button
                                onClick={() => handleCompleteWithdrawal(withdrawal.id)}
                                className="text-green-400 hover:text-green-300"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                            )}
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

        {activeTab === 'withdrawals' && (
          <div className="bg-gaming-card rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">All Withdrawals</h2>
              <button
                onClick={() => setShowWithdrawalModal(true)}
                className="bg-gaming-gold text-gaming-darker px-4 py-2 rounded-lg hover:bg-yellow-400 transition-colors flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Withdrawal
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4">Amount</th>
                    <th className="text-left py-3 px-4">Method</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Requested</th>
                    <th className="text-left py-3 px-4">Processed</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((withdrawal) => (
                    <tr key={withdrawal.id} className="border-b border-gray-800 hover:bg-gray-800">
                      <td className="py-3 px-4 text-gaming-gold font-semibold">
                        ${withdrawal.amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 capitalize">{withdrawal.method.replace('_', ' ')}</td>
                      <td className="py-3 px-4">
                        <span className={`flex items-center ${getStatusColor(withdrawal.status)}`}>
                          {getStatusIcon(withdrawal.status)}
                          <span className="ml-1">{withdrawal.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {new Date(withdrawal.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        {withdrawal.processedAt 
                          ? new Date(withdrawal.processedAt).toLocaleDateString()
                          : '-'
                        }
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <button className="text-blue-400 hover:text-blue-300">
                            <Eye className="h-4 w-4" />
                          </button>
                          {withdrawal.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleProcessWithdrawal(withdrawal.id, 'approve')}
                                className="text-green-400 hover:text-green-300"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleProcessWithdrawal(withdrawal.id, 'reject')}
                                className="text-red-400 hover:text-red-300"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {withdrawal.status === 'APPROVED' && (
                            <button
                              onClick={() => handleCompleteWithdrawal(withdrawal.id)}
                              className="text-green-400 hover:text-green-300"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-gaming-card rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Profit Analytics</h2>
                <select
                  value={selectedTimeRange}
                  onChange={(e) => setSelectedTimeRange(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                  <option value="all">All Time</option>
                </select>
              </div>

              {profitStatistics && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Total Profits</p>
                        <p className="text-2xl font-bold text-gaming-gold">
                          ${profitStatistics.totalProfits.toFixed(2)}
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-gaming-gold" />
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Total Withdrawals</p>
                        <p className="text-2xl font-bold text-blue-400">
                          ${profitStatistics.totalWithdrawals.toFixed(2)}
                        </p>
                      </div>
                      <TrendingDown className="h-8 w-8 text-blue-400" />
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Net Profit</p>
                        <p className="text-2xl font-bold text-green-400">
                          ${profitStatistics.netProfit.toFixed(2)}
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-400" />
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Active Games</p>
                        <p className="text-2xl font-bold text-purple-400">
                          {Object.keys(profitStatistics.profitByGame).length}
                        </p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-purple-400" />
                    </div>
                  </div>
                </div>
              )}

              {profitStatistics && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4">Profits by Game</h3>
                    <div className="space-y-3">
                      {Object.entries(profitStatistics.profitByGame).map(([game, profit]) => (
                        <div key={game} className="flex items-center justify-between">
                          <span className="text-gray-300 capitalize">{game.replace('-', ' ')}</span>
                          <span className="text-gaming-gold font-semibold">
                            ${profit.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                    <div className="space-y-3">
                      {profitStatistics.withdrawalHistory.slice(0, 5).map((withdrawal) => (
                        <div key={withdrawal.id} className="flex items-center justify-between">
                          <div>
                            <span className="text-gray-300">Withdrawal</span>
                            <p className="text-gray-500 text-sm">
                              {new Date(withdrawal.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <span className="text-gaming-gold font-semibold">
                            ${withdrawal.amount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'calculate' && (
          <div className="bg-gaming-card rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-6">Calculate Platform Profits</h2>
            <p className="text-gray-400 mb-6">
              Calculate and record platform profits from game results for a specific date range.
            </p>

            <form onSubmit={handleCalculateProfits} className="max-w-md space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={calculateForm.startDate}
                  onChange={(e) => setCalculateForm({ ...calculateForm, startDate: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={calculateForm.endDate}
                  onChange={(e) => setCalculateForm({ ...calculateForm, endDate: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gaming-gold text-gaming-darker px-4 py-2 rounded-lg hover:bg-yellow-400 transition-colors"
              >
                Calculate Profits
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Withdrawal Modal */}
      {showWithdrawalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gaming-card rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Request Owner Withdrawal</h3>
            <form onSubmit={handleCreateWithdrawal}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Amount ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={withdrawalForm.amount}
                    onChange={(e) => setWithdrawalForm({ ...withdrawalForm, amount: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Withdrawal Method
                  </label>
                  <select
                    value={withdrawalForm.method}
                    onChange={(e) => setWithdrawalForm({ ...withdrawalForm, method: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="paypal">PayPal</option>
                    <option value="crypto">Cryptocurrency</option>
                    <option value="check">Check</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Account Details (JSON)
                  </label>
                  <textarea
                    value={withdrawalForm.accountDetails}
                    onChange={(e) => setWithdrawalForm({ ...withdrawalForm, accountDetails: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    rows={3}
                    placeholder='{"account": "123456789", "routing": "987654321"}'
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={withdrawalForm.notes}
                    onChange={(e) => setWithdrawalForm({ ...withdrawalForm, notes: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  type="submit"
                  className="bg-gaming-gold text-gaming-darker px-4 py-2 rounded-lg hover:bg-yellow-400 transition-colors"
                >
                  Create Withdrawal
                </button>
                <button
                  type="button"
                  onClick={() => setShowWithdrawalModal(false)}
                  className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Calculate Modal */}
      {showCalculateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gaming-card rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Calculate Platform Profits</h3>
            <form onSubmit={handleCalculateProfits}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={calculateForm.startDate}
                    onChange={(e) => setCalculateForm({ ...calculateForm, startDate: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={calculateForm.endDate}
                    onChange={(e) => setCalculateForm({ ...calculateForm, endDate: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  type="submit"
                  className="bg-gaming-gold text-gaming-darker px-4 py-2 rounded-lg hover:bg-yellow-400 transition-colors"
                >
                  Calculate
                </button>
                <button
                  type="button"
                  onClick={() => setShowCalculateModal(false)}
                  className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 