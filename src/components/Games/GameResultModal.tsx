import React, { useEffect, useState } from 'react';
import { Crown, X, Trophy, Zap } from 'lucide-react';

interface GameResultModalProps {
  isOpen: boolean;
  isWin: boolean;
  isDraw?: boolean;
  onClose: () => void;
  gameType?: string;
  playerName?: string;
  opponentName?: string;
  refundMessage?: string;
}

export function GameResultModal({ 
  isOpen, 
  isWin, 
  isDraw = false, 
  onClose, 
  gameType = 'game',
  playerName = 'You',
  opponentName = 'Opponent',
  refundMessage
}: GameResultModalProps) {
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowAnimation(true);
    } else {
      setShowAnimation(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getGameIcon = () => {
    switch (gameType) {
      case 'diamond_hunt':
        return <Trophy className="h-12 w-12 text-yellow-400" />;
      case 'tictactoe':
        return <X className="h-12 w-12 text-red-400" />;
      case 'connectfour':
        return <Trophy className="h-12 w-12 text-blue-400" />;
      case 'dice_battle':
        return <Zap className="h-12 w-12 text-purple-400" />;
      default:
        return <Crown className="h-12 w-12 text-gaming-gold" />;
    }
  };

  const getMessage = () => {
    if (isDraw) {
      return {
        title: "It's a Draw!",
        subtitle: "Great game! Both players played well.",
        color: "text-gray-400"
      };
    }
    
    if (isWin) {
      return {
        title: "Congratulations you win! 🎉",
        subtitle: "You played well and won the match!",
        color: "text-green-400"
      };
    } else {
      return {
        title: "Sorry you lost 😔",
        subtitle: "Better luck next time!",
        color: "text-red-400"
      };
    }
  };

  const message = getMessage();

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`bg-card-gradient rounded-2xl p-8 border border-gray-700 max-w-md w-full text-center transform transition-all duration-500 ${
        showAnimation ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      }`}>
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-2xl animate-pulse"></div>
        
        {/* Main content */}
        <div className="relative z-10">
          {/* Icon with animation */}
          <div className={`mb-6 transform transition-all duration-700 ${
            showAnimation ? 'scale-110 rotate-12' : 'scale-100 rotate-0'
          }`}>
            {getGameIcon()}
          </div>

          {/* Title with bounce animation */}
          <h2 className={`text-3xl font-bold mb-3 transform transition-all duration-700 ${
            showAnimation ? 'scale-105' : 'scale-100'
          } ${message.color}`}>
            {message.title}
          </h2>

          {/* Subtitle */}
          <p className="text-gray-300 mb-6 text-lg">
            {message.subtitle}
          </p>

          {/* Confetti effect for wins */}
          {isWin && !isDraw && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className={`absolute w-2 h-2 bg-yellow-400 rounded-full animate-bounce`}
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${1 + Math.random() * 2}s`
                  }}
                />
              ))}
            </div>
          )}

          {refundMessage && (
            <div className="text-center text-lg font-semibold text-green-400 my-4">
              {refundMessage}
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-gaming-accent to-blue-600 hover:opacity-90 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
} 