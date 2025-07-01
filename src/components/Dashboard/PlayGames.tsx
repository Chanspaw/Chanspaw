import React from 'react';
import { useGame } from '../../contexts/GameContext';
import { useAuth } from '../../contexts/AuthContext';
import { useWalletMode } from '../../contexts/WalletModeContext';
import { 
  Gamepad2, 
  Target, 
  Diamond, 
  Dice6, 
  Square, 
  Zap,
  Users,
  Clock,
  Trophy,
  Star,
  TrendingUp,
  Award,
  Play,
  DollarSign,
  Crown,
  Shield,
  Grid3X3
} from 'lucide-react';

interface Game {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  bgGradient: string;
  players: string;
  duration: string;
  difficulty: string;
  gameId: string;
  features: string[];
  rewards: string;
  minBet: number;
  maxBet: number;
  isActive: boolean;
}

interface PlayGamesProps {
  onPlayGame?: (gameId: string) => void;
}

export function PlayGames({ onPlayGame }: PlayGamesProps) {
  const { user } = useAuth();
  const { walletMode } = useWalletMode();
  const { games } = useGame();

  const handleGameClick = (gameId: string) => {
    if (onPlayGame) {
      onPlayGame(gameId);
    }
  };

  return (
    <div className="mobile-container">
      <div className="mobile-space-y">
        {/* Header */}
        <div className="mobile-card">
          <div className="text-center">
            <h1 className="mobile-text-lg font-bold text-white mb-2">Available Games</h1>
            <p className="mobile-text-sm text-gray-400">
              Choose your game and start competing for {walletMode === 'real' ? 'real money' : 'virtual coins'}!
            </p>
          </div>
        </div>

        {/* Games Grid */}
        <div className="mobile-grid">
          {games.map((game) => (
            <div
              key={game.id}
              className="mobile-card hover:border-gaming-accent transition-all duration-300 hover:shadow-lg hover:shadow-gaming-accent/20 group cursor-pointer"
              onClick={() => handleGameClick(game.id)}
            >
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 sm:p-3 bg-gaming-accent/20 rounded-lg group-hover:bg-gaming-accent/30 transition-colors">
                  <game.icon className="mobile-icon text-gaming-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold mobile-text truncate">{game.name}</h3>
                  <p className="text-gaming-gold mobile-text-sm font-medium">${game.minBet}-${game.maxBet} betting</p>
                </div>
              </div>
              
              <p className="text-gray-300 mobile-text-sm mb-3 line-clamp-2">{game.description}</p>
              
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Users className="mobile-icon-sm text-gray-400" />
                  <span className="text-gray-400 mobile-text-sm">{game.players}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="mobile-icon-sm text-gray-400" />
                  <span className="text-gray-400 mobile-text-sm">{game.duration}</span>
                </div>
              </div>

              <div className="mb-3">
                <div className="flex flex-wrap gap-1">
                  {game.features.slice(0, 2).map((feature: string, index: number) => (
                    <span key={index} className="px-2 py-1 bg-gaming-dark text-xs text-gray-300 rounded">
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleGameClick(game.id);
                }}
                className="w-full mobile-btn bg-gradient-to-r from-emerald-400 to-blue-400 text-white hover:opacity-90 group-hover:scale-105 transform duration-200"
              >
                Play 1v1
              </button>
            </div>
          ))}
        </div>

        {games.length === 0 && (
          <div className="text-center py-8 sm:py-12">
            <div className="text-gray-400 mb-4">
              <Gamepad2 className="mobile-icon-lg mx-auto" />
            </div>
            <h3 className="mobile-text-lg font-semibold text-white mb-2">No games available</h3>
            <p className="text-gray-400 mobile-text-sm">Check back later for new games!</p>
          </div>
        )}

        {/* Game Modes Info */}
        <div className="mobile-card">
          <h3 className="mobile-text font-semibold text-white mb-3">Game Modes</h3>
          <div className="mobile-grid-2">
            <div className="text-center p-3 bg-gray-800 rounded-lg">
              <DollarSign className="mobile-icon text-gaming-gold mx-auto mb-2" />
              <h4 className="mobile-text font-medium text-white mb-1">Real Money</h4>
              <p className="mobile-text-sm text-gray-400">Play with real money for real rewards</p>
            </div>
            <div className="text-center p-3 bg-gray-800 rounded-lg">
              <Users className="mobile-icon text-gaming-accent mx-auto mb-2" />
              <h4 className="mobile-text font-medium text-white mb-1">Virtual Coins</h4>
              <p className="mobile-text-sm text-gray-400">Practice with virtual currency</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 