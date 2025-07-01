// import React from 'react';
import { useState, useEffect } from 'react';
import { useWalletMode } from '../../contexts/WalletModeContext';
import { useMatchmaking } from '../../hooks/useMatchmaking';
import { Users, Clock, X, Gamepad2, Zap, DollarSign, Loader2 } from 'lucide-react';
import { useToast } from '../UI/Toast';

interface MatchmakingWaitingRoomProps {
  gameType: 'connect_four' | 'tic_tac_toe' | 'dice_battle' | 'diamond_hunt' | 'chess';
  stakeAmount: number;
  onMatchFound: (matchId: string) => void;
  onCancel: () => void;
}

declare global {
  interface Window {
    socket?: any;
  }
}

export function MatchmakingWaitingRoom({ gameType, stakeAmount, onMatchFound, onCancel }: MatchmakingWaitingRoomProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <Loader2 className="animate-spin text-blue-400 w-16 h-16 mb-6" />
      <h2 className="text-2xl font-bold text-white mb-2">Waiting for Opponent...</h2>
      <p className="text-gray-300 mb-4 text-center max-w-md">
        You have joined the matchmaking queue for <span className="font-semibold text-blue-300">{gameType === 'chess' ? 'Chess' : gameType}</span> with a stake of <span className="font-semibold text-green-300">${stakeAmount}</span>.<br/>
        As soon as another player joins with the same settings, your game will start automatically.
      </p>
      <button
        onClick={onCancel}
        className="mt-4 px-6 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold shadow-lg transition-all duration-200"
      >
        Cancel and Go Back
      </button>
    </div>
  );
} 