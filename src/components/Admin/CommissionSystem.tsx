import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Calendar,
  Filter,
  Download,
  Plus,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { commissionAPI } from '../../services/commissionAPI';

interface CommissionRule {
  id: string;
  gameType: string;
  gameName: string;
  houseEdge: number;
  winnerPercentage: number;
  minBet: number;
  maxBet: number;
  isActive: boolean;
}

interface CommissionEarning {
  id: string;
  userId: string;
  username: string;
  amount: number;
  gameType: string;
  createdAt: string;
  status: 'pending' | 'paid' | 'cancelled';
}

interface CommissionPayout {
  id: string;
  userId: string;
  username: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: string;
  processedAt?: string;
}

export function CommissionSystem() {
  const [activeTab, setActiveTab] = useState('rules');
  const [commissionRules, setCommissionRules] = useState<CommissionRule[]>([]);
  const [earnings, setEarnings] = useState<CommissionEarning[]>([]);
  const [payouts, setPayouts] = useState<CommissionPayout[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRule, setSelectedRule] = useState<CommissionRule | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadCommissionData();
  }, [activeTab]);

  const loadCommissionData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'rules') {
        // Fetch commission configs for all games (replace with your actual game IDs)
        const gameIds = ['connect_four', 'tic_tac_toe', 'dice_battle', 'diamond_hunt'];
        const rules = await Promise.all(gameIds.map(async (id) => {
          try {
            const config = await commissionAPI.getCommissionConfig(id);
            return {
              id,
              gameType: id,
              gameName: config.gameName,
              houseEdge: config.houseEdge,
              winnerPercentage: config.winnerPercentage,
              minBet: config.minBet,
              maxBet: config.maxBet,
              isActive: true
            } as CommissionRule;
          } catch {
            return null;
          }
        }));
        setCommissionRules(rules.filter((r): r is CommissionRule => r !== null));
      } else if (activeTab === 'earnings') {
        // Fetch commission earnings (use getTransactionHistory)
        const transactions = await commissionAPI.getTransactionHistory();
        setEarnings(transactions.map(tx => ({
          id: tx.id,
          userId: tx.gameResult.player1, // or winner
          username: tx.gameResult.winner,
          amount: tx.gameResult.platformCommission,
          gameType: tx.gameResult.gameName,
          createdAt: typeof tx.gameResult.timestamp === 'string' ? tx.gameResult.timestamp : tx.gameResult.timestamp.toISOString(),
          status: tx.gameResult.status as 'pending' | 'paid' | 'cancelled',
        })));
      } else if (activeTab === 'payouts') {
        // No payouts API implemented; show message
        setPayouts([]);
      } else if (activeTab === 'analytics') {
        // Fetch analytics
        const stats = await commissionAPI.getFinancialStats();
        setAnalytics(stats);
      }
    } catch (error) {
      setCommissionRules([]);
      setEarnings([]);
      setPayouts([]);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  const handleEditRule = (rule: CommissionRule) => {
    setSelectedRule(rule);
    setShowEditModal(true);
  };

  const handleSaveRule = (updatedRule: CommissionRule) => {
    setCommissionRules(prev => 
      prev.map(rule => rule.id === updatedRule.id ? updatedRule : rule)
    );
    setShowEditModal(false);
    setSelectedRule(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'paid':
        return 'text-green-500';
      case 'processing':
      case 'pending':
        return 'text-yellow-500';
      case 'failed':
      case 'cancelled':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'paid':
        return <CheckCircle className="h-4 w-4" />;
      case 'processing':
      case 'pending':
        return <AlertCircle className="h-4 w-4" />;
      case 'failed':
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gaming-darker text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gaming-gold mb-2">
            Commission Management
          </h1>
          <p className="text-gray-400">
            Manage commission rules, track earnings, and process payouts
          </p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gaming-card rounded-lg p-1 mb-6">
          {[
            { id: 'rules', label: 'Commission Rules', icon: Settings },
            { id: 'earnings', label: 'Earnings Tracking', icon: DollarSign },
            { id: 'payouts', label: 'Payouts', icon: TrendingUp },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp }
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

        {/* Commission Rules Tab */}
        {activeTab === 'rules' && (
          <div className="bg-gaming-card rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Commission Rules</h2>
              <button className="bg-gaming-gold text-gaming-darker px-4 py-2 rounded-lg hover:bg-yellow-400 transition-colors flex items-center">
                <Plus className="h-4 w-4 mr-2" />
                Add Rule
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4">Game</th>
                    <th className="text-left py-3 px-4">House Edge</th>
                    <th className="text-left py-3 px-4">Winner %</th>
                    <th className="text-left py-3 px-4">Min Bet</th>
                    <th className="text-left py-3 px-4">Max Bet</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {commissionRules.map((rule) => (
                    <tr key={rule.id} className="border-b border-gray-800 hover:bg-gray-800">
                      <td className="py-3 px-4">{rule.gameName}</td>
                      <td className="py-3 px-4">{rule.houseEdge}%</td>
                      <td className="py-3 px-4">{rule.winnerPercentage}%</td>
                      <td className="py-3 px-4">${rule.minBet}</td>
                      <td className="py-3 px-4">${rule.maxBet}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          rule.isActive 
                            ? 'bg-green-900 text-green-300' 
                            : 'bg-red-900 text-red-300'
                        }`}>
                          {rule.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditRule(rule)}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button className="text-red-400 hover:text-red-300">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Earnings Tracking Tab */}
        {activeTab === 'earnings' && (
          <div className="bg-gaming-card rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Commission Earnings</h2>
              <div className="flex space-x-2">
                <button className="bg-gray-700 text-white px-3 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </button>
                <button className="bg-gray-700 text-white px-3 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4">User</th>
                    <th className="text-left py-3 px-4">Game</th>
                    <th className="text-left py-3 px-4">Amount</th>
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {earnings.map((earning) => (
                    <tr key={earning.id} className="border-b border-gray-800 hover:bg-gray-800">
                      <td className="py-3 px-4">{earning.username}</td>
                      <td className="py-3 px-4">{earning.gameType}</td>
                      <td className="py-3 px-4 text-gaming-gold font-semibold">
                        ${earning.amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        {new Date(earning.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`flex items-center ${getStatusColor(earning.status)}`}>
                          {getStatusIcon(earning.status)}
                          <span className="ml-1 capitalize">{earning.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button className="text-blue-400 hover:text-blue-300">
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payouts Tab */}
        {activeTab === 'payouts' && (
          <div className="bg-gaming-card rounded-lg p-6">
            <div className="flex flex-col items-center justify-center min-h-[200px]">
              <h2 className="text-xl font-semibold mb-2">Commission Payouts</h2>
              <p className="text-gray-400">Commission payouts are managed via the payment system. There is no direct commission payout API.</p>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="bg-gaming-card rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-6">Commission Analytics</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Earnings</p>
                    <p className="text-2xl font-bold text-gaming-gold">$12,450.75</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-gaming-gold" />
                </div>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Active Users</p>
                    <p className="text-2xl font-bold text-blue-400">1,234</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-400" />
                </div>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">This Month</p>
                    <p className="text-2xl font-bold text-green-400">$2,150.30</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-400" />
                </div>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Pending Payouts</p>
                    <p className="text-2xl font-bold text-yellow-400">$850.25</p>
                  </div>
                  <Calendar className="h-8 w-8 text-yellow-400" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Top Earning Games</h3>
                <div className="space-y-3">
                  {[
                    { game: 'Diamond Hunt', earnings: 4500.25, percentage: 36.1 },
                    { game: 'Tic Tac Toe', earnings: 3200.50, percentage: 25.7 },
                    { game: 'Connect Four', earnings: 2800.00, percentage: 22.5 },
                    { game: 'Dice Battle', earnings: 1950.00, percentage: 15.7 }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-gray-300">{item.game}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-gaming-gold font-semibold">
                          ${item.earnings.toFixed(2)}
                        </span>
                        <span className="text-gray-500 text-sm">
                          ({item.percentage}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {[
                    { action: 'Payout processed', amount: 150.00, time: '2 hours ago' },
                    { action: 'New commission earned', amount: 25.50, time: '4 hours ago' },
                    { action: 'Payout requested', amount: 75.25, time: '6 hours ago' },
                    { action: 'Commission rule updated', amount: 0, time: '1 day ago' }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <span className="text-gray-300">{item.action}</span>
                        <p className="text-gray-500 text-sm">{item.time}</p>
                      </div>
                      {item.amount > 0 && (
                        <span className="text-gaming-gold font-semibold">
                          ${item.amount.toFixed(2)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Rule Modal */}
      {showEditModal && selectedRule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gaming-card rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Edit Commission Rule</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleSaveRule(selectedRule);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Game Name
                  </label>
                  <input
                    type="text"
                    value={selectedRule.gameName}
                    onChange={(e) => setSelectedRule({
                      ...selectedRule,
                      gameName: e.target.value
                    })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      House Edge (%)
                    </label>
                    <input
                      type="number"
                      value={selectedRule.houseEdge}
                      onChange={(e) => setSelectedRule({
                        ...selectedRule,
                        houseEdge: parseFloat(e.target.value)
                      })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Winner % (%)
                    </label>
                    <input
                      type="number"
                      value={selectedRule.winnerPercentage}
                      onChange={(e) => setSelectedRule({
                        ...selectedRule,
                        winnerPercentage: parseFloat(e.target.value)
                      })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Min Bet ($)
                    </label>
                    <input
                      type="number"
                      value={selectedRule.minBet}
                      onChange={(e) => setSelectedRule({
                        ...selectedRule,
                        minBet: parseFloat(e.target.value)
                      })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Max Bet ($)
                    </label>
                    <input
                      type="number"
                      value={selectedRule.maxBet}
                      onChange={(e) => setSelectedRule({
                        ...selectedRule,
                        maxBet: parseFloat(e.target.value)
                      })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedRule.isActive}
                    onChange={(e) => setSelectedRule({
                      ...selectedRule,
                      isActive: e.target.checked
                    })}
                    className="mr-2"
                  />
                  <label className="text-sm text-gray-300">Active</label>
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  type="submit"
                  className="bg-gaming-gold text-gaming-darker px-4 py-2 rounded-lg hover:bg-yellow-400 transition-colors"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
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