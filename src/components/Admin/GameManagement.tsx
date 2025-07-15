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
    <div className="min-h-screen bg-card-gradient text-white">
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
      <div className="p-6">
        <div className="bg-gaming-dark rounded-xl p-6 border border-gray-700 mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gaming-accent">Game Management</h1>
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
          </div>
        </div>
        {/* Main Content Cards */}
        <div className="space-y-6">
          {/* ...existing content, wrap each section/card in bg-gaming-dark or bg-card-gradient as appropriate... */}
        </div>
      </div>
    </div>
  );
}
