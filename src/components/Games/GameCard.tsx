import React from 'react';
import { Game } from '../../types';
import { Gamepad2, Zap, Dice6, Grid3X3, Users, DollarSign, Clock } from 'lucide-react';

interface GameCardProps {
  game: Game;
  onPlay: (gameId: string) => void;
}

const iconMap = {
  Gamepad2,
  Zap,
  Dice6,
  Grid3X3
};

export function GameCard({ game, onPlay }: GameCardProps) {
  const IconComponent = iconMap[game.icon as keyof typeof iconMap] || Gamepad2;

  return (
    <div className="card-mobile hover:border-gaming-accent transition-all duration-300 hover:shadow-lg hover:shadow-gaming-accent/20 group cursor-pointer">
      <div className="flex items-center space-x-3 mb-3">
        <div className="p-2 sm:p-3 bg-gaming-accent/20 rounded-lg group-hover:bg-gaming-accent/30 transition-colors">
          <IconComponent className="h-4 w-4 sm:h-5 sm:w-5 text-gaming-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-sm sm:text-base truncate">{game.name}</h3>
          <p className="text-gaming-gold text-xs sm:text-sm font-medium">${game.minBet}-${game.maxBet} betting</p>
        </div>
      </div>
      
      <p className="text-gray-300 text-xs sm:text-sm mb-3 line-clamp-2">{game.description}</p>
      
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Users className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
          <span className="text-gray-400 text-xs sm:text-sm">{game.players}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
          <span className="text-gray-400 text-xs sm:text-sm">{game.duration}</span>
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
        onClick={() => onPlay(game.id)}
        className="w-full btn-mobile bg-gradient-to-r from-emerald-400 to-blue-400 text-white hover:opacity-90 group-hover:scale-105 transform duration-200"
      >
        Play 1v1
      </button>
    </div>
  );
}