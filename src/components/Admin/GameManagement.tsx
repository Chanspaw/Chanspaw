import React, { useState, useEffect } from 'react';
import { useGame } from '../../contexts/GameContext';
import { useAuth } from '../../contexts/AuthContext';
import { Game, GameRule } from '../../types';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Save,
  X,
  Gamepad2,
  Zap,
  Dice6,
  Grid3X3,
  Settings,
  Clock,
  Users,
  Play,
  History,
  BarChart3,
  Target,
  Shield,
  Crown,
  AlertTriangle,
  CheckCircle,
  Calendar,
  DollarSign,
  Timer,
  Grid,
  UserCheck,
  Eye as EyeIcon,
  Video,
  FileText,
  Filter,
  Search,
  Download,
  RefreshCw
} from 'lucide-react';

interface LiveGame {
  id: string;
  gameId: string;
  gameName: string;
  player1: string;
  player2: string;
  status: 'waiting' | 'playing' | 'finished';
  bet: number;
  startTime: string;
  duration: string;
  spectators: number;
}

interface FinishedMatch {
  id: string;
  gameId: string;
  gameName: string;
  player1: string;
  player2: string;
  winner: string;
  bet: number;
  startTime: string;
  endTime: string;
  duration: string;
  replayAvailable: boolean;
}

interface MatchmakingRule {
  id: string;
  gameId: string;
  name: string;
  type: 'skill_based' | 'random' | 'tournament';
  minPlayers: number;
  maxPlayers: number;
  skillRange: number;
  isActive: boolean;
}

interface GameLog {
  id: string;
  gameId: string;
  gameName: string;
  matchId: string;
  player1: string;
  player2: string;
  winner: string;
  moves: GameMove[];
  startTime: string;
  endTime: string;
  duration: number;
  bet: number;
  suspiciousActivity: boolean;
  flags: string[];
}

interface GameMove {
  id: string;
  player: string;
  move: any;
  timestamp: string;
  position: { x: number; y: number };
  timeSpent: number;
}

interface UserMatchHistory {
  userId: string;
  username: string;
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  averageBet: number;
  totalWinnings: number;
  suspiciousActivity: boolean;
  lastPlayed: string;
  matches: GameLog[];
}

interface AntiCheatFlag {
  id: string;
  userId: string;
  username: string;
  gameId: string;
  matchId: string;
  flagType: 'suspicious_timing' | 'impossible_moves' | 'pattern_detection' | 'multiple_accounts' | 'bot_behavior';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: string;
  resolved: boolean;
  adminNotes?: string;
}

export function GameManagement() {
  const { user } = useAuth();
  const { games, updateGame, loadGamesFromAPI } = useGame();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAddGameModal, setShowAddGameModal] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showGameRules, setShowGameRules] = useState(false);
  const [showLiveGames, setShowLiveGames] = useState(false);
  const [showFinishedMatches, setShowFinishedMatches] = useState(false);
  const [showMatchmakingRules, setShowMatchmakingRules] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [activeTab, setActiveTab] = useState<'games' | 'live' | 'history' | 'matchmaking' | 'logs' | 'users' | 'anticheat' | 'services'>('games');
  
  // Add local state for games
  const [adminGames, setAdminGames] = useState<Game[]>([]);
  
  const [gameForm, setGameForm] = useState({
    name: '',
    description: '',
    icon: 'Gamepad2',
    minBet: 0,
    maxBet: 0,
    players: 2,
    isActive: true,
    rules: [] as GameRule[]
  });

  const [liveGames, setLiveGames] = useState<LiveGame[]>([]);
  const [finishedMatches, setFinishedMatches] = useState<FinishedMatch[]>([]);
  const [matchmakingRules, setMatchmakingRules] = useState<MatchmakingRule[]>([]);
  const [gameLogs, setGameLogs] = useState<GameLog[]>([]);
  const [userMatchHistory, setUserMatchHistory] = useState<UserMatchHistory[]>([]);
  const [antiCheatFlags, setAntiCheatFlags] = useState<AntiCheatFlag[]>([]);
  const [selectedLog, setSelectedLog] = useState<GameLog | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserMatchHistory | null>(null);
  const [showLogDetails, setShowLogDetails] = useState(false);
  const [showUserHistory, setShowUserHistory] = useState(false);
  const [showAntiCheatDetails, setShowAntiCheatDetails] = useState(false);
  const [logFilter, setLogFilter] = useState<'all' | 'suspicious' | 'normal'>('all');
  const [userFilter, setUserFilter] = useState<'all' | 'suspicious' | 'normal'>('all');
  const [flagFilter, setFlagFilter] = useState<'all' | 'unresolved' | 'resolved'>('all');
  const [isSaving, setIsSaving] = useState(false);

  // Remove hardcoded default rules - load from API only
  const [newGame, setNewGame] = useState<Partial<Game>>({});
  const [newRule, setNewRule] = useState<Partial<GameRule>>({});
  
  // Service management states
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [showServiceStats, setShowServiceStats] = useState(false);
  const [showServiceConfig, setShowServiceConfig] = useState(false);
  const [serviceStats, setServiceStats] = useState<any>(null);
  const [serviceConfig, setServiceConfig] = useState<any>(null);

  useEffect(() => {
    loadGameManagementData();
  }, []);

  const loadGameManagementData = async () => {
    try {
      setLoading(true);
      // Load all games from API (including inactive ones)
      try {
        const gamesResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/games`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
            'Content-Type': 'application/json'
          }
        });

        if (gamesResponse.ok) {
          const gamesData = await gamesResponse.json();
          if (gamesData.data?.games) {
            // Convert database games to frontend format
            const convertedGames = gamesData.data.games.map((dbGame: any) => ({
              id: dbGame.id,
              name: dbGame.name,
              description: dbGame.description,
              icon: dbGame.icon,
              color: getGameColor(dbGame.id),
              bgGradient: getGameGradient(dbGame.id),
              minBet: dbGame.minBet,
              maxBet: dbGame.maxBet,
              players: dbGame.players,
              duration: dbGame.duration || '5-15 min',
              difficulty: dbGame.difficulty || 'Medium',
              gameId: dbGame.id,
              features: dbGame.features || [],
              rewards: dbGame.rewards || 'Winner takes 90% of pot',
              isActive: dbGame.isActive,
              rules: dbGame.rules || []
            }));
            setAdminGames(convertedGames);
          }
        } else {
          console.error('Failed to load games from API');
          setMessage({ type: 'error', text: 'Failed to load games' });
        }
      } catch (error) {
        console.error('Error loading games:', error);
        setMessage({ type: 'error', text: 'Error loading games' });
      }
    } catch (error) {
      console.error('Error loading game management data:', error);
      setMessage({ type: 'error', text: 'Error loading data' });
    } finally {
      setLoading(false);
    }
  };

  // Helper functions to get game colors and gradients
  const getGameColor = (gameId: string): string => {
    const colors: { [key: string]: string } = {
      'diamond-hunt': 'text-yellow-400',
      'connect-four': 'text-blue-400',
      'dice-battle': 'text-green-400',
      'tictactoe-5x5': 'text-purple-400'
    };
    return colors[gameId] || 'text-gray-400';
  };

  const getGameGradient = (gameId: string): string => {
    const gradients: { [key: string]: string } = {
      'diamond-hunt': 'from-yellow-500/20 to-orange-500/20',
      'connect-four': 'from-blue-500/20 to-cyan-500/20',
      'dice-battle': 'from-green-500/20 to-emerald-500/20',
      'tictactoe-5x5': 'from-purple-500/20 to-pink-500/20'
    };
    return gradients[gameId] || 'from-gray-500/20 to-gray-600/20';
  };

  const iconOptions = [
    { value: 'Gamepad2', label: 'Gamepad', icon: Gamepad2 },
    { value: 'Zap', label: 'Lightning', icon: Zap },
    { value: 'Dice6', label: 'Dice', icon: Dice6 },
    { value: 'Grid3X3', label: 'Grid', icon: Grid3X3 },
    { value: 'Target', label: 'Target', icon: Target },
    { value: 'Crown', label: 'Crown', icon: Crown }
  ];

  const handleAddGame = async () => {
    if (!newGame.name || !newGame.description) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/api/admin/games', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newGame)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Game added successfully' });
        setShowAddGameModal(false);
        setNewGame({});
        loadGameManagementData();
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.message || 'Failed to add game' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error adding game' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditGame = async () => {
    if (!selectedGame?.id) return;

    setIsSaving(true);
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + `/api/admin/games/${selectedGame.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(selectedGame)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Game updated successfully' });
        setShowGameRules(false);
        setSelectedGame(null);
        loadGameManagementData();
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.message || 'Failed to update game' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error updating game' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    if (!confirm('Are you sure you want to delete this game?')) return;

    try {
      const response = await fetch(import.meta.env.VITE_API_URL + `/api/admin/games/${gameId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Game deleted successfully' });
        loadGameManagementData();
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.message || 'Failed to delete game' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error deleting game' });
    }
  };

  const handleToggleGameVisibility = async (gameId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/games/${gameId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isActive: !currentStatus
        })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: `Game ${!currentStatus ? 'activated' : 'hidden'} successfully` });
        // Reload games from API to update the frontend
        await loadGamesFromAPI();
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.message || 'Failed to update game visibility' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update game visibility' });
    }
  };

  const handleViewGameRules = (game: Game) => {
    setSelectedGame(game);
    setShowGameRules(true);
  };

  const handleViewLiveGames = () => {
    setShowLiveGames(true);
  };

  const handleViewFinishedMatches = () => {
    setShowFinishedMatches(true);
  };

  const handleViewMatchmakingRules = () => {
    setShowMatchmakingRules(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'text-yellow-400 bg-yellow-400/10';
      case 'playing': return 'text-green-400 bg-green-400/10';
      case 'finished': return 'text-gray-400 bg-gray-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getMatchmakingTypeColor = (type: string) => {
    switch (type) {
      case 'skill_based': return 'text-blue-400 bg-blue-400/10';
      case 'random': return 'text-green-400 bg-green-400/10';
      case 'tournament': return 'text-purple-400 bg-purple-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-yellow-400 bg-yellow-400/10';
      case 'medium': return 'text-orange-400 bg-orange-400/10';
      case 'high': return 'text-red-400 bg-red-400/10';
      case 'critical': return 'text-red-600 bg-red-600/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleViewLogDetails = (log: GameLog) => {
    setSelectedLog(log);
    setShowLogDetails(true);
  };

  const handleViewUserHistory = (user: UserMatchHistory) => {
    setSelectedUser(user);
    setShowUserHistory(true);
  };

  const handleViewAntiCheatDetails = (flag: AntiCheatFlag) => {
    setShowAntiCheatDetails(true);
  };

  const handleResolveFlag = (flagId: string) => {
    // In real app, this would make an API call
    console.log('Resolving flag:', flagId);
    alert('Flag resolved successfully');
  };

  const handleExportData = (type: 'csv' | 'json', dataType: 'logs' | 'users' | 'flags') => {
    // In real app, this would generate and download the file
    console.log(`Exporting ${dataType} as ${type}`);
    alert(`${dataType} exported as ${type.toUpperCase()} successfully`);
  };

  const handleBanUser = (userId: string, reason: string) => {
    // Implementation for banning users
    console.log('Banning user:', userId, 'Reason:', reason);
    setMessage({ type: 'success', text: `User ${userId} banned successfully` });
  };

  // Service management handlers
  const handleViewServiceStats = async (serviceId: string) => {
    try {
      setSelectedService(serviceId);
      setLoading(true);
      
      let endpoint = '';
      switch (serviceId) {
        case 'diamond_hunt':
          endpoint = '/admin/games?gameId=diamond_hunt/stats';
          break;
        case 'connect_four':
          endpoint = '/admin/games?gameId=connect_four/stats';
          break;
        case 'matchmaking':
          endpoint = '/admin/matchmaking/stats';
          break;
        case 'api_gateway':
          endpoint = '/admin/gateway/health';
          break;
        default:
          throw new Error('Unknown service');
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setServiceStats(data.data || data);
        setShowServiceStats(true);
      } else {
        setMessage({ type: 'error', text: 'Failed to load service stats' });
      }
    } catch (error) {
      console.error('Error loading service stats:', error);
      setMessage({ type: 'error', text: 'Error loading service stats' });
    } finally {
      setLoading(false);
    }
  };

  const handleViewServiceConfig = async (serviceId: string) => {
    try {
      setSelectedService(serviceId);
      setLoading(true);
      
      let endpoint = '';
      switch (serviceId) {
        case 'diamond_hunt':
          endpoint = '/admin/games?gameId=diamond_hunt/config';
          break;
        case 'connect_four':
          endpoint = '/admin/games?gameId=connect_four/config';
          break;
        case 'matchmaking':
          endpoint = '/admin/matchmaking/config';
          break;
        default:
          throw new Error('Unknown service');
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setServiceConfig(data.data || data);
        setShowServiceConfig(true);
      } else {
        setMessage({ type: 'error', text: 'Failed to load service config' });
      }
    } catch (error) {
      console.error('Error loading service config:', error);
      setMessage({ type: 'error', text: 'Error loading service config' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateServiceConfig = async (serviceId: string, config: any) => {
    try {
      setLoading(true);
      
      let endpoint = '';
      switch (serviceId) {
        case 'diamond_hunt':
          endpoint = '/admin/games?gameId=diamond_hunt/config';
          break;
        case 'connect_four':
          endpoint = '/admin/games?gameId=connect_four/config';
          break;
        case 'matchmaking':
          endpoint = '/admin/matchmaking/config';
          break;
        default:
          throw new Error('Unknown service');
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Service configuration updated successfully' });
        setShowServiceConfig(false);
      } else {
        setMessage({ type: 'error', text: 'Failed to update service config' });
      }
    } catch (error) {
      console.error('Error updating service config:', error);
      setMessage({ type: 'error', text: 'Error updating service config' });
    } finally {
      setLoading(false);
    }
  };

  // Toast for error/success messages
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div>
      {/* Toast Message */}
      {message && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-6 py-3 rounded-lg shadow-lg transition-all duration-300
            ${message.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}
          style={{ minWidth: 240 }}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Game Management</h1>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowAddGameModal(true)}
              className="bg-gaming-accent text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add New Game</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-card-gradient rounded-xl border border-gray-700">
          <div className="flex border-b border-gray-700 overflow-x-auto">
            <button
              onClick={() => setActiveTab('games')}
              className={`flex-shrink-0 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'games'
                  ? 'text-gaming-accent border-b-2 border-gaming-accent'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Gamepad2 className="h-4 w-4 inline mr-2" />
              Games
            </button>
            <button
              onClick={() => setActiveTab('live')}
              className={`flex-shrink-0 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'live'
                  ? 'text-gaming-accent border-b-2 border-gaming-accent'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Play className="h-4 w-4 inline mr-2" />
              Live Games
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-shrink-0 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'history'
                  ? 'text-gaming-accent border-b-2 border-gaming-accent'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <History className="h-4 w-4 inline mr-2" />
              Match History
            </button>
            <button
              onClick={() => setActiveTab('matchmaking')}
              className={`flex-shrink-0 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'matchmaking'
                  ? 'text-gaming-accent border-b-2 border-gaming-accent'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Users className="h-4 w-4 inline mr-2" />
              Matchmaking
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex-shrink-0 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'logs'
                  ? 'text-gaming-accent border-b-2 border-gaming-accent'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <FileText className="h-4 w-4 inline mr-2" />
              Game Logs
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-shrink-0 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'users'
                  ? 'text-gaming-accent border-b-2 border-gaming-accent'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <UserCheck className="h-4 w-4 inline mr-2" />
              User History
            </button>
            <button
              onClick={() => setActiveTab('anticheat')}
              className={`flex-shrink-0 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'anticheat'
                  ? 'text-gaming-accent border-b-2 border-gaming-accent'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Shield className="h-4 w-4 inline mr-2" />
              Anti-Cheat
            </button>
            <button
              onClick={() => setActiveTab('services')}
              className={`flex-shrink-0 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'services'
                  ? 'text-gaming-accent border-b-2 border-gaming-accent'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <BarChart3 className="h-4 w-4 inline mr-2" />
              Services
            </button>
          </div>

          <div className="p-6">
            {/* Games Tab */}
            {activeTab === 'games' && (
              <div className="space-y-6">
                {/* Header with Add Game Button */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Game Management</h3>
                  <button
                    onClick={() => setShowAddGameModal(true)}
                    className="flex items-center space-x-2 bg-gaming-accent hover:bg-gaming-accent/90 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Game</span>
                  </button>
                </div>

                {/* Games Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {adminGames.map((game) => (
                    <div key={game.id} className="bg-gaming-dark rounded-xl p-6 border border-gray-700">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-gaming-accent/20 rounded-lg">
                            {React.createElement(
                              iconOptions.find(opt => opt.value === (game.icon?.name || game.icon))?.icon || Gamepad2,
                              { className: 'h-5 w-5 text-gaming-accent' }
                            )}
                          </div>
                          <div>
                            <h3 className="text-white font-semibold">{game.name}</h3>
                            <p className="text-gray-400 text-sm">${game.minBet}-${game.maxBet}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedGame(game);
                              setEditingGame(game);
                              setGameForm({
                                name: game.name,
                                description: game.description,
                                icon: game.icon?.name || 'Gamepad2',
                                minBet: game.minBet,
                                maxBet: game.maxBet,
                                players: typeof game.players === 'string' ? parseInt(game.players) : game.players,
                                isActive: game.isActive,
                                rules: game.rules || []
                              });
                            }}
                            className="p-1 text-blue-400 hover:text-blue-300 rounded"
                            title="Edit Game"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteGame(game.id)}
                            className="p-1 text-red-400 hover:text-red-300 rounded"
                            title="Delete Game"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      <p className="text-gray-400 text-sm mb-4">{game.description}</p>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                        <span>{game.players} players</span>
                        <span className={`px-2 py-1 rounded ${
                          game.isActive ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'
                        }`}>
                          {game.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewGameRules(game)}
                          className="flex-1 bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded text-xs transition-colors"
                        >
                          <Settings className="h-3 w-3 inline mr-1" />
                          Rules
                        </button>
                        <button
                          onClick={() => handleToggleGameVisibility(game.id, game.isActive)}
                          className={`flex-1 px-3 py-1 rounded text-xs transition-colors ${
                            game.isActive 
                              ? 'bg-red-600 hover:bg-red-500 text-white' 
                              : 'bg-green-600 hover:bg-green-500 text-white'
                          }`}
                        >
                          {game.isActive ? (
                            <>
                              <EyeOff className="h-3 w-3 inline mr-1" />
                              Hide
                            </>
                          ) : (
                            <>
                              <Eye className="h-3 w-3 inline mr-1" />
                              Show
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live Games Tab */}
            {activeTab === 'live' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Live Games</h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>{liveGames.length} active games</span>
                  </div>
                </div>
                
                {liveGames.length === 0 ? (
                  <div className="text-center py-12">
                    <Play className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-400">No live games at the moment</p>
                    <p className="text-gray-500 text-sm">Games will appear here when players start playing</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {liveGames.map((game) => (
                      <div key={game.id} className="bg-gaming-dark rounded-lg p-4 border border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-white font-medium">{game.gameName}</h4>
                          <span className={`px-2 py-1 rounded text-xs ${getStatusColor(game.status)}`}>
                            {game.status}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Players:</span>
                            <span className="text-white">{game.player1} vs {game.player2}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Bet:</span>
                            <span className="text-gaming-accent">${game.bet}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Duration:</span>
                            <span className="text-white">{game.duration}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Spectators:</span>
                            <span className="text-white">{game.spectators}</span>
                          </div>
                        </div>
                        <div className="mt-3 flex space-x-2">
                          <button className="flex-1 bg-gaming-accent text-white px-3 py-1 rounded text-xs hover:opacity-90">
                            <EyeIcon className="h-3 w-3 inline mr-1" />
                            Spectate
                          </button>
                          <button className="flex-1 bg-gray-600 text-white px-3 py-1 rounded text-xs hover:opacity-90">
                            <Video className="h-3 w-3 inline mr-1" />
                            Replay
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Match History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Finished Matches</h3>
                  <div className="flex items-center space-x-2">
                    <Search className="h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search matches..."
                      className="px-3 py-1 bg-gaming-dark border border-gray-600 rounded text-white text-sm placeholder-gray-400 focus:outline-none focus:border-gaming-accent"
                    />
                  </div>
                </div>
                
                {finishedMatches.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-400">No finished matches yet</p>
                    <p className="text-gray-500 text-sm">Match history will appear here once games are completed</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gaming-dark">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Game</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Players</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Winner</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Bet</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Duration</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {finishedMatches.map((match) => (
                          <tr key={match.id} className="hover:bg-gray-800/50">
                            <td className="px-4 py-3">
                              <div className="flex items-center space-x-2">
                                <Gamepad2 className="h-4 w-4 text-gaming-accent" />
                                <span className="text-white">{match.gameName}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-300">
                              {match.player1} vs {match.player2}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-green-400 font-medium">{match.winner}</span>
                            </td>
                            <td className="px-4 py-3 text-gaming-accent">${match.bet}</td>
                            <td className="px-4 py-3 text-gray-300">{match.duration}</td>
                            <td className="px-4 py-3">
                              <div className="flex space-x-2">
                                {match.replayAvailable && (
                                  <button className="text-blue-400 hover:text-blue-300">
                                    <Video className="h-4 w-4" />
                                  </button>
                                )}
                                <button className="text-gray-400 hover:text-gray-300">
                                  <FileText className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Matchmaking Rules Tab */}
            {activeTab === 'matchmaking' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Matchmaking Rules</h3>
                  <button className="bg-gaming-accent text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center space-x-2">
                    <Plus className="h-4 w-4" />
                    <span>Add Rule</span>
                  </button>
                </div>
                
                {matchmakingRules.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-400">No matchmaking rules configured</p>
                    <p className="text-gray-500 text-sm">Add rules to control how players are matched</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {matchmakingRules.map((rule) => (
                      <div key={rule.id} className="bg-gaming-dark rounded-lg p-4 border border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-white font-medium">{rule.name}</h4>
                          <span className={`px-2 py-1 rounded text-xs ${getMatchmakingTypeColor(rule.type)}`}>
                            {rule.type.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Players:</span>
                            <span className="text-white">{rule.minPlayers}-{rule.maxPlayers}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Skill Range:</span>
                            <span className="text-white">±{rule.skillRange}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Status:</span>
                            <span className={`${rule.isActive ? 'text-green-400' : 'text-red-400'}`}>
                              {rule.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 flex space-x-2">
                          <button className="flex-1 bg-blue-600 text-white px-3 py-1 rounded text-xs hover:opacity-90">
                            <Edit className="h-3 w-3 inline mr-1" />
                            Edit
                          </button>
                          <button className="flex-1 bg-gray-600 text-white px-3 py-1 rounded text-xs hover:opacity-90">
                            <EyeIcon className="h-3 w-3 inline mr-1" />
                            Toggle
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Game Logs Tab */}
            {activeTab === 'logs' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Game Logs & Match Data</h3>
                  <div className="flex items-center space-x-3">
                    <select
                      value={logFilter}
                      onChange={(e) => setLogFilter(e.target.value as any)}
                      className="px-3 py-1 bg-gaming-dark border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-gaming-accent"
                    >
                      <option value="all">All Logs</option>
                      <option value="suspicious">Suspicious Activity</option>
                      <option value="normal">Normal Activity</option>
                    </select>
                    <button 
                      onClick={() => handleExportData('csv', 'logs')}
                      className="bg-gaming-gold text-gaming-dark px-3 py-1 rounded text-sm hover:opacity-90 flex items-center space-x-1"
                    >
                      <Download className="h-3 w-3" />
                      <span>Export CSV</span>
                    </button>
                    <button 
                      onClick={() => handleExportData('json', 'logs')}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:opacity-90 flex items-center space-x-1"
                    >
                      <Download className="h-3 w-3" />
                      <span>Export JSON</span>
                    </button>
                  </div>
                </div>
                
                {gameLogs.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-400">No game logs available</p>
                    <p className="text-gray-500 text-sm">Game logs will appear here as matches are played</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gaming-dark">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Game</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Players</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Winner</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Duration</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Moves</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {gameLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-gray-800/50">
                            <td className="px-4 py-3">
                              <div className="flex items-center space-x-2">
                                <Gamepad2 className="h-4 w-4 text-gaming-accent" />
                                <span className="text-white">{log.gameName}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-300">
                              {log.player1} vs {log.player2}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-green-400 font-medium">{log.winner}</span>
                            </td>
                            <td className="px-4 py-3 text-gray-300">
                              {formatDuration(log.duration)}
                            </td>
                            <td className="px-4 py-3 text-gray-300">
                              {log.moves.length} moves
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs ${
                                log.suspiciousActivity 
                                  ? 'text-red-400 bg-red-400/10' 
                                  : 'text-green-400 bg-green-400/10'
                              }`}>
                                {log.suspiciousActivity ? 'Suspicious' : 'Normal'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button 
                                onClick={() => handleViewLogDetails(log)}
                                className="text-blue-400 hover:text-blue-300"
                              >
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

            {/* User History Tab */}
            {activeTab === 'users' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">User Match History</h3>
                  <div className="flex items-center space-x-3">
                    <select
                      value={userFilter}
                      onChange={(e) => setUserFilter(e.target.value as any)}
                      className="px-3 py-1 bg-gaming-dark border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-gaming-accent"
                    >
                      <option value="all">All Users</option>
                      <option value="suspicious">Suspicious Users</option>
                      <option value="normal">Normal Users</option>
                    </select>
                    <button 
                      onClick={() => handleExportData('csv', 'users')}
                      className="bg-gaming-gold text-gaming-dark px-3 py-1 rounded text-sm hover:opacity-90 flex items-center space-x-1"
                    >
                      <Download className="h-3 w-3" />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>
                
                {userMatchHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-400">No user match history available</p>
                    <p className="text-gray-500 text-sm">User statistics will appear here as they play games</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {userMatchHistory.map((user) => (
                      <div key={user.userId} className="bg-gaming-dark rounded-lg p-4 border border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-white font-medium">{user.username}</h4>
                          <span className={`px-2 py-1 rounded text-xs ${
                            user.suspiciousActivity 
                              ? 'text-red-400 bg-red-400/10' 
                              : 'text-green-400 bg-green-400/10'
                          }`}>
                            {user.suspiciousActivity ? 'Suspicious' : 'Normal'}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Matches:</span>
                            <span className="text-white">{user.totalMatches}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Win Rate:</span>
                            <span className="text-green-400">{user.winRate}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Avg Bet:</span>
                            <span className="text-gaming-accent">${user.averageBet}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Total Winnings:</span>
                            <span className="text-green-400">${user.totalWinnings}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Last Played:</span>
                            <span className="text-white">{new Date(user.lastPlayed).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="mt-3 flex space-x-2">
                          <button 
                            onClick={() => handleViewUserHistory(user)}
                            className="flex-1 bg-blue-600 text-white px-3 py-1 rounded text-xs hover:opacity-90"
                          >
                            <Eye className="h-3 w-3 inline mr-1" />
                            View History
                          </button>
                          {user.suspiciousActivity && (
                            <button 
                              onClick={() => handleBanUser(user.userId, 'Suspicious activity detected')}
                              className="flex-1 bg-red-600 text-white px-3 py-1 rounded text-xs hover:opacity-90"
                            >
                              <Shield className="h-3 w-3 inline mr-1" />
                              Ban User
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Anti-Cheat Tab */}
            {activeTab === 'anticheat' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Anti-Cheat Monitoring</h3>
                  <div className="flex items-center space-x-3">
                    <select
                      value={flagFilter}
                      onChange={(e) => setFlagFilter(e.target.value as any)}
                      className="px-3 py-1 bg-gaming-dark border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-gaming-accent"
                    >
                      <option value="all">All Flags</option>
                      <option value="unresolved">Unresolved</option>
                      <option value="resolved">Resolved</option>
                    </select>
                    <button 
                      onClick={() => handleExportData('csv', 'flags')}
                      className="bg-gaming-gold text-gaming-dark px-3 py-1 rounded text-sm hover:opacity-90 flex items-center space-x-1"
                    >
                      <Download className="h-3 w-3" />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>
                
                {antiCheatFlags.length === 0 ? (
                  <div className="text-center py-12">
                    <Shield className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-400">No anti-cheat flags detected</p>
                    <p className="text-gray-500 text-sm">Suspicious activity will be flagged here automatically</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {antiCheatFlags.map((flag) => (
                      <div key={flag.id} className="bg-gaming-dark rounded-lg p-4 border border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <h4 className="text-white font-medium">{flag.username}</h4>
                            <span className={`px-2 py-1 rounded text-xs ${getSeverityColor(flag.severity)}`}>
                              {flag.severity.toUpperCase()}
                            </span>
                            <span className="px-2 py-1 rounded text-xs bg-blue-400/10 text-blue-400">
                              {flag.flagType.replace('_', ' ')}
                            </span>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs ${
                            flag.resolved 
                              ? 'text-green-400 bg-green-400/10' 
                              : 'text-red-400 bg-red-400/10'
                          }`}>
                            {flag.resolved ? 'Resolved' : 'Unresolved'}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <p className="text-gray-300">{flag.description}</p>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Detected:</span>
                            <span className="text-white">{new Date(flag.timestamp).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Game:</span>
                            <span className="text-white">{flag.gameId}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Match:</span>
                            <span className="text-white">{flag.matchId}</span>
                          </div>
                        </div>
                        <div className="mt-3 flex space-x-2">
                          <button 
                            onClick={() => handleViewAntiCheatDetails(flag)}
                            className="flex-1 bg-blue-600 text-white px-3 py-1 rounded text-xs hover:opacity-90"
                          >
                            <Eye className="h-3 w-3 inline mr-1" />
                            View Details
                          </button>
                          {!flag.resolved && (
                            <button 
                              onClick={() => handleResolveFlag(flag.id)}
                              className="flex-1 bg-green-600 text-white px-3 py-1 rounded text-xs hover:opacity-90"
                            >
                              <CheckCircle className="h-3 w-3 inline mr-1" />
                              Resolve
                            </button>
                          )}
                          <button 
                            onClick={() => handleBanUser(flag.userId, `Anti-cheat violation: ${flag.flagType}`)}
                            className="flex-1 bg-red-600 text-white px-3 py-1 rounded text-xs hover:opacity-90"
                          >
                            <Shield className="h-3 w-3 inline mr-1" />
                            Ban User
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Services Tab */}
            {activeTab === 'services' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Independent Game Services</h3>
                  <button 
                    onClick={loadGameManagementData}
                    className="bg-gaming-accent text-white px-4 py-2 rounded hover:opacity-90 flex items-center space-x-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Refresh</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Diamond Hunt Service */}
                  <div className="bg-gaming-dark rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-white font-semibold">Diamond Hunt Service</h4>
                      <span className="px-2 py-1 rounded text-xs bg-green-400/10 text-green-400">
                        Active
                      </span>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Port:</span>
                        <span className="text-white">3003</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Active Games:</span>
                        <span className="text-white">{liveGames.filter(g => g.gameId === 'diamond_hunt').length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Games:</span>
                        <span className="text-white">{finishedMatches.filter(g => g.gameId === 'diamond_hunt').length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Status:</span>
                        <span className="text-green-400">✓ Running</span>
                      </div>
                    </div>
                    <div className="mt-4 flex space-x-2">
                      <button 
                        onClick={() => handleViewServiceStats('diamond_hunt')}
                        className="flex-1 bg-blue-600 text-white px-3 py-1 rounded text-xs hover:opacity-90"
                      >
                        <Eye className="h-3 w-3 inline mr-1" />
                        View Stats
                      </button>
                      <button 
                        onClick={() => handleViewServiceConfig('diamond_hunt')}
                        className="flex-1 bg-gray-600 text-white px-3 py-1 rounded text-xs hover:opacity-90"
                      >
                        <Settings className="h-3 w-3 inline mr-1" />
                        Config
                      </button>
                    </div>
                  </div>

                  {/* Connect Four Service */}
                  <div className="bg-gaming-dark rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-white font-semibold">Connect Four Service</h4>
                      <span className="px-2 py-1 rounded text-xs bg-green-400/10 text-green-400">
                        Active
                      </span>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Port:</span>
                        <span className="text-white">3004</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Active Games:</span>
                        <span className="text-white">{liveGames.filter(g => g.gameId === 'connect_four').length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Games:</span>
                        <span className="text-white">{finishedMatches.filter(g => g.gameId === 'connect_four').length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Status:</span>
                        <span className="text-green-400">✓ Running</span>
                      </div>
                    </div>
                    <div className="mt-4 flex space-x-2">
                      <button 
                        onClick={() => handleViewServiceStats('connect_four')}
                        className="flex-1 bg-blue-600 text-white px-3 py-1 rounded text-xs hover:opacity-90"
                      >
                        <Eye className="h-3 w-3 inline mr-1" />
                        View Stats
                      </button>
                      <button 
                        onClick={() => handleViewServiceConfig('connect_four')}
                        className="flex-1 bg-gray-600 text-white px-3 py-1 rounded text-xs hover:opacity-90"
                      >
                        <Settings className="h-3 w-3 inline mr-1" />
                        Config
                      </button>
                    </div>
                  </div>

                  {/* Matchmaking Service */}
                  <div className="bg-gaming-dark rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-white font-semibold">Matchmaking Service</h4>
                      <span className="px-2 py-1 rounded text-xs bg-green-400/10 text-green-400">
                        Active
                      </span>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Port:</span>
                        <span className="text-white">3005</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Active Queues:</span>
                        <span className="text-white">3</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Players:</span>
                        <span className="text-white">0</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Status:</span>
                        <span className="text-green-400">✓ Running</span>
                      </div>
                    </div>
                    <div className="mt-4 flex space-x-2">
                      <button 
                        onClick={() => handleViewServiceStats('matchmaking')}
                        className="flex-1 bg-blue-600 text-white px-3 py-1 rounded text-xs hover:opacity-90"
                      >
                        <Eye className="h-3 w-3 inline mr-1" />
                        View Stats
                      </button>
                      <button 
                        onClick={() => handleViewServiceConfig('matchmaking')}
                        className="flex-1 bg-gray-600 text-white px-3 py-1 rounded text-xs hover:opacity-90"
                      >
                        <Settings className="h-3 w-3 inline mr-1" />
                        Config
                      </button>
                    </div>
                  </div>

                  {/* API Gateway */}
                  <div className="bg-gaming-dark rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-white font-semibold">API Gateway</h4>
                      <span className="px-2 py-1 rounded text-xs bg-green-400/10 text-green-400">
                        Active
                      </span>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Port:</span>
                        <span className="text-white">3001</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Routes:</span>
                        <span className="text-white">4</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Health:</span>
                        <span className="text-green-400">✓ Healthy</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Status:</span>
                        <span className="text-green-400">✓ Running</span>
                      </div>
                    </div>
                    <div className="mt-4 flex space-x-2">
                      <button 
                        onClick={() => handleViewServiceStats('api_gateway')}
                        className="flex-1 bg-blue-600 text-white px-3 py-1 rounded text-xs hover:opacity-90"
                      >
                        <Eye className="h-3 w-3 inline mr-1" />
                        View Stats
                      </button>
                      <button 
                        onClick={() => handleViewServiceConfig('api_gateway')}
                        className="flex-1 bg-gray-600 text-white px-3 py-1 rounded text-xs hover:opacity-90"
                      >
                        <Settings className="h-3 w-3 inline mr-1" />
                        Config
                      </button>
                    </div>
                  </div>
                </div>

                {/* Service Architecture Info */}
                <div className="bg-gaming-dark rounded-lg p-6 border border-gray-700">
                  <h4 className="text-white font-semibold mb-4">Independent Service Architecture</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    <div>
                      <h5 className="text-gray-300 font-medium mb-2">Benefits:</h5>
                      <ul className="space-y-1 text-gray-400">
                        <li>• Independent development and deployment</li>
                        <li>• Isolated failures don't affect other games</li>
                        <li>• Scalable per game requirements</li>
                        <li>• Shared matchmaking infrastructure</li>
                        <li>• Centralized admin monitoring</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-gray-300 font-medium mb-2">Current Setup:</h5>
                      <ul className="space-y-1 text-gray-400">
                        <li>• 3 independent game services</li>
                        <li>• 1 shared matchmaking service</li>
                        <li>• 1 API gateway for routing</li>
                        <li>• Centralized admin panel</li>
                        <li>• Docker Compose deployment</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add Game Modal */}
        {showAddGameModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-card-gradient rounded-xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Add New Game</h2>
                  <button
                    onClick={() => setShowAddGameModal(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Game Name</label>
                    <input
                      type="text"
                      value={gameForm.name}
                      onChange={(e) => setGameForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-2 bg-gaming-dark border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gaming-accent"
                      placeholder="Enter game name"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Icon</label>
                    <select
                      value={gameForm.icon}
                      onChange={(e) => setGameForm(prev => ({ ...prev, icon: e.target.value }))}
                      className="w-full px-4 py-2 bg-gaming-dark border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
                    >
                      {iconOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-gray-400 text-sm mb-2">Description</label>
                    <textarea
                      value={gameForm.description}
                      onChange={(e) => setGameForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-4 py-2 bg-gaming-dark border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gaming-accent"
                      rows={3}
                      placeholder="Enter game description"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Minimum Bet</label>
                    <input
                      type="number"
                      value={gameForm.minBet}
                      onChange={(e) => {
                        const value = e.target.value;
                        setGameForm(prev => ({ 
                          ...prev, 
                          minBet: value === '' ? 0 : parseInt(value) || 0 
                        }));
                      }}
                      className="w-full px-4 py-2 bg-gaming-dark border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Maximum Bet</label>
                    <input
                      type="number"
                      value={gameForm.maxBet}
                      onChange={(e) => {
                        const value = e.target.value;
                        setGameForm(prev => ({ 
                          ...prev, 
                          maxBet: value === '' ? 0 : parseInt(value) || 0 
                        }));
                      }}
                      className="w-full px-4 py-2 bg-gaming-dark border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Players</label>
                    <input
                      type="number"
                      value={gameForm.players}
                      onChange={(e) => setGameForm(prev => ({ ...prev, players: parseInt(e.target.value) || 2 }))}
                      className="w-full px-4 py-2 bg-gaming-dark border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
                      min="1"
                      max="10"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={gameForm.isActive}
                      onChange={(e) => setGameForm(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="text-gaming-accent"
                    />
                    <label className="text-gray-400 text-sm">Active</label>
                  </div>
                </div>

                <div className="mt-6 flex space-x-3">
                  <button
                    onClick={handleAddGame}
                    className="flex-1 bg-gaming-accent text-white px-4 py-2 rounded-lg hover:opacity-90"
                  >
                    Add Game
                  </button>
                  <button
                    onClick={() => setShowAddGameModal(false)}
                    className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:opacity-90"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Game Modal */}
        {editingGame && selectedGame && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-card-gradient rounded-xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Edit Game - {selectedGame.name}</h2>
                  <button
                    onClick={() => {
                      setEditingGame(null);
                      setSelectedGame(null);
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Game Name</label>
                    <input
                      type="text"
                      value={gameForm.name}
                      onChange={(e) => setGameForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-2 bg-gaming-dark border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gaming-accent"
                      placeholder="Enter game name"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Icon</label>
                    <select
                      value={gameForm.icon}
                      onChange={(e) => setGameForm(prev => ({ ...prev, icon: e.target.value }))}
                      className="w-full px-4 py-2 bg-gaming-dark border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
                    >
                      {iconOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-gray-400 text-sm mb-2">Description</label>
                    <textarea
                      value={gameForm.description}
                      onChange={(e) => setGameForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-4 py-2 bg-gaming-dark border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gaming-accent"
                      rows={3}
                      placeholder="Enter game description"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Minimum Bet</label>
                    <input
                      type="number"
                      value={gameForm.minBet}
                      onChange={(e) => {
                        const value = e.target.value;
                        setGameForm(prev => ({ 
                          ...prev, 
                          minBet: value === '' ? 0 : parseInt(value) || 0 
                        }));
                      }}
                      className="w-full px-4 py-2 bg-gaming-dark border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Maximum Bet</label>
                    <input
                      type="number"
                      value={gameForm.maxBet}
                      onChange={(e) => {
                        const value = e.target.value;
                        setGameForm(prev => ({ 
                          ...prev, 
                          maxBet: value === '' ? 0 : parseInt(value) || 0 
                        }));
                      }}
                      className="w-full px-4 py-2 bg-gaming-dark border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Players</label>
                    <input
                      type="number"
                      value={gameForm.players}
                      onChange={(e) => setGameForm(prev => ({ ...prev, players: parseInt(e.target.value) || 2 }))}
                      className="w-full px-4 py-2 bg-gaming-dark border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
                      min="1"
                      max="10"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={gameForm.isActive}
                      onChange={(e) => setGameForm(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="text-gaming-accent"
                    />
                    <label className="text-gray-400 text-sm">Active</label>
                  </div>
                </div>

                <div className="mt-6 flex space-x-3">
                  <button
                    onClick={handleEditGame}
                    className="flex-1 bg-gaming-accent text-white px-4 py-2 rounded-lg hover:opacity-90"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => {
                      setEditingGame(null);
                      setSelectedGame(null);
                    }}
                    className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:opacity-90"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Game Rules Modal */}
        {showGameRules && selectedGame && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-card-gradient rounded-xl border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Game Rules - {selectedGame.name}</h2>
                  <button
                    onClick={() => setShowGameRules(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Add New Rule Section */}
                <div className="bg-gaming-dark rounded-lg p-4 mb-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Add New Rule</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Rule Name</label>
                      <input
                        type="text"
                        value={newRule.name || ''}
                        onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-gaming-accent"
                        placeholder="e.g., Max Moves, Time Limit"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Rule Type</label>
                      <select
                        value={newRule.type || ''}
                        onChange={(e) => setNewRule(prev => ({ ...prev, type: e.target.value as any }))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-gaming-accent"
                      >
                        <option value="">Select Type</option>
                        <option value="number">Number</option>
                        <option value="text">Text</option>
                        <option value="boolean">Boolean</option>
                        <option value="select">Select</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Default Value</label>
                      <input
                        type="text"
                        value={newRule.value || ''}
                        onChange={(e) => setNewRule(prev => ({ ...prev, value: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-gaming-accent"
                        placeholder="Default value"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Description</label>
                      <input
                        type="text"
                        value={newRule.description || ''}
                        onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-gaming-accent"
                        placeholder="Rule description"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex space-x-3">
                    <button
                      onClick={() => {
                        if (newRule.name && newRule.type && newRule.description) {
                          const rule: GameRule = {
                            id: Date.now().toString(),
                            name: newRule.name,
                            type: newRule.type,
                            value: newRule.value || '',
                            description: newRule.description,
                            options: newRule.type === 'select' ? [] : undefined
                          };
                          setGameForm(prev => ({
                            ...prev,
                            rules: [...(prev.rules || []), rule]
                          }));
                          setNewRule({});
                        } else {
                          setMessage({ type: 'error', text: 'Please fill in all required fields' });
                        }
                      }}
                      className="bg-gaming-accent text-white px-4 py-2 rounded hover:opacity-90"
                    >
                      Add Rule
                    </button>
                    <button
                      onClick={() => setNewRule({})}
                      className="bg-gray-600 text-white px-4 py-2 rounded hover:opacity-90"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Existing Rules Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Existing Rules</h3>
                  {gameForm.rules && gameForm.rules.length > 0 ? (
                    gameForm.rules.map((rule, index) => (
                      <div key={rule.id} className="bg-gaming-dark rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <label className="text-white font-medium">{rule.name}</label>
                              <span className="text-gray-400 text-sm">({rule.type})</span>
                              <span className="text-gray-500 text-sm">{rule.description}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setGameForm(prev => ({
                                ...prev,
                                rules: prev.rules?.filter((_, i) => i !== index) || []
                              }));
                            }}
                            className="text-red-400 hover:text-red-300 ml-2"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex items-center space-x-4">
                          {rule.type === 'number' && (
                            <input
                              type="number"
                              value={rule.value as number}
                              onChange={(e) => {
                                const updatedRules = [...(gameForm.rules || [])];
                                updatedRules[index] = { ...rule, value: parseInt(e.target.value) || 0 };
                                setGameForm(prev => ({ ...prev, rules: updatedRules }));
                              }}
                              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-gaming-accent"
                            />
                          )}
                          {rule.type === 'text' && (
                            <input
                              type="text"
                              value={rule.value as string}
                              onChange={(e) => {
                                const updatedRules = [...(gameForm.rules || [])];
                                updatedRules[index] = { ...rule, value: e.target.value };
                                setGameForm(prev => ({ ...prev, rules: updatedRules }));
                              }}
                              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-gaming-accent"
                            />
                          )}
                          {rule.type === 'boolean' && (
                            <input
                              type="checkbox"
                              checked={rule.value === true}
                              onChange={(e) => {
                                const updatedRules = [...(gameForm.rules || [])];
                                updatedRules[index] = { ...rule, value: e.target.checked };
                                setGameForm(prev => ({ ...prev, rules: updatedRules }));
                              }}
                              className="text-gaming-accent"
                            />
                          )}
                          {rule.type === 'select' && (
                            <select
                              value={String(rule.value)}
                              onChange={(e) => {
                                const updatedRules = [...(gameForm.rules || [])];
                                updatedRules[index] = { ...rule, value: e.target.value };
                                setGameForm(prev => ({ ...prev, rules: updatedRules }));
                              }}
                              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-gaming-accent"
                            >
                              {rule.options?.map((option) => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <Settings className="h-12 w-12 mx-auto mb-3" />
                      <p>No rules defined for this game</p>
                      <p className="text-sm">Add rules above to configure game behavior</p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex space-x-3">
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(import.meta.env.VITE_API_URL + `/api/admin/games/${selectedGame.id}`, {
                          method: 'PUT',
                          headers: {
                            'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({
                            ...selectedGame,
                            rules: gameForm.rules
                          })
                        });

                        if (response.ok) {
                          setMessage({ type: 'success', text: 'Game rules saved successfully' });
                          setShowGameRules(false);
                        } else {
                          const errorData = await response.json();
                          setMessage({ type: 'error', text: errorData.message || 'Failed to save rules' });
                        }
                      } catch (error) {
                        setMessage({ type: 'error', text: 'Error saving rules' });
                      }
                    }}
                    className="flex-1 bg-gaming-accent text-white px-4 py-2 rounded-lg hover:opacity-90"
                  >
                    Save Rules
                  </button>
                  <button
                    onClick={() => setShowGameRules(false)}
                    className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:opacity-90"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Game Logs Modal */}
        {showLogDetails && selectedLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-card-gradient rounded-xl border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Game Log - {selectedLog.gameName}</h2>
                  <button
                    onClick={() => setShowLogDetails(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Game:</span>
                    <span className="text-white">{selectedLog.gameName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Players:</span>
                    <span className="text-white">{selectedLog.player1} vs {selectedLog.player2}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Winner:</span>
                    <span className="text-green-400">{selectedLog.winner}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Moves:</span>
                    <span className="text-white">{selectedLog.moves.length} moves</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Duration:</span>
                    <span className="text-white">{formatDuration(selectedLog.duration)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Bet:</span>
                    <span className="text-gaming-accent">${selectedLog.bet}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Suspicious Activity:</span>
                    <span className={`${selectedLog.suspiciousActivity ? 'text-red-400' : 'text-green-400'}`}>
                      {selectedLog.suspiciousActivity ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Flags:</span>
                    <span className="text-white">{selectedLog.flags.join(', ')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User History Modal */}
        {showUserHistory && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-card-gradient rounded-xl border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">User History - {selectedUser.username}</h2>
                  <button
                    onClick={() => setShowUserHistory(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Matches:</span>
                    <span className="text-white">{selectedUser.totalMatches}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Wins:</span>
                    <span className="text-green-400">{selectedUser.wins}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Losses:</span>
                    <span className="text-red-400">{selectedUser.losses}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Win Rate:</span>
                    <span className="text-green-400">{selectedUser.winRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Average Bet:</span>
                    <span className="text-gaming-accent">${selectedUser.averageBet}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Winnings:</span>
                    <span className="text-green-400">${selectedUser.totalWinnings}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Last Played:</span>
                    <span className="text-white">{new Date(selectedUser.lastPlayed).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Match History</h3>
                  {selectedUser.matches.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <FileText className="h-12 w-12 mx-auto mb-3" />
                      <p>No match history available</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gaming-dark">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Game</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Players</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Winner</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Duration</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Moves</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {selectedUser.matches.map((log) => (
                            <tr key={log.id} className="hover:bg-gray-800/50">
                              <td className="px-4 py-3">
                                <div className="flex items-center space-x-2">
                                  <Gamepad2 className="h-4 w-4 text-gaming-accent" />
                                  <span className="text-white">{log.gameName}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-gray-300">
                                {log.player1} vs {log.player2}
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-green-400 font-medium">{log.winner}</span>
                              </td>
                              <td className="px-4 py-3 text-gray-300">
                                {formatDuration(log.duration)}
                              </td>
                              <td className="px-4 py-3 text-gray-300">
                                {log.moves.length} moves
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  log.suspiciousActivity 
                                    ? 'text-red-400 bg-red-400/10' 
                                    : 'text-green-400 bg-green-400/10'
                                }`}>
                                  {log.suspiciousActivity ? 'Suspicious' : 'Normal'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <button 
                                  onClick={() => handleViewLogDetails(log)}
                                  className="text-blue-400 hover:text-blue-300"
                                >
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
              </div>
            </div>
          </div>
        )}

        {/* Anti-Cheat Details Modal */}
        {showAntiCheatDetails && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-card-gradient rounded-xl border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Anti-Cheat Details - {selectedUser.username}</h2>
                  <button
                    onClick={() => setShowAntiCheatDetails(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Suspicious Timing:</span>
                    <span className="text-white">{selectedUser.suspiciousTiming ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Impossible Moves:</span>
                    <span className="text-white">{selectedUser.impossibleMoves ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Pattern Detection:</span>
                    <span className="text-white">{selectedUser.patternDetection ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Multiple Accounts:</span>
                    <span className="text-white">{selectedUser.multipleAccounts ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Bot Behavior:</span>
                    <span className="text-white">{selectedUser.botBehavior ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Service Stats Modal */}
        {showServiceStats && selectedService && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-card-gradient rounded-xl border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    {selectedService.replace('_', ' ').toUpperCase()} Service Statistics
                  </h2>
                  <button
                    onClick={() => setShowServiceStats(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gaming-accent mx-auto"></div>
                    <p className="text-gray-400 mt-2">Loading statistics...</p>
                  </div>
                ) : serviceStats ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(serviceStats).map(([key, value]) => (
                        <div key={key} className="bg-gaming-dark rounded-lg p-4 border border-gray-700">
                          <h3 className="text-gray-300 font-medium mb-2 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </h3>
                          <p className="text-white text-lg font-semibold">
                            {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <p>No statistics available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Service Config Modal */}
        {showServiceConfig && selectedService && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-card-gradient rounded-xl border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    {selectedService.replace('_', ' ').toUpperCase()} Service Configuration
                  </h2>
                  <button
                    onClick={() => setShowServiceConfig(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gaming-accent mx-auto"></div>
                    <p className="text-gray-400 mt-2">Loading configuration...</p>
                  </div>
                ) : serviceConfig ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {Object.entries(serviceConfig).map(([key, value]) => (
                        <div key={key} className="bg-gaming-dark rounded-lg p-4 border border-gray-700">
                          <label className="block text-gray-300 font-medium mb-2 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </label>
                          {typeof value === 'boolean' ? (
                            <input
                              type="checkbox"
                              checked={value as boolean}
                              onChange={(e) => {
                                const updatedConfig = { ...serviceConfig, [key]: e.target.checked };
                                setServiceConfig(updatedConfig);
                              }}
                              className="text-gaming-accent"
                            />
                          ) : typeof value === 'number' ? (
                            <input
                              type="number"
                              value={value as number}
                              onChange={(e) => {
                                const updatedConfig = { ...serviceConfig, [key]: parseInt(e.target.value) || 0 };
                                setServiceConfig(updatedConfig);
                              }}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-gaming-accent"
                            />
                          ) : (
                            <input
                              type="text"
                              value={value as string}
                              onChange={(e) => {
                                const updatedConfig = { ...serviceConfig, [key]: e.target.value };
                                setServiceConfig(updatedConfig);
                              }}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-gaming-accent"
                            />
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleUpdateServiceConfig(selectedService, serviceConfig)}
                        className="flex-1 bg-gaming-accent text-white px-4 py-2 rounded-lg hover:opacity-90"
                      >
                        Save Configuration
                      </button>
                      <button
                        onClick={() => setShowServiceConfig(false)}
                        className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:opacity-90"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <p>No configuration available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
