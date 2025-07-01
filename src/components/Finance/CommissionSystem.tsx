import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Percent, 
  Settings, 
  BarChart3, 
  Users, 
  Activity,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  RefreshCw,
  Eye,
  Download,
  Calendar,
  Target,
  Zap,
  Crown,
  Star
} from 'lucide-react';
import { commissionAPI, CommissionConfig, Transaction, BonusPromotion, LoyaltyTier } from '../../services/commissionAPI';

interface CommissionRule {
  id: string;
  gameType: string;
  houseEdge: number;
  minBet: number;
  maxBet: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CommissionTransaction {
  id: string;
  userId: string;
  gameType: string;
  betAmount: number;
  commissionAmount: number;
  houseEdge: number;
  timestamp: string;
  status: 'pending' | 'processed' | 'paid';
}

interface CommissionStats {
  totalCommission: number;
  totalBets: number;
  averageHouseEdge: number;
  commissionRate: number;
  totalPlayers: number;
  activeGames: number;
}

export function CommissionSystem() {
  const [activeTab, setActiveTab] = useState<'overview' | 'rules' | 'transactions' | 'bonuses' | 'loyalty'>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [commissionRules, setCommissionRules] = useState<CommissionRule[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<CommissionStats | null>(null);
  const [bonuses, setBonuses] = useState<BonusPromotion[]>([]);
  const [loyaltyTiers, setLoyaltyTiers] = useState<LoyaltyTier[]>([]);
  const [editingRule, setEditingRule] = useState<CommissionRule | null>(null);
  const [editingBonus, setEditingBonus] = useState<BonusPromotion | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'24h' | '7d' | '30d' | '90d'>('7d');

  // Initialize with real data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load commission rules from real API
      const rulesResponse = await fetch(import.meta.env.VITE_API_URL + '/api/admin/commission-rules', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (rulesResponse.ok) {
        const rulesData = await rulesResponse.json();
        setCommissionRules(rulesData.data?.rules || rulesData.rules || []);
      } else {
        console.error('Failed to load commission rules:', rulesResponse.status);
        setCommissionRules([]);
      }

      // Load commission transactions from real API
      const transactionsResponse = await fetch(import.meta.env.VITE_API_URL + '/api/admin/commission-transactions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setTransactions(transactionsData.data?.transactions || transactionsData.transactions || []);
      } else {
        console.error('Failed to load commission transactions:', transactionsResponse.status);
        setTransactions([]);
      }

      // Load financial stats from real API
      const statsResponse = await fetch(import.meta.env.VITE_API_URL + '/api/admin/commission-stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.data?.stats || statsData.stats || {
          totalCommission: 0,
          totalBets: 0,
          averageHouseEdge: 0,
          commissionRate: 0,
          totalPlayers: 0,
          activeGames: 0
        });
      } else {
        console.error('Failed to load commission stats:', statsResponse.status);
        setStats({
          totalCommission: 0,
          totalBets: 0,
          averageHouseEdge: 0,
          commissionRate: 0,
          totalPlayers: 0,
          activeGames: 0
        });
      }

      // Load bonuses from real API
      const bonusesResponse = await fetch(import.meta.env.VITE_API_URL + '/api/admin/bonus-promotions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (bonusesResponse.ok) {
        const bonusesData = await bonusesResponse.json();
        setBonuses(bonusesData.data?.bonuses || bonusesData.bonuses || []);
      } else {
        console.error('Failed to load bonuses:', bonusesResponse.status);
        setBonuses([]);
      }

      // Load loyalty tiers from real API
      const loyaltyResponse = await fetch(import.meta.env.VITE_API_URL + '/api/admin/loyalty-tiers', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (loyaltyResponse.ok) {
        const loyaltyData = await loyaltyResponse.json();
        setLoyaltyTiers(loyaltyData.data?.tiers || loyaltyData.tiers || []);
      } else {
        console.error('Failed to load loyalty tiers:', loyaltyResponse.status);
        setLoyaltyTiers([]);
      }

    } catch (error) {
      console.error('Error loading commission data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRule = async (rule: CommissionRule) => {
    try {
      if (editingRule) {
        // Update existing rule
        const gameId = rule.gameType.toLowerCase().replace(/\s+/g, '-');
        await commissionAPI.updateCommissionConfig(gameId, {
          houseEdge: rule.houseEdge,
          minBet: rule.minBet,
          maxBet: rule.maxBet
        });
        
        const updatedRules = commissionRules.map(r => 
          r.id === rule.id ? { ...rule, updatedAt: new Date().toISOString() } : r
        );
        setCommissionRules(updatedRules);
      } else {
        // Add new rule
        const newRule = {
          ...rule,
          id: `rule_${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setCommissionRules([...commissionRules, newRule]);
      }
      setEditingRule(null);
    } catch (error) {
      alert('Error saving commission rule');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (confirm('Are you sure you want to delete this rule?')) {
      setCommissionRules(commissionRules.filter(r => r.id !== ruleId));
    }
  };

  const handleSaveBonus = async (bonus: BonusPromotion) => {
    try {
      if (editingBonus) {
        // Update existing bonus
        const updatedBonuses = bonuses.map(b => 
          b.id === bonus.id ? bonus : b
        );
        setBonuses(updatedBonuses);
      } else {
        // Add new bonus
        const newBonus = {
          ...bonus,
          id: `bonus_${Date.now()}`,
          usageCount: 0,
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000 * 365)
        };
        setBonuses([...bonuses, newBonus]);
      }
      setEditingBonus(null);
    } catch (error) {
      alert('Error saving bonus promotion');
    }
  };

  const handleDeleteBonus = async (bonusId: string) => {
    if (confirm('Are you sure you want to delete this promotion?')) {
      setBonuses(bonuses.filter(b => b.id !== bonusId));
    }
  };

  const calculateCommission = (betAmount: number, houseEdge: number): number => {
    return (betAmount * houseEdge) / 100;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-500 bg-green-500/10';
      case 'pending': return 'text-yellow-500 bg-yellow-500/10';
      case 'failed': return 'text-red-500 bg-red-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getBonusTypeIcon = (type: string) => {
    switch (type) {
      case 'welcome': return <Star className="h-4 w-4" />;
      case 'deposit': return <DollarSign className="h-4 w-4" />;
      case 'loyalty': return <Crown className="h-4 w-4" />;
      case 'referral': return <Users className="h-4 w-4" />;
      case 'tournament': return <Target className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Commission System</h2>
          <p className="text-gray-400">Manage commissions, bonuses and loyalty program</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="bg-gaming-dark border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
          >
            <option value="24h">24 hours</option>
            <option value="7d">7 days</option>
            <option value="30d">30 days</option>
            <option value="90d">90 days</option>
          </select>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center space-x-2 bg-gaming-accent hover:bg-gaming-accent/80 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gaming-dark p-1 rounded-lg">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'rules', label: 'Commission Rules', icon: Settings },
          { id: 'transactions', label: 'Transactions', icon: Activity },
          { id: 'bonuses', label: 'Bonuses & Promotions', icon: Star },
          { id: 'loyalty', label: 'Loyalty Program', icon: Crown }
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
          {/* Commission Stats */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gaming-dark p-6 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Commission</p>
                    <p className="text-2xl font-bold text-white">${stats.totalCommission.toLocaleString()}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500" />
                </div>
              </div>
              
              <div className="bg-gaming-dark p-6 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Bets</p>
                    <p className="text-2xl font-bold text-white">{stats.totalBets.toLocaleString()}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-500" />
                </div>
              </div>
              
              <div className="bg-gaming-dark p-6 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Average House Edge</p>
                    <p className="text-2xl font-bold text-white">{stats.averageHouseEdge}%</p>
                  </div>
                  <Percent className="h-8 w-8 text-yellow-500" />
                </div>
              </div>
              
              <div className="bg-gaming-dark p-6 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Active Players</p>
                    <p className="text-2xl font-bold text-white">{stats.totalPlayers.toLocaleString()}</p>
                  </div>
                  <Users className="h-8 w-8 text-purple-500" />
                </div>
              </div>
            </div>
          )}

          {/* Recent Transactions */}
          <div className="bg-gaming-dark rounded-lg border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Recent Transactions</h3>
            </div>
            <div className="p-6">
              {transactions.slice(0, 5).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between py-3 border-b border-gray-700 last:border-b-0">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gaming-accent rounded-lg flex items-center justify-center">
                      <Activity className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{transaction.gameResult.gameName}</p>
                      <p className="text-gray-400 text-sm">Bet: ${transaction.gameResult.betAmount}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-green-500 font-medium">+${transaction.gameResult.platformCommission}</p>
                    <p className="text-gray-400 text-sm">{new Date(transaction.processedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Commission Rules Tab */}
      {activeTab === 'rules' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">Commission Rules</h3>
            <button
              onClick={() => setEditingRule({} as CommissionRule)}
              className="flex items-center space-x-2 bg-gaming-accent hover:bg-gaming-accent/80 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Rule</span>
            </button>
          </div>

          <div className="bg-gaming-dark rounded-lg border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Game</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">House Edge</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Min Bet</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Max Bet</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {commissionRules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap text-white">{rule.gameType}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-white">{rule.houseEdge}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-white">${rule.minBet}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-white">${rule.maxBet}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          rule.isActive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                        }`}>
                          {rule.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setEditingRule(rule)}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="text-red-400 hover:text-red-300"
                          >
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
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">Commission Transactions</h3>
            <button className="flex items-center space-x-2 bg-gaming-accent hover:bg-gaming-accent/80 text-white px-4 py-2 rounded-lg transition-colors">
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>

          <div className="bg-gaming-dark rounded-lg border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Game</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Bet Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Commission</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">House Edge</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap text-white">{transaction.gameResult.gameName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-white">${transaction.gameResult.betAmount}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-green-500">${transaction.gameResult.platformCommission}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-white">10%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-400">{new Date(transaction.processedAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(transaction.gameResult.status)}`}>
                          {transaction.gameResult.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Bonuses Tab */}
      {activeTab === 'bonuses' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">Bonuses & Promotions</h3>
            <button
              onClick={() => setEditingBonus({} as BonusPromotion)}
              className="flex items-center space-x-2 bg-gaming-accent hover:bg-gaming-accent/80 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Bonus</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bonuses.map((bonus) => (
              <div key={bonus.id} className="bg-gaming-dark p-6 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    {getBonusTypeIcon(bonus.type)}
                    <span className="text-white font-medium">{bonus.name}</span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setEditingBonus(bonus)}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteBonus(bonus.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <p className="text-gray-400 text-sm mb-4">{bonus.description}</p>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Value:</span>
                    <span className="text-white font-medium">
                      {bonus.valueType === 'percentage' ? `${bonus.value}%` : `$${bonus.value}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Usage:</span>
                    <span className="text-white font-medium">{bonus.usageCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Status:</span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      bonus.isActive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                    }`}>
                      {bonus.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loyalty Tab */}
      {activeTab === 'loyalty' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">Loyalty Program</h3>
            <button className="flex items-center space-x-2 bg-gaming-accent hover:bg-gaming-accent/80 text-white px-4 py-2 rounded-lg transition-colors">
              <Plus className="h-4 w-4" />
              <span>Add Tier</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {loyaltyTiers.map((tier) => (
              <div key={tier.id} className="bg-gaming-dark p-6 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: tier.color }}
                    >
                      <Crown className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-white font-medium">{tier.name}</span>
                  </div>
                  <span className="text-gray-400 text-sm">Level {tier.level}</span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Min Games:</span>
                    <span className="text-white font-medium">{tier.minGames}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Min Spent:</span>
                    <span className="text-white font-medium">${tier.minSpent}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Commission Discount:</span>
                    <span className="text-white font-medium">{tier.commissionDiscount}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Bonus Multiplier:</span>
                    <span className="text-white font-medium">{tier.bonusMultiplier}x</span>
                  </div>
                </div>
                
                <div className="mt-4">
                  <p className="text-gray-400 text-sm mb-2">Benefits:</p>
                  <ul className="space-y-1">
                    {tier.benefits.map((benefit, index) => (
                      <li key={index} className="text-white text-sm flex items-center space-x-2">
                        <div className="w-1 h-1 bg-gaming-accent rounded-full"></div>
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 