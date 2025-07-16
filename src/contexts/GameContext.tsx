import React, { createContext, useContext, useState, useEffect } from 'react';
import { Game, Match, GameState } from '../types';
import { Gamepad2, Zap, Dice6, Grid3X3, Circle, Gem, Crown, LucideIcon } from 'lucide-react';
import { useAuth } from './AuthContext';
import { getGameId } from '../utils/gameId';

interface GameContextType {
  games: Game[];
  currentMatch: Match | null;
  gameState: GameState | null;
  createMatch: (gameId: string, bet: number) => void;
  joinMatch: (matchId: string) => void;
  updateGameState: (state: GameState) => void;
  endMatch: (winner: string) => void;
  addGame: (game: Game) => void;
  updateGame: (gameId: string, updates: Partial<Game>) => void;
  deleteGame: (gameId: string) => void;
  loadGamesFromAPI: () => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

// Icon mapping for database icons to React components
const iconMap: { [key: string]: LucideIcon } = {
  'Crown': Crown,
  'Gem': Gem,
  'Circle': Circle,
  'Dice6': Dice6,
  'Grid3X3': Grid3X3,
  'Gamepad2': Gamepad2,
  'Zap': Zap
};

// Default games for fallback
const defaultGames: Game[] = [
  {
    id: 'chess',
    name: 'Chess',
    description: 'Classic strategic chess game with futuristic 3D design. Checkmate your opponent to win!',
    icon: Crown,
    color: 'text-gold-400',
    bgGradient: 'from-gold-500/20 to-yellow-500/20',
    minBet: 10,
    maxBet: 1000,
    players: '2 players',
    duration: '10-30 min',
    difficulty: 'Hard',
    gameId: 'chess',
    features: ['Strategic gameplay', '3D futuristic design', 'Real-time multiplayer', 'Checkmate detection'],
    rewards: 'Winner takes 90% of pot',
    isActive: true
  },
  {
    id: 'diamond-hunt',
    name: 'Diamond Hunt',
    description: 'Find diamonds in an 8x8 grid before your opponent. Each diamond is worth 10 points!',
    icon: Gem,
    color: 'text-yellow-400',
    bgGradient: 'from-yellow-500/20 to-orange-500/20',
    minBet: 10,
    maxBet: 100,
    players: '2 players',
    duration: '5-10 min',
    difficulty: 'Medium',
    gameId: 'diamond_hunt',
    features: ['Hidden diamonds', 'Score tracking', 'Turn-based'],
    rewards: 'Winner takes 90% of pot',
    isActive: true
  },
  {
    id: 'connect-four',
    name: 'Connect Four',
    description: 'Classic connect four with a competitive twist. Get 4 in a row to win!',
    icon: Circle,
    color: 'text-blue-400',
    bgGradient: 'from-blue-500/20 to-cyan-500/20',
    minBet: 5,
    maxBet: 50,
    players: '2 players',
    duration: '3-8 min',
    difficulty: 'Easy',
    gameId: 'connect_four',
    features: ['Strategic gameplay', 'Quick matches', 'Skill-based'],
    rewards: 'Winner takes 90% of pot',
    isActive: true
  },
  {
    id: 'dice-battle',
    name: 'Dice Battle',
    description: 'Roll dice and outscore your opponent. First to 3 wins or highest total after 5 rounds!',
    icon: Dice6,
    color: 'text-green-400',
    bgGradient: 'from-green-500/20 to-emerald-500/20',
    minBet: 1,
    maxBet: 25,
    players: '2 players',
    duration: '2-5 min',
    difficulty: 'Easy',
    gameId: 'dice_battle',
    features: ['Luck & strategy', 'Quick rounds', 'High stakes'],
    rewards: 'Winner takes 90% of pot',
    isActive: true
  },
  {
    id: 'tictactoe-5x5',
    name: 'Tic-Tac-Toe 5x5',
    description: 'Extended tic-tac-toe on a 5x5 board. Get 5 in a row to win!',
    icon: Grid3X3,
    color: 'text-purple-400',
    bgGradient: 'from-purple-500/20 to-pink-500/20',
    minBet: 5,
    maxBet: 30,
    players: '2 players',
    duration: '4-8 min',
    difficulty: 'Medium',
    gameId: 'tic_tac_toe',
    features: ['Larger board', 'More strategy', 'Extended gameplay'],
    rewards: 'Winner takes 90% of pot',
    isActive: true
  }
];

export function GameProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [games, setGames] = useState<Game[]>(defaultGames);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);

  // Convert database game to frontend game format
  const convertDatabaseGame = (dbGame: any): Game => {
    const iconComponent = iconMap[dbGame.icon] || Gamepad2;
    
    return {
      id: dbGame.id,
      name: dbGame.name,
      description: dbGame.description,
      icon: iconComponent,
      color: getGameColor(dbGame.id),
      bgGradient: getGameGradient(dbGame.id),
      minBet: dbGame.minBet,
      maxBet: dbGame.maxBet,
      players: dbGame.players,
      duration: getGameDuration(dbGame.id),
      difficulty: getGameDifficulty(dbGame.id),
      gameId: getGameId(dbGame.id),
      features: getGameFeatures(dbGame.id),
      rewards: 'Winner takes 90% of pot',
      isActive: dbGame.isActive
    };
  };

  // Helper functions to get game-specific data
  const getGameColor = (gameId: string): string => {
    const colors: { [key: string]: string } = {
      'chess': 'text-gold-400',
      'diamond-hunt': 'text-yellow-400',
      'connect-four': 'text-blue-400',
      'dice-battle': 'text-green-400',
      'tictactoe-5x5': 'text-purple-400'
    };
    return colors[gameId] || 'text-gray-400';
  };

  const getGameGradient = (gameId: string): string => {
    const gradients: { [key: string]: string } = {
      'chess': 'from-gold-500/20 to-yellow-500/20',
      'diamond-hunt': 'from-yellow-500/20 to-orange-500/20',
      'connect-four': 'from-blue-500/20 to-cyan-500/20',
      'dice-battle': 'from-green-500/20 to-emerald-500/20',
      'tictactoe-5x5': 'from-purple-500/20 to-pink-500/20'
    };
    return gradients[gameId] || 'from-gray-500/20 to-gray-600/20';
  };

  const getGameDuration = (gameId: string): string => {
    const durations: { [key: string]: string } = {
      'chess': '10-30 min',
      'diamond-hunt': '5-10 min',
      'connect-four': '3-8 min',
      'dice-battle': '2-5 min',
      'tictactoe-5x5': '4-8 min'
    };
    return durations[gameId] || '5-15 min';
  };

  const getGameDifficulty = (gameId: string): string => {
    const difficulties: { [key: string]: string } = {
      'chess': 'Hard',
      'diamond-hunt': 'Medium',
      'connect-four': 'Easy',
      'dice-battle': 'Easy',
      'tictactoe-5x5': 'Medium'
    };
    return difficulties[gameId] || 'Medium';
  };

  const getGameFeatures = (gameId: string): string[] => {
    const features: { [key: string]: string[] } = {
      'chess': ['Strategic gameplay', '3D futuristic design', 'Real-time multiplayer', 'Checkmate detection'],
      'diamond-hunt': ['Hidden diamonds', 'Score tracking', 'Turn-based'],
      'connect-four': ['Strategic gameplay', 'Quick matches', 'Skill-based'],
      'dice-battle': ['Luck & strategy', 'Quick rounds', 'High stakes'],
      'tictactoe-5x5': ['Larger board', 'More strategy', 'Extended gameplay']
    };
    return features[gameId] || ['Fun gameplay', 'Competitive', 'Rewards'];
  };

  // Load games from API
  const loadGamesFromAPI = async () => {
    try {
      let response;
      if (user?.isAdmin) {
        response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/games`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
            'Content-Type': 'application/json'
          }
        });
      } else {
        response = await fetch(`${import.meta.env.VITE_API_URL}/api/games/public/active`, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }

      if (response.ok) {
        const data = await response.json();
        let gamesArr = [];
        if (user?.isAdmin && Array.isArray(data.data)) {
          gamesArr = data.data;
        } else if (Array.isArray(data.data)) {
          gamesArr = data.data;
        }
        if (gamesArr.length) {
          const convertedGames = gamesArr.map(convertDatabaseGame);
          setGames(convertedGames);
        }
      } else {
        console.warn('Failed to load games from API, using defaults');
        setGames(defaultGames);
      }
    } catch (error) {
      console.warn('Error loading games from API, using defaults:', error);
      setGames(defaultGames);
    }
  };

  // Load games on component mount
  useEffect(() => {
    loadGamesFromAPI();
  }, []);

  const addGame = (game: Game) => {
    setGames(prev => [...prev, game]);
  };

  const updateGame = (gameId: string, updates: Partial<Game>) => {
    setGames(prev => prev.map(game => 
      game.id === gameId ? { ...game, ...updates } : game
    ));
  };

  const deleteGame = (gameId: string) => {
    setGames(prev => prev.filter(game => game.id !== gameId));
  };

  const createMatch = (gameId: string, bet: number) => {
    const match: Match = {
      id: Math.random().toString(36).substr(2, 9),
      gameId,
      player1: {
        id: '1',
        username: 'Player1',
        email: 'player1@test.com',
        avatar: '',
        balance: 0,
        real_balance: 0,
        virtual_balance: 0,
        wins: 0,
        losses: 0,
        level: 1,
        isAdmin: false,
        createdAt: new Date().toISOString(),
        emailVerified: true,
        phoneVerified: false,
        twoFactorEnabled: false,
        loginAttempts: 0,
        accountLocked: false,
        kycStatus: 'not_required',
        kycLevel: 1,
        amlStatus: 'not_required',
        identityVerified: false
      },
      player2: null,
      status: 'waiting',
      bet,
      winner: null,
      startedAt: new Date().toISOString()
    };
    setCurrentMatch(match);
  };

  const joinMatch = (matchId: string) => {
    if (currentMatch && currentMatch.id === matchId) {
      setCurrentMatch({
        ...currentMatch,
        player2: {
          id: '2',
          username: 'Player2',
          email: 'player2@test.com',
          avatar: '',
          balance: 0,
          real_balance: 0,
          virtual_balance: 0,
          wins: 0,
          losses: 0,
          level: 1,
          isAdmin: false,
          createdAt: new Date().toISOString(),
          emailVerified: true,
          phoneVerified: false,
          twoFactorEnabled: false,
          loginAttempts: 0,
          accountLocked: false,
          kycStatus: 'not_required',
          kycLevel: 1,
          amlStatus: 'not_required',
          identityVerified: false
        },
        status: 'playing'
      });
    }
  };

  const updateGameState = (state: GameState) => {
    setGameState(state);
  };

  const endMatch = (winner: string) => {
    if (currentMatch) {
      setCurrentMatch({
        ...currentMatch,
        status: 'finished',
        winner,
        finishedAt: new Date().toISOString()
      });
    }
  };

  const joinMatchmaking = async (gameType: string, stakeAmount: number, matchType: string = 'real') => {
    const token = localStorage.getItem('chanspaw_access_token') || localStorage.getItem('token');
    const res = await fetch('/api/games/matchmaking/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ gameType, stakeAmount, matchType })
    });
    if (!res.ok) throw new Error('Failed to join matchmaking');
    return (await res.json()).data;
  };

  const leaveMatchmaking = async () => {
    const token = localStorage.getItem('chanspaw_access_token') || localStorage.getItem('token');
    const res = await fetch('/api/games/matchmaking/leave', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to leave matchmaking');
    return (await res.json()).data;
  };

  const fetchMatchHistory = async (params: { page?: number; limit?: number; gameType?: string; result?: string; matchType?: string } = {}) => {
    const token = localStorage.getItem('chanspaw_access_token') || localStorage.getItem('token');
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.gameType) searchParams.append('gameType', params.gameType);
    if (params.result) searchParams.append('result', params.result);
    if (params.matchType) searchParams.append('matchType', params.matchType);
    const res = await fetch(`/api/games/history?${searchParams.toString()}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch match history');
    return (await res.json()).data.gameResults;
  };

  return (
    <GameContext.Provider value={{
      games,
      currentMatch,
      gameState,
      createMatch,
      joinMatch,
      updateGameState,
      endMatch,
      addGame,
      updateGame,
      deleteGame,
      loadGamesFromAPI
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}