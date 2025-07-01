import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Download, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle,
  Calendar,
  BarChart3,
  Wallet,
  Clock
} from 'lucide-react';

interface PlatformRevenue {
  totalRevenue: number;
  recentFees: Array<{
    id: string;
    amount: number;
    matchId: string;
    createdAt: string;
    percentage: number;
  }>;
  timeRange: string;
  feeCount: number;
}

interface RevenueStats {
  allTime: number;
  last24h: number;
  last7d: number;
  last30d: number;
  totalTransactions: number;
}

export function PlatformRevenue() {
  const [revenue, setRevenue] = useState<PlatformRevenue | null>(null);
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawReason, setWithdrawReason] = useState('');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [timeRange, setTimeRange] = useState('all');
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [breakdown, setBreakdown] = useState<{ [game: string]: number }>({});
  const [totalCommission, setTotalCommission] = useState(0);

  useEffect(() => {
    loadRevenue();
    loadStats();
    loadWithdrawals();
    loadBreakdown();
  }, [timeRange]);

  const loadRevenue = async () => {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + `/api/admin/platform-revenue?timeRange=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setRevenue(data.data);
      } else {
        setMessage({ type: 'error', text: 'Failed to load platform revenue' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error loading platform revenue' });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/api/admin/platform-revenue/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadWithdrawals = async () => {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/api/admin/platform-revenue/withdrawals', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setWithdrawals(data.data.withdrawals);
      }
    } catch (error) {
      // ignore
    }
  };

  const loadBreakdown = async () => {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/api/admin/platform-revenue/breakdown', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setBreakdown(data.data.breakdown);
        setTotalCommission(data.data.total);
      }
    } catch (error) {
      // ignore
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount' });
      return;
    }

    if (parseFloat(withdrawAmount) > (revenue?.totalRevenue || 0)) {
      setMessage({ type: 'error', text: 'Insufficient platform revenue' });
      return;
    }

    setWithdrawing(true);
    setMessage(null);

    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/api/admin/platform-revenue/withdraw', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: parseFloat(withdrawAmount),
          reason: withdrawReason
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessage({ type: 'success', text: data.message });
        setShowWithdrawModal(false);
        setWithdrawAmount('');
        setWithdrawReason('');
        loadRevenue();
        loadStats();
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.error || 'Failed to withdraw revenue' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error withdrawing revenue' });
    } finally {
      setWithdrawing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Platform Revenue</h1>
            <p className="text-gray-400">Real-time platform fee tracking and management</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Time</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            <button 
              onClick={() => { loadRevenue(); loadStats(); }}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
            <button 
              onClick={() => setShowWithdrawModal(true)}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Withdraw</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Revenue Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-500">
                      {revenue ? formatCurrency(revenue.totalRevenue) : '$0.00'}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500" />
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Last 24h</p>
                    <p className="text-2xl font-bold text-blue-500">
                      {stats ? formatCurrency(stats.last24h) : '$0.00'}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Last 7 Days</p>
                    <p className="text-2xl font-bold text-yellow-500">
                      {stats ? formatCurrency(stats.last7d) : '$0.00'}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-yellow-500" />
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Transactions</p>
                    <p className="text-2xl font-bold text-purple-500">
                      {revenue ? revenue.feeCount : 0}
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-purple-500" />
                </div>
              </div>
            </div>

            {/* Recent Platform Fees */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <div className="p-6 border-b border-gray-700">
                <h2 className="text-lg font-semibold">Recent Platform Fees</h2>
                <p className="text-gray-400">Latest platform fee transactions</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Match ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Fee %</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {revenue?.recentFees.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                          No platform fees found for this time period
                        </td>
                      </tr>
                    ) : (
                      revenue?.recentFees.map((fee) => (
                        <tr key={fee.id} className="hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                            {fee.matchId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-500 font-semibold">
                            {formatCurrency(fee.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                            {fee.percentage}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                            {formatDate(fee.createdAt)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Withdrawal History */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden mt-8">
              <div className="p-6 border-b border-gray-700">
                <h2 className="text-lg font-semibold">Withdrawal History</h2>
                <p className="text-gray-400">Last 50 platform profit withdrawals</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Admin</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {withdrawals.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                          No withdrawals found
                        </td>
                      </tr>
                    ) : (
                      withdrawals.map((w) => {
                        let meta: Record<string, any> = {};
                        try { meta = JSON.parse(w.metadata || '{}'); } catch {}
                        return (
                          <tr key={w.id} className="hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-500 font-semibold">
                              {formatCurrency(w.amount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                              {formatDate(w.createdAt)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {w.user ? w.user.username : (meta['withdrawnBy'] || 'N/A')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                              {meta['reason'] || w.description || '-'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Commission Breakdown */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden mb-8">
              <div className="p-6 border-b border-gray-700">
                <h2 className="text-lg font-semibold">Commission Breakdown by Game</h2>
                <p className="text-gray-400">See how much each game brings to the platform</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Game</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Commission</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {Object.keys(breakdown).length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-6 py-12 text-center text-gray-500">
                          No commission data found
                        </td>
                      </tr>
                    ) : (
                      Object.entries(breakdown).map(([game, amount]) => (
                        <tr key={game} className="hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">{game}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-500 font-semibold">{formatCurrency(amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td className="px-6 py-4 font-bold text-right">Total Commission</td>
                      <td className="px-6 py-4 font-bold text-green-400">{formatCurrency(totalCommission)}</td>
                    </tr>
                  </tfoot>
                </table>
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
          </div>
        )}

        {/* Withdraw Modal */}
        {showWithdrawModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-gray-800 rounded-lg p-8 w-full max-w-md border border-gray-700">
              <h2 className="text-xl font-bold mb-4">Withdraw Platform Revenue</h2>
              
              <div className="mb-4">
                <label className="block text-gray-300 mb-1">Available Revenue</label>
                <p className="text-2xl font-bold text-green-500">
                  {revenue ? formatCurrency(revenue.totalRevenue) : '$0.00'}
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-gray-300 mb-1">Withdrawal Amount ($)</label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full px-4 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none"
                  placeholder="Enter amount"
                  max={revenue?.totalRevenue || 0}
                />
              </div>

              <div className="mb-6">
                <label className="block text-gray-300 mb-1">Reason (Optional)</label>
                <input
                  type="text"
                  value={withdrawReason}
                  onChange={(e) => setWithdrawReason(e.target.value)}
                  className="w-full px-4 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none"
                  placeholder="e.g., Operating expenses"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-700 text-white"
                  disabled={withdrawing}
                >
                  Cancel
                </button>
                <button
                  onClick={handleWithdraw}
                  disabled={withdrawing || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
                  className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white font-bold disabled:opacity-50"
                >
                  {withdrawing ? 'Withdrawing...' : 'Withdraw'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 