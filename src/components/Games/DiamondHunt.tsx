import React, { useState, useEffect } from 'react';
import { Gem, RotateCcw, Clock, Users, User, Crown, DollarSign, Gamepad2, Trophy, Target, Zap, Info } from 'lucide-react';
import { GameBetModal } from './GameBetModal';
import { GameResultModal } from './GameResultModal';
import { useAuth } from '../../contexts/AuthContext';
import { useWalletMode } from '../../contexts/WalletModeContext';
import { GameAPI } from '../../services/gameAPI';
import { MatchmakingWaitingRoom } from './MatchmakingWaitingRoom';
import { getSocket, testSocket } from '../../utils/socket';
import { GameControls } from '../UI/GameControls';
import { getGameId } from '../../utils/gameId';
import { MatchChat } from './MatchChat';

interface DiamondHuntProps {
  onGameEnd?: (result: { winner: string; stake: number; result: string }) => void;
}

export function DiamondHunt({ onGameEnd }: DiamondHuntProps) {
  const { user } = useAuth();
  const { walletMode } = useWalletMode();
  const [gameStatus, setGameStatus] = useState<'menu' | 'waiting' | 'playing' | 'finished'>('menu');
  const [grid, setGrid] = useState<boolean[][]>([]);
  const [revealed, setRevealed] = useState<boolean[][]>([]);
  const [diamondPosition, setDiamondPosition] = useState<{ row: number; col: number } | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<'player' | 'opponent'>('player');
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null);
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [turnTimer, setTurnTimer] = useState(30);
  const [currentStake, setCurrentStake] = useState(0);
  const [showBetModal, setShowBetModal] = useState(false);
  const [isInWaitingRoom, setIsInWaitingRoom] = useState(false);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [userBalances, setUserBalances] = useState({ real_balance: 0, virtual_balance: 0 });
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ row: number; col: number } | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [lastOpponentMove, setLastOpponentMove] = useState<{ row: number; col: number } | null>(null);
  const [pendingWinnerId, setPendingWinnerId] = useState<string | null>(null);
  const [resultModalData, setResultModalData] = useState<{ isWin: boolean; isDraw: boolean }>({ isWin: false, isDraw: false });
  const [showRules, setShowRules] = useState(false);
  const [rules, setRules] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    function onGameStart(data: { matchId: string; opponentId: string; yourTurn: boolean; stake: number; timeLimit: number; diamondPosition?: { row: number; col: number } }) {
      setCurrentMatchId(data.matchId);
      setOpponentId(data.opponentId);
      setIsMyTurn(data.yourTurn);
      setCurrentStake(data.stake);
      setGameStatus('playing');
      setShowBetModal(false);
      setIsInWaitingRoom(false);
      setTurnTimer(data.timeLimit);
      setIsPracticeMode(false);
      if (data.diamondPosition) {
        initializeGame(data.diamondPosition);
      } else {
        initializeGame(undefined);
      }
    }
    function onYourTurn(data: { matchId: string; move: any; gameType: string; board: any; opponentId: string; revealed?: boolean[][]; yourTurn?: boolean; currentTurnPlayerId?: string }) {
      if (data.matchId === currentMatchId) {
        if (typeof data.yourTurn === 'boolean') {
          setIsMyTurn(data.yourTurn);
        } else if (data.currentTurnPlayerId && user?.id) {
          setIsMyTurn(data.currentTurnPlayerId === user.id);
        } else {
          setIsMyTurn(true);
        }
        setTurnTimer(30);
        setGameStatus('playing');
        if ('revealed' in data && data.revealed) setRevealed(data.revealed);
      }
    }
    function onMoveMade(data: { matchId: string; move: any; gameType: string; board: any; opponentId: string; revealed?: boolean[][]; currentTurnPlayerId?: string }) {
      if (data.matchId !== currentMatchId) return;
      if ('revealed' in data && data.revealed) setRevealed(data.revealed);
      if (data.currentTurnPlayerId && user?.id) {
        setIsMyTurn(data.currentTurnPlayerId === user.id);
      } else if (data.opponentId !== user?.id) {
        setIsMyTurn(false);
      }
    }
    function onGameOver(data: { matchId: string; winner?: string; winnerId?: string; gameType: string; result: string; opponentId: string }) {
      if (data.matchId === currentMatchId) {
        setGameOver(true);
        setGameStatus('finished');
        setIsMyTurn(false);
        loadUserBalances();
        const winner = data.winner || data.winnerId;
        if (winner === user?.id) {
          setResultModalData({ isWin: true, isDraw: false });
        } else if (winner === 'draw') {
          setResultModalData({ isWin: false, isDraw: true });
        } else {
          setResultModalData({ isWin: false, isDraw: false });
        }
        setShowResultModal(true);
      }
    }
    function onError(data: any) {
      alert(`Error: ${data.message}`);
    }
    function onOpponentMove(data: { matchId: string; move: any; board: boolean[][]; lastMoveBy: string }) {
      if (data.matchId !== currentMatchId) return;
      if (Array.isArray(data.board) && Array.isArray(data.board[0]) && typeof data.board[0][0] === 'boolean') {
        setRevealed(data.board);
        setLastOpponentMove(data.move);
      }
    }
    function onMatchEnded(data: { matchId: string; winner?: string; winnerId?: string }) {
      if (data.matchId !== currentMatchId) return;
      setGameOver(true);
      setGameStatus('finished');
      setIsMyTurn(false);
      const winner = data.winner || data.winnerId;
      if (user?.id === winner) {
        setResultModalData({ isWin: true, isDraw: false });
      } else if (winner === 'draw') {
        setResultModalData({ isWin: false, isDraw: true });
      } else {
        setResultModalData({ isWin: false, isDraw: false });
      }
      setShowResultModal(true);
    }
    if (socket) {
      socket.on('gameStart', onGameStart);
      socket.on('yourTurn', onYourTurn);
      socket.on('moveMade', onMoveMade);
      socket.on('gameOver', onGameOver);
      socket.on('error', onError);
      socket.on('opponentMove', onOpponentMove);
      socket.on('matchEnded', onMatchEnded);
    }
    return () => {
      if (socket) {
        socket.off('gameStart', onGameStart);
        socket.off('yourTurn', onYourTurn);
        socket.off('moveMade', onMoveMade);
        socket.off('gameOver', onGameOver);
        socket.off('error', onError);
        socket.off('opponentMove', onOpponentMove);
        socket.off('matchEnded', onMatchEnded);
      }
    };
  }, [currentMatchId, user?.id]);

  useEffect(() => {
    console.log('⏰ DiamondHunt Timer effect:', { gameStatus, isMyTurn, gameOver, turnTimer });
    
    // STOP TIMER IMMEDIATELY IF GAME IS OVER
    if (gameOver || gameStatus !== 'playing') {
      console.log('⏰ DiamondHunt Timer stopped: Game over or not playing');
      return;
    }
    
    if (gameStatus === 'playing' && isMyTurn && !gameOver && turnTimer > 0) {
      console.log('⏰ DiamondHunt Starting timer countdown');
      const timer = setInterval(() => {
        setTurnTimer(prev => {
          if (prev <= 1) {
            console.log('⏰ DiamondHunt Turn timer expired! Player loses due to timeout.');
            handleGameEnd(opponentId || '', 'player_timeout');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => {
        console.log('⏰ DiamondHunt Clearing timer');
        clearInterval(timer);
      };
    }
  }, [gameStatus, isMyTurn, gameOver, opponentId]); // REMOVED turnTimer FROM DEPENDENCIES

  const handleOpponentMove = (move: { row: number; col: number }) => {
    const { row, col } = move;
    console.log('📥 Processing opponent move:', { row, col });
    
    setRevealed(prev => {
      const newRevealed = [...prev];
      newRevealed[row][col] = true;
      return newRevealed;
    });
    
    if (diamondPosition && row === diamondPosition.row && col === diamondPosition.col) {
      console.log('💎 Opponent found the diamond!');
      handleGameEnd(opponentId!, 'opponent_found_diamond');
    } else {
      console.log('📍 Opponent clicked empty cell');
    }
  };

  const handleGameEnd = (winnerId: string, result: string) => {
    if (gameOver) return;
    setGameOver(true);
    setWinner(winnerId);
    setGameStatus('finished');
    setIsMyTurn(false);
    const socket = getSocket();
    if (socket && currentMatchId) {
      socket.emit('gameEnd', {
        matchId: currentMatchId,
        winner: winnerId,
        gameType: 'diamond_hunt',
        result,
        opponentId
      });
    }
    if (onGameEnd) {
      onGameEnd({
        winner: winnerId,
        stake: currentStake,
        result
      });
    }
  };

  useEffect(() => {
    if (gameOver || gameStatus === 'finished') {
      loadUserBalances();
    }
  }, [gameOver, gameStatus]);

  const handleCellClick = (row: number, col: number) => {
    if (gameStatus !== 'playing' || gameOver || revealed[row][col]) return;
    if (!isPracticeMode) {
      if (!isMyTurn) {
        alert('Not your turn!');
        return;
      }
      setRevealed(prev => {
        const newRevealed = prev.map(rowArr => [...rowArr]);
        newRevealed[row][col] = true;
        return newRevealed;
      });
      setPendingMove({ row, col });
      setIsMyTurn(false);
      const socket = getSocket();
      if (socket && currentMatchId) {
        socket.emit('makeMove', {
          matchId: currentMatchId,
          move: { row, col },
          gameType: 'diamond_hunt'
        });
      }
      return;
    }
    const newRevealed = [...revealed];
    newRevealed[row][col] = true;
    setRevealed(newRevealed);
    if (grid[row][col]) {
      setGameOver(true);
      setWinner(user?.id || '');
      handleGameEnd(user?.id || '', 'player_won');
    } else {
      setCurrentPlayer('opponent');
      setTimeout(() => {
        const availableCells = [];
        for (let r = 0; r < 5; r++) {
          for (let c = 0; c < 5; c++) {
            if (!newRevealed[r][c]) {
              availableCells.push({ row: r, col: c });
            }
          }
        }
        if (availableCells.length > 0) {
          const randomCell = availableCells[Math.floor(Math.random() * availableCells.length)];
          const aiRevealed = [...newRevealed];
          aiRevealed[randomCell.row][randomCell.col] = true;
          setRevealed(aiRevealed);
          if (grid[randomCell.row][randomCell.col]) {
            setGameOver(true);
            setWinner('opponent');
            handleGameEnd('opponent', 'opponent_won');
          } else {
            setCurrentPlayer('player');
          }
        }
      }, 1000);
    }
  };

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    function onError(data: any) {
      if (pendingMove) {
        setRevealed(prev => {
          const newRevealed = prev.map(rowArr => [...rowArr]);
          newRevealed[pendingMove.row][pendingMove.col] = false;
          return newRevealed;
        });
        setPendingMove(null);
        setIsMyTurn(true);
      }
      alert(data.message || 'Error');
    }
    if (socket) {
      socket.on('error', onError);
      return () => { socket.off('error', onError); };
    }
  }, [pendingMove]);

  useEffect(() => {
    if (gameStatus === 'playing' && isMyTurn && turnTimer > 0) {
      const timer = setInterval(() => {
        setTurnTimer(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleGameEnd(opponentId || '', 'player_timeout');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameStatus, isMyTurn, turnTimer, opponentId]);

  const resetGame = () => {
    setGrid([]);
    setRevealed([]);
    setDiamondPosition(null);
    setCurrentPlayer('player');
    setGameOver(false);
    setWinner(null);
    setTimeLeft(30);
    setGameStatus('menu');
    setCurrentMatchId(null);
    setOpponentId(null);
    setIsMyTurn(false);
    setTurnTimer(30);
  };

  const loadUserBalances = async () => {
    setLoadingBalances(true);
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/api/wallet/balance', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUserBalances(data.data);
        setLoadingBalances(false);
        return data.data;
      }
    } catch (error) {
      setLoadingBalances(false);
    }
    setLoadingBalances(false);
    return { real_balance: 0, virtual_balance: 0 };
  };

  const handlePlayGame = async () => {
    const freshBalances = await loadUserBalances();
    if (freshBalances) {
      setShowBetModal(true);
    } else {
      alert('Failed to load wallet balances. Please try again.');
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadUserBalances();
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadUserBalances();
    }
  }, [walletMode, user?.id]);

  const handleSurrender = () => {
    if (gameOver || gameStatus !== 'playing') return;
    
    const socket = getSocket();
    if (socket && currentMatchId) {
      socket.emit('gameEnd', {
        matchId: currentMatchId,
        winner: opponentId || '',
        gameType: 'diamond_hunt',
        result: 'player_surrendered',
        opponentId
      });
    }
    
    handleGameEnd(opponentId || '', 'player_surrendered');
  };

  const handleWaitingRoomCancel = () => {
    const socket = getSocket();
    if (socket) {
      socket.emit('cancelQueue');
    }
    setGameStatus('menu');
    setIsInWaitingRoom(false);
  };

  const handleBetConfirmed = (stakeAmount: number) => {
    setCurrentStake(stakeAmount);
    setGameStatus('waiting');
    setIsInWaitingRoom(true);
    setShowBetModal(false);
    
    const isConnected = testSocket();
    console.log('🔍 Socket connected before joinQueue:', isConnected);
    
    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('joinQueue', {
        gameId: getGameId('diamond-hunt'),
        walletMode,
        stake: stakeAmount
      });
      console.log('✅ Sent joinQueue', { gameId: getGameId('diamond-hunt'), walletMode, stake: stakeAmount });
    } else {
      console.error('❌ Socket not connected, cannot join queue');
      alert('Connection error. Please refresh the page and try again.');
      setGameStatus('menu');
    }
  };

  const handlePracticeMode = () => {
    setIsPracticeMode(true);
    setGameStatus('waiting');
    setTimeout(() => {
      setGameStatus('playing');
      setIsMyTurn(true);
      initializeGame();
    }, 2000);
  };

  const initializeGame = (serverDiamondPosition?: { row: number; col: number }) => {
    const newGrid = Array(5).fill(null).map(() => Array(5).fill(false));
    const newRevealed = Array(5).fill(null).map(() => Array(5).fill(false));
    if (serverDiamondPosition) {
      newGrid[serverDiamondPosition.row][serverDiamondPosition.col] = true;
      setDiamondPosition({ row: serverDiamondPosition.row, col: serverDiamondPosition.col });
    } else {
      setDiamondPosition(null);
    }
    setGrid(newGrid);
    setRevealed(newRevealed);
  };

  const getCellClass = (row: number, col: number) => {
    if (!revealed[row]?.[col]) {
      if (gameStatus === 'playing' && !isMyTurn && !isPracticeMode) {
        return 'bg-neutral-900 border-neutral-600 opacity-50 cursor-not-allowed';
      }
      return 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700 cursor-pointer';
    }
    if (grid[row]?.[col] && (gameOver || revealed[row][col])) {
      return 'bg-yellow-900 border-yellow-400';
    }
    return 'bg-gray-900 border-gray-700';
  };

  const renderTurnOverlay = () => {
    if (!isMyTurn && gameStatus === 'playing' && !isPracticeMode && !gameOver) {
      return (
        <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center z-20">
          <Users className="h-10 w-10 text-red-400 mb-4 animate-bounce" />
          <span className="text-white text-xl font-bold">Waiting for opponent...</span>
        </div>
      );
    }
    return null;
  };

  useEffect(() => {
    if (pendingMove) {
      setPendingMove(null);
    }
  }, [revealed]);

  const gameResultModal = showResultModal ? (
    <GameResultModal
      isOpen={showResultModal}
      isWin={resultModalData.isWin}
      isDraw={resultModalData.isDraw}
      onClose={() => setShowResultModal(false)}
      gameType="diamond_hunt"
    />
  ) : null;

  useEffect(() => {
    if (pendingWinnerId && user?.id) {
      if (user.id === pendingWinnerId) {
        setResultMessage('🎉 You win!');
      } else {
        setResultMessage('😞 You lost.');
      }
      setPendingWinnerId(null);
    }
  }, [pendingWinnerId, user?.id]);

  useEffect(() => {
    if (showRules) {
      fetch('/api/game-rules/diamond_hunt')
        .then(res => res.json())
        .then(data => setRules(data.rules_en || 'No rules found.'));
    }
  }, [showRules]);

  if (gameStatus === 'menu') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-card-gradient rounded-xl p-6 border border-gray-700">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center justify-center">
              <Gem className="h-8 w-8 mr-3 text-gaming-accent" />
              Diamond Hunt
            </h2>
            <p className="text-gray-300 text-lg mb-6">
              Find the hidden diamond before your opponent does!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="card-mobile text-center">
              <DollarSign className="h-12 w-12 text-gaming-gold mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Play 1v1 for Money</h3>
              <p className="text-gray-400 mb-4 text-sm">Challenge other players and bet real money. Winner takes 90% of the pot!</p>
              <button
                onClick={handlePlayGame}
                disabled={loadingBalances}
                className="w-full btn-mobile bg-gradient-to-r from-emerald-400 to-blue-400 text-white hover:opacity-90 transform duration-200 rounded text-xs relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}
              >
                {loadingBalances ? 'Loading...' : 'Play 1v1 (Virtual Coins)'}
              </button>
            </div>

            <div className="card-mobile text-center">
              <Users className="h-12 w-12 text-gaming-accent mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Practice Mode</h3>
              <p className="text-gray-400 mb-4 text-sm">Play against computer AI to practice your skills without betting.</p>
              <button
                onClick={handlePracticeMode}
                className="w-full btn-mobile bg-gradient-to-r from-red-300 to-yellow-200 hover:from-red-200 hover:to-yellow-100 text-gray-800 font-semibold relative overflow-hidden group hover:-translate-y-1 transition-all duration-300"
                style={{
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-red-400/5 via-orange-400/5 to-yellow-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
                
                <div className="absolute inset-0 bg-gradient-to-r from-red-400/10 via-orange-400/10 to-yellow-400/10 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-lg blur-sm scale-110 group-hover:scale-125"></div>
                
                <div className="absolute inset-1 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-md"></div>
                
                <div className="relative z-10 group-hover:scale-105 transition-all duration-300">
                  Practice vs Computer
                </div>
                
                <div className="absolute -bottom-1 left-1 right-1 h-1 bg-black/20 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
              </button>
            </div>
          </div>

          <div className="mt-8 p-4 bg-gaming-dark rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-3">How to Play</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
              <div>
                <h4 className="font-semibold text-gaming-accent mb-1">1. Find the Diamond</h4>
                <p>One diamond is hidden in the 5x5 grid</p>
              </div>
              <div>
                <h4 className="font-semibold text-gaming-accent mb-1">2. Take Turns</h4>
                <p>Players take turns clicking tiles, 30 seconds per turn</p>
              </div>
              <div>
                <h4 className="font-semibold text-gaming-accent mb-1">3. Win the Game</h4>
                <p>First player to find the diamond wins!</p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-red-900/20 border border-red-700/30 rounded-lg">
              <p className="text-sm text-red-300">
                <strong>⚠️ Important:</strong> Each click counts as one turn. If you don't click within 30 seconds, you lose automatically!
              </p>
            </div>
          </div>
        </div>

        {showBetModal && user && (
          <GameBetModal
            open={showBetModal}
            onClose={() => setShowBetModal(false)}
            onConfirm={handleBetConfirmed}
            gameType="diamond_hunt"
            userId={user.id}
            username={user.username}
            onBetConfirmed={handleBetConfirmed}
            userBalances={userBalances}
          />
        )}
      </div>
    );
  }

  if (gameStatus === 'waiting') {
    return (
      <MatchmakingWaitingRoom
        gameType="diamond_hunt"
        stakeAmount={currentStake}
        onMatchFound={(matchId: string) => {
          setIsInWaitingRoom(false);
          setCurrentMatchId(matchId);
        }}
        onCancel={handleWaitingRoomCancel}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-card-gradient rounded-xl p-6 border border-gray-700 relative">
        {renderTurnOverlay()}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <Gem className="h-6 w-6 mr-2 text-gaming-accent" />
            Diamond Hunt
            {currentMatchId && (
              <span className="ml-2 text-sm text-gaming-gold">Match #{currentMatchId.slice(-8)}</span>
            )}
          </h2>
          <div className="flex items-center space-x-4">
            {isMyTurn && gameStatus === 'playing' && (
              <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                turnTimer <= 10 ? 'bg-red-900/50 border border-red-500' : 'bg-gaming-dark'
              }`}>
                <Clock className={`h-4 w-4 ${turnTimer <= 10 ? 'text-red-400' : 'text-gaming-gold'}`} />
                <span className={`font-semibold ${turnTimer <= 10 ? 'text-red-400' : 'text-white'}`}>
                  {turnTimer}s
                </span>
              </div>
            )}
            <button
              className="p-2 rounded-full bg-gray-800 hover:bg-blue-500 transition-colors"
              title="Regleman Jwèt la"
              onClick={() => setShowRules(true)}
            >
              <Info className="h-6 w-6 text-white" />
            </button>
          </div>
        </div>
        
        <div className="mb-6 text-center">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-gaming-dark text-white font-bold shadow border border-gray-700">
            {isMyTurn ? (
              <User className="h-5 w-5 text-green-400 mr-2" />
            ) : (
              <Users className="h-5 w-5 text-red-400 mr-2" />
            )}
            <span className="text-lg">
              {isMyTurn ? 'Your Turn' : 'Opponent Turn'}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          <div className="lg:col-span-3 flex flex-col items-center justify-center min-h-[400px] py-8">
            <div className="w-full max-w-xs sm:max-w-sm md:max-w-md mx-auto p-4 rounded-2xl bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 border border-gray-700 shadow-2xl relative">
              <div className="grid grid-cols-5 gap-2">
                {Array(5).fill(null).map((_, rowIndex) =>
                  Array(5).fill(null).map((_, colIndex) => (
                    <button
                      key={`${rowIndex}-${colIndex}`}
                      onClick={() => handleCellClick(rowIndex, colIndex)}
                      disabled={gameOver || revealed[rowIndex]?.[colIndex] || gameStatus !== 'playing' || (!isMyTurn && !isPracticeMode)}
                      className={`diamond-cell aspect-square w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-lg flex items-center justify-center text-2xl font-bold border-2 border-gray-800 bg-gray-900 shadow-inner transition-all duration-100 ${getCellClass(rowIndex, colIndex)} ${
                        gameStatus === 'playing' && !isMyTurn && !isPracticeMode ? 'opacity-50 cursor-not-allowed' : ''
                      } ${pendingMove && pendingMove.row === rowIndex && pendingMove.col === colIndex ? 'ring-4 ring-yellow-400 animate-pulse' : ''}`}
                      style={{
                        boxShadow: 'inset 0 2px 8px 0 #111827, 0 1.5px 0 0 #374151',
                        color: revealed[rowIndex]?.[colIndex] && grid[rowIndex][colIndex] ? '#444' : '#888',
                        background: revealed[rowIndex]?.[colIndex] && grid[rowIndex][colIndex] ? 'linear-gradient(145deg, #facc15 60%, #fde68a 100%)' : undefined,
                      }}
                    >
                      {revealed[rowIndex]?.[colIndex] && grid[rowIndex][colIndex] && (
                        <span className="text-yellow-700 text-3xl">💎</span>
                      )}
                      {revealed[rowIndex]?.[colIndex] && !grid[rowIndex][colIndex] && (
                        <span className="w-3 h-3 rounded-full bg-white inline-block"></span>
                      )}
                      {pendingMove && pendingMove.row === rowIndex && pendingMove.col === colIndex && (
                        <span className="absolute inset-0 flex items-center justify-center"><svg className="animate-spin h-6 w-6 text-yellow-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg></span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
        <GameControls
          onNewGame={resetGame}
          onSurrender={handleSurrender}
          mode={isPracticeMode ? 'Practice' : '1v1 Match'}
          status={gameStatus}
          timeLeft={turnTimer}
          currentTurn={isPracticeMode ? (isMyTurn ? 'You' : 'Computer') : (isMyTurn ? 'You' : 'Opponent')}
          winCondition={"Find the diamond"}
          boardSize={"5x5"}
          symbols={"💎"}
          stake={currentStake}
          walletMode={walletMode}
          showBalances={true}
          realBalance={userBalances.real_balance}
          virtualBalance={userBalances.virtual_balance}
          matchId={currentMatchId}
        />
      </div>

      {gameResultModal}

      {showRules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full shadow-2xl border border-blue-500 relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-red-400 text-xl"
              onClick={() => setShowRules(false)}
              aria-label="Fèmen"
            >
              ×
            </button>
            <h2 className="text-2xl font-bold text-blue-400 mb-4 flex items-center"><Info className="h-6 w-6 mr-2" />Game Rules</h2>
            <pre className="text-gray-200 whitespace-pre-wrap text-base">{rules}</pre>
          </div>
        </div>
      )}

      <MatchChat
        matchId={currentMatchId || ''}
        currentUserId={user?.id || ''}
        currentUsername={user?.username || ''}
        opponentName={opponentId || ''}
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen((v) => !v)}
      />
    </div>
  );
}