import React from 'react';

interface GameControlsProps {
  onNewGame: () => void;
  onSurrender: () => void;
  mode: string; // e.g. '1v1 Match', 'Practice'
  status: string; // e.g. 'playing', 'waiting', 'finished'
  timeLeft?: number; // seconds
  currentTurn: string; // e.g. 'You', 'Opponent', 'Computer'
  winCondition: string; // e.g. 'Connect 4', 'Find the diamond'
  boardSize: string; // e.g. '5x5', '6x7'
  symbols: string; // e.g. '❌⭕', '🔵🔴', '💎'
  stake?: number;
  walletMode?: string;
  showBalances?: boolean;
  realBalance?: number;
  virtualBalance?: number;
  matchId?: string | null;
  hideDetails?: boolean;
}

export const GameControls: React.FC<GameControlsProps> = ({
  onNewGame,
  onSurrender,
  mode,
  status,
  timeLeft,
  currentTurn,
  winCondition,
  boardSize,
  symbols,
  stake,
  walletMode,
  showBalances,
  realBalance,
  virtualBalance,
  matchId,
  hideDetails = false,
}) => {
  return (
    <div className="w-full max-w-lg mx-auto mb-6 px-2 sm:px-0">
      <div className="bg-gaming-dark rounded-2xl border border-gray-700 shadow-lg p-4 sm:p-6 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            onClick={onNewGame}
            className="w-full sm:w-auto px-4 sm:px-5 py-2 bg-gradient-to-r from-emerald-400 to-blue-400 text-white hover:opacity-90 transform duration-200 rounded text-xs font-semibold transition shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
          >
            New Game
          </button>
          <button
            onClick={onSurrender}
            className="w-full sm:w-auto px-4 sm:px-5 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold transition shadow-sm focus:outline-none focus:ring-2 focus:ring-red-300 text-base sm:text-base"
          >
            Surrender
          </button>
        </div>
        {!hideDetails && (
          <div className="flex flex-col gap-2 mt-2 text-sm sm:text-base">
            <div className="flex justify-between items-center flex-wrap">
              <span className="text-gray-400 text-xs sm:text-sm">Mode</span>
              <span className="text-white text-sm sm:text-base font-medium">{mode}</span>
            </div>
            <div className="flex justify-between items-center flex-wrap">
              <span className="text-gray-400 text-xs sm:text-sm">Status</span>
              <span className="text-white text-sm sm:text-base font-medium capitalize">{status}</span>
            </div>
            {typeof timeLeft === 'number' && status === 'playing' && (
              <div className="flex justify-between items-center flex-wrap">
                <span className="text-gray-400 text-xs sm:text-sm">Time Left</span>
                <span className="text-gaming-gold text-sm sm:text-base font-semibold">{timeLeft}s</span>
              </div>
            )}
            <div className="flex justify-between items-center flex-wrap">
              <span className="text-gray-400 text-xs sm:text-sm">Current Turn</span>
              <span className="text-white text-sm sm:text-base font-medium">{currentTurn}</span>
            </div>
            <div className="flex justify-between items-center flex-wrap">
              <span className="text-gray-400 text-xs sm:text-sm">Win Condition</span>
              <span className="text-gray-300 text-sm sm:text-base">{winCondition}</span>
            </div>
            <div className="flex justify-between items-center flex-wrap">
              <span className="text-gray-400 text-xs sm:text-sm">Board Size</span>
              <span className="text-gray-300 text-sm sm:text-base">{boardSize}</span>
            </div>
            <div className="flex justify-between items-center flex-wrap">
              <span className="text-gray-400 text-xs sm:text-sm">Symbols</span>
              <span className="text-yellow-400 text-lg sm:text-lg">{symbols}</span>
            </div>
            {typeof stake === 'number' && (
              <div className="flex justify-between items-center flex-wrap">
                <span className="text-gray-400 text-xs sm:text-sm">Stake</span>
                <span className="text-white text-sm sm:text-base font-medium">{stake} {walletMode ? `(${walletMode})` : ''}</span>
              </div>
            )}
            {showBalances && (
              <div className="flex flex-col gap-1 items-end sm:items-end">
                <span className="text-gray-400 text-xs sm:text-sm">Balances</span>
                <span className="text-white text-xs sm:text-sm">Real: <span className="font-semibold">{realBalance ?? 0}</span></span>
                <span className="text-white text-xs sm:text-sm">Virtual: <span className="font-semibold">{virtualBalance ?? 0}</span></span>
              </div>
            )}
            {matchId && (
              <div className="flex justify-between items-center flex-wrap">
                <span className="text-gray-400 text-xs sm:text-sm">Match ID</span>
                <span className="text-white text-sm sm:text-base font-medium">{matchId.slice(-8)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}; 