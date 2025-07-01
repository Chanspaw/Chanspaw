import { useState, useEffect } from 'react';

interface MatchmakingStatus {
  inQueue: boolean;
  gameType?: string;
  stakeAmount?: number;
  matchType?: string;
  position?: number;
  totalWaiting?: number;
  joinedAt?: string;
}

interface UseMatchmakingReturn {
  isInQueue: boolean;
  queueStatus: MatchmakingStatus | null;
  currentStake: number;
  checkStatus: () => Promise<void>;
  joinQueue: (gameType: string, stakeAmount: number, matchType: string) => Promise<{ success: boolean; matchFound?: boolean; matchId?: string; error?: string }>;
  leaveQueue: () => Promise<{ success: boolean; error?: string }>;
}

export function useMatchmaking(): UseMatchmakingReturn {
  const [isInQueue, setIsInQueue] = useState(false);
  const [queueStatus, setQueueStatus] = useState<MatchmakingStatus | null>(null);
  const [currentStake, setCurrentStake] = useState(0);

  // Socket.io instance
  const socket = (window as any).socket;

  // Listen for queue status updates (optional)
  useEffect(() => {
    if (!socket) return;
    const handleQueueStats = (stats: any) => {
      // Optionally update queueStatus with stats
    };
    socket.on('queueStats', handleQueueStats);
    return () => {
      socket.off('queueStats', handleQueueStats);
    };
  }, [socket]);

  const checkStatus = async () => {
    // No REST call; rely on local state
    // Optionally, you could emit a socket event to get status
  };

  const joinQueue = async (gameType: string, stakeAmount: number, matchType: string) => {
    return new Promise<{ success: boolean; matchFound?: boolean; matchId?: string; error?: string }>((resolve) => {
      if (!socket) return resolve({ success: false, error: 'Socket not connected' });
      setIsInQueue(true);
      setCurrentStake(stakeAmount);
      setQueueStatus({ inQueue: true, gameType, stakeAmount, matchType });
      // Listen for matchFound event ONCE
      const handleMatchFound = (data: any) => {
        setIsInQueue(false);
        setQueueStatus(null);
        resolve({ success: true, matchFound: true, matchId: data.matchId });
        socket.off('matchFound', handleMatchFound);
      };
      socket.once('matchFound', handleMatchFound);
      socket.emit('joinQueue', {
        stake: stakeAmount,
        walletMode: matchType,
        gameId: gameType
      });
    });
  };

  const leaveQueue = async () => {
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      if (!socket) return resolve({ success: false, error: 'Socket not connected' });
      socket.emit('cancelQueue');
      setIsInQueue(false);
      setQueueStatus(null);
      setCurrentStake(0);
      resolve({ success: true });
    });
  };

  return {
    isInQueue,
    queueStatus,
    currentStake,
    checkStatus,
    joinQueue,
    leaveQueue
  };
} 