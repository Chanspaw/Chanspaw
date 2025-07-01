import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Activity, 
  AlertTriangle, 
  BarChart3, 
  PieChart, 
  Calendar,
  Eye,
  Shield,
  Target,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  RefreshCw,
  Filter,
  Settings
} from 'lucide-react';
import { PaymentAPI } from '../../services/paymentAPI';

interface FinancialData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  commissionEarned: number;
  activeUsers: number;
  totalGames: number;
  winRate: number;
  averageBet: number;
}

interface GameAnalytics {
  gameType: string;
  totalGames: number;
  totalBets: number;
  totalWinnings: number;
  houseEdge: number;
  popularity: number;
}

interface UserAnalytics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  premiumUsers: number;
  averageSessionTime: number;
  retentionRate: number;
}

interface SuspiciousActivity {
  id: string;
  type: 'unusual_betting' | 'multiple_accounts' | 'winning_streak' | 'large_withdrawal';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  userId: string;
  timestamp: string;
  status: 'pending' | 'investigating' | 'resolved' | 'false_positive';
}

interface ComplianceReport {
  id: string;
  type: 'kyc_verification' | 'age_verification' | 'responsible_gaming' | 'anti_money_laundering';
  status: 'compliant' | 'non_compliant' | 'pending';
  description: string;
  lastUpdated: string;
  nextReview: string;
}

export function AnalyticsReports() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'games' | 'revenue' | 'performance'>('overview');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Remove all hardcoded analytics data - load from API only
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics | null>(null);
  const [gameAnalytics, setGameAnalytics] = useState<GameAnalytics | null>(null);
  const [revenueAnalytics, setRevenueAnalytics] = useState<RevenueAnalytics | null>(null);
  const [performanceAnalytics, setPerformanceAnalytics] = useState<PerformanceAnalytics | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Load overview analytics
      const overviewResponse = await fetch(import.meta.env.VITE_API_URL + `/api/analytics/overview?range=${dateRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (overviewResponse.ok) {
        const overviewData = await overviewResponse.json();
        setAnalyticsData(overviewData.data || null);
      } else {
        setAnalyticsData(null);
      }

      // Load user analytics
      const userResponse = await fetch(import.meta.env.VITE_API_URL + `/api/analytics/users?range=${dateRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUserAnalytics(userData.data || null);
      } else {
        setUserAnalytics(null);
      }

      // Load game analytics
      const gameResponse = await fetch(import.meta.env.VITE_API_URL + `/api/analytics/games?range=${dateRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (gameResponse.ok) {
        const gameData = await gameResponse.json();
        setGameAnalytics(gameData.data || null);
      } else {
        setGameAnalytics(null);
      }

      // Load revenue analytics
      const revenueResponse = await fetch(import.meta.env.VITE_API_URL + `/api/analytics/revenue?range=${dateRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (revenueResponse.ok) {
        const revenueData = await revenueResponse.json();
        setRevenueAnalytics(revenueData.data || null);
      } else {
        setRevenueAnalytics(null);
      }

      // Load performance analytics
      const performanceResponse = await fetch(import.meta.env.VITE_API_URL + `/api/analytics/performance?range=${dateRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (performanceResponse.ok) {
        const performanceData = await performanceResponse.json();
        setPerformanceAnalytics(performanceData.data || null);
      } else {
        setPerformanceAnalytics(null);
      }

    } catch (error) {
      console.error('Error loading analytics:', error);
      setAnalyticsData(null);
      setUserAnalytics(null);
      setGameAnalytics(null);
      setRevenueAnalytics(null);
      setPerformanceAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (type: string) => {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + `/api/analytics/export?type=${type}&range=${dateRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_analytics_${dateRange}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setMessage({ type: 'success', text: `${type} report exported successfully` });
      } else {
        setMessage({ type: 'error', text: 'Failed to export report' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error exporting report' });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-yellow-500 bg-yellow-500/10';
      case 'medium': return 'text-orange-500 bg-orange-500/10';
      case 'high': return 'text-red-500 bg-red-500/10';
      case 'critical': return 'text-red-600 bg-red-600/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'text-green-500 bg-green-500/10';
      case 'non_compliant': return 'text-red-500 bg-red-500/10';
      case 'pending': return 'text-yellow-500 bg-yellow-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getActivityTypeIcon = (type: string) => {
    switch (type) {
      case 'unusual_betting': return <Target className="h-4 w-4" />;
      case 'multiple_accounts': return <Users className="h-4 w-4" />;
      case 'winning_streak': return <TrendingUp className="h-4 w-4" />;
      case 'large_withdrawal': return <DollarSign className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Rapports et Analytics</h2>
          <p className="text-gray-400">Dashboard complet pour surveiller les performances et la conformité</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="bg-gaming-dark border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
          >
            <option value="7d">7 jours</option>
            <option value="30d">30 jours</option>
            <option value="90d">90 jours</option>
            <option value="1y">1 an</option>
          </select>
          <button
            onClick={() => loadAnalytics()}
            disabled={loading}
            className="flex items-center space-x-2 bg-gaming-accent hover:bg-gaming-accent/80 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
          <button
            onClick={() => exportReport('overview')}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Exporter</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gaming-dark p-1 rounded-lg">
        {[
          { id: 'overview', label: 'Overview', icon: DollarSign },
          { id: 'users', label: 'Users', icon: Users },
          { id: 'games', label: 'Games', icon: BarChart3 },
          { id: 'revenue', label: 'Revenue', icon: DollarSign },
          { id: 'performance', label: 'Performance', icon: Activity }
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

      {/* Financial Dashboard */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gaming-dark p-6 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Revenus Totaux</p>
                  <p className="text-2xl font-bold text-white">${analyticsData?.totalRevenue.toLocaleString() || 'Loading...'}</p>
                  <p className="text-green-400 text-sm flex items-center mt-1">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +12.5%
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-400" />
              </div>
            </div>

            <div className="bg-gaming-dark p-6 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Profit Net</p>
                  <p className="text-2xl font-bold text-white">${analyticsData?.netProfit.toLocaleString() || 'Loading...'}</p>
                  <p className="text-green-400 text-sm flex items-center mt-1">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +8.3%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-400" />
              </div>
            </div>

            <div className="bg-gaming-dark p-6 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Commission</p>
                  <p className="text-2xl font-bold text-white">${analyticsData?.commissionEarned.toLocaleString() || 'Loading...'}</p>
                  <p className="text-green-400 text-sm flex items-center mt-1">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +15.2%
                  </p>
                </div>
                <Activity className="h-8 w-8 text-purple-400" />
              </div>
            </div>

            <div className="bg-gaming-dark p-6 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Utilisateurs Actifs</p>
                  <p className="text-2xl font-bold text-white">{analyticsData?.activeUsers.toLocaleString() || 'Loading...'}</p>
                  <p className="text-green-400 text-sm flex items-center mt-1">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +5.7%
                  </p>
                </div>
                <Users className="h-8 w-8 text-orange-400" />
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gaming-dark p-6 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Revenus par Période</h3>
              <div className="h-64 bg-gray-800 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-400">Graphique des revenus</p>
                  <p className="text-sm text-gray-500">Intégration Chart.js</p>
                </div>
              </div>
            </div>

            <div className="bg-gaming-dark p-6 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Répartition des Jeux</h3>
              <div className="h-64 bg-gray-800 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <PieChart className="h-12 w-12 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-400">Graphique circulaire</p>
                  <p className="text-sm text-gray-500">Intégration Chart.js</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Game Analytics */}
      {activeTab === 'games' && (
        <div className="space-y-6">
          {/* User Analytics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gaming-dark p-6 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Utilisateurs</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total</span>
                  <span className="text-white font-semibold">{userAnalytics?.totalUsers.toLocaleString() || 'Loading...'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Actifs</span>
                  <span className="text-green-400 font-semibold">{userAnalytics?.activeUsers.toLocaleString() || 'Loading...'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Nouveaux</span>
                  <span className="text-blue-400 font-semibold">{userAnalytics?.newUsers || 'Loading...'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Premium</span>
                  <span className="text-purple-400 font-semibold">{userAnalytics?.premiumUsers || 'Loading...'}</span>
                </div>
              </div>
            </div>

            <div className="bg-gaming-dark p-6 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Engagement</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Temps de Session</span>
                  <span className="text-white font-semibold">{userAnalytics?.averageSessionTime.toFixed(2) || 'Loading...'} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Taux de Rétention</span>
                  <span className="text-green-400 font-semibold">{(userAnalytics?.retentionRate * 100).toFixed(1) || 'Loading...'}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Mise Moyenne</span>
                  <span className="text-yellow-400 font-semibold">${analyticsData?.averageBet.toFixed(2) || 'Loading...'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Taux de Gain</span>
                  <span className="text-blue-400 font-semibold">{analyticsData?.winRate.toFixed(1) || 'Loading...'}%</span>
                </div>
              </div>
            </div>

            <div className="bg-gaming-dark p-6 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Performance</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Jeux</span>
                  <span className="text-white font-semibold">{analyticsData?.totalGames.toLocaleString() || 'Loading...'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Jeux/jour</span>
                  <span className="text-green-400 font-semibold">{(analyticsData?.totalGames / 7).toFixed(0) || 'Loading...'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Utilisateurs/jour</span>
                  <span className="text-blue-400 font-semibold">{(userAnalytics?.activeUsers / 7).toFixed(0) || 'Loading...'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Croissance</span>
                  <span className="text-purple-400 font-semibold">+12.5%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Game Performance Table */}
          <div className="bg-gaming-dark rounded-lg border border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Performance par Jeu</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Jeu</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Total Jeux</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Total Paris</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Gains</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">House Edge</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Popularité</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {gameAnalytics?.map((game, index) => (
                    <tr key={index} className="hover:bg-gray-800/50">
                      <td className="px-6 py-4 whitespace-nowrap text-white font-medium">{game.gameType}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-300">{game.totalGames.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-300">${game.totalBets.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-300">${game.totalWinnings.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-300">{(game.houseEdge * 100).toFixed(1)}%</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-700 rounded-full h-2 mr-2">
                            <div 
                              className="bg-gaming-accent h-2 rounded-full" 
                              style={{ width: `${game.popularity * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-gray-300 text-sm">{(game.popularity * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  )) || 'Loading...'}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Compliance Reports */}
      {activeTab === 'revenue' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {analyticsData?.complianceReports.map((report) => (
              <div key={report.id} className="bg-gaming-dark p-6 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white capitalize">
                    {report.type.replace('_', ' ')}
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                    {report.status === 'compliant' ? 'Conforme' : 
                     report.status === 'non_compliant' ? 'Non Conforme' : 'En Attente'}
                  </span>
                </div>
                <p className="text-gray-300 mb-4">{report.description}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Dernière mise à jour:</span>
                    <span className="text-white">{new Date(report.lastUpdated).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Prochaine révision:</span>
                    <span className="text-white">{new Date(report.nextReview).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="mt-4 flex space-x-2">
                  <button className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm transition-colors">
                    <Eye className="h-4 w-4" />
                    <span>Voir Détails</span>
                  </button>
                  <button className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm transition-colors">
                    <Download className="h-4 w-4" />
                    <span>Exporter</span>
                  </button>
                </div>
              </div>
            )) || 'Loading...'}
          </div>

          {/* Compliance Summary */}
          <div className="bg-gaming-dark p-6 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Résumé de Conformité</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">98%</div>
                <div className="text-gray-400 text-sm">KYC Complète</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">100%</div>
                <div className="text-gray-400 text-sm">Vérification Âge</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">95%</div>
                <div className="text-gray-400 text-sm">Jeu Responsable</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">3</div>
                <div className="text-gray-400 text-sm">Alertes AML</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Suspicious Activity Alerts */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Alertes d'Activité Suspecte</h3>
            <div className="flex items-center space-x-2">
              <select className="bg-gaming-dark border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">
                <option value="all">Toutes les sévérités</option>
                <option value="critical">Critique</option>
                <option value="high">Élevée</option>
                <option value="medium">Moyenne</option>
                <option value="low">Faible</option>
              </select>
              <button className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                <AlertTriangle className="h-4 w-4" />
                <span>Nouvelles Alertes: {analyticsData?.suspiciousActivities.filter(a => a.status === 'pending').length || 'Loading...'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {analyticsData?.suspiciousActivities.map((activity) => (
              <div key={activity.id} className="bg-gaming-dark p-6 rounded-lg border border-gray-700">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className={`p-2 rounded-lg ${getSeverityColor(activity.severity)}`}>
                      {getActivityTypeIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-white font-semibold capitalize">
                          {activity.type.replace('_', ' ')}
                        </h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(activity.severity)}`}>
                          {activity.severity === 'critical' ? 'Critique' :
                           activity.severity === 'high' ? 'Élevée' :
                           activity.severity === 'medium' ? 'Moyenne' : 'Faible'}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          activity.status === 'resolved' ? 'text-green-500 bg-green-500/10' :
                          activity.status === 'investigating' ? 'text-yellow-500 bg-yellow-500/10' :
                          'text-red-500 bg-red-500/10'
                        }`}>
                          {activity.status === 'resolved' ? 'Résolu' :
                           activity.status === 'investigating' ? 'En Investigation' :
                           activity.status === 'false_positive' ? 'Faux Positif' : 'En Attente'}
                        </span>
                      </div>
                      <p className="text-gray-300 mb-2">{activity.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <span>Utilisateur: {activity.userId}</span>
                        <span>•</span>
                        <span>{new Date(activity.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm transition-colors">
                      <Eye className="h-4 w-4" />
                      <span>Investiger</span>
                    </button>
                    <button className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm transition-colors">
                      <CheckCircle className="h-4 w-4" />
                      <span>Résoudre</span>
                    </button>
                    <button className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm transition-colors">
                      <XCircle className="h-4 w-4" />
                      <span>Faux Positif</span>
                    </button>
                  </div>
                </div>
              </div>
            )) || 'Loading...'}
          </div>

          {/* Alert Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gaming-dark p-6 rounded-lg border border-gray-700 text-center">
              <div className="text-2xl font-bold text-red-400">{analyticsData?.suspiciousActivities.filter(a => a.severity === 'critical').length || 'Loading...'}</div>
              <div className="text-gray-400 text-sm">Alertes Critiques</div>
            </div>
            <div className="bg-gaming-dark p-6 rounded-lg border border-gray-700 text-center">
              <div className="text-2xl font-bold text-orange-400">{analyticsData?.suspiciousActivities.filter(a => a.severity === 'high').length || 'Loading...'}</div>
              <div className="text-gray-400 text-sm">Alertes Élevées</div>
            </div>
            <div className="bg-gaming-dark p-6 rounded-lg border border-gray-700 text-center">
              <div className="text-2xl font-bold text-yellow-400">{analyticsData?.suspiciousActivities.filter(a => a.status === 'pending').length || 'Loading...'}</div>
              <div className="text-gray-400 text-sm">En Attente</div>
            </div>
            <div className="bg-gaming-dark p-6 rounded-lg border border-gray-700 text-center">
              <div className="text-2xl font-bold text-green-400">{analyticsData?.suspiciousActivities.filter(a => a.status === 'resolved').length || 'Loading...'}</div>
              <div className="text-gray-400 text-sm">Résolues</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
