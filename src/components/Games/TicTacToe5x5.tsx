import React, { useState, useEffect } from 'react';
import { X, Circle, RotateCcw, Clock, Users, User, Crown, DollarSign, Info } from 'lucide-react';
import { GameBetModal } from './GameBetModal';
import { GameResultModal } from './GameResultModal';
import { useAuth } from '../../contexts/AuthContext';
import { useWalletMode } from '../../contexts/WalletModeContext';
import { GameAPI } from '../../services/gameAPI';
import { Gamepad2, Trophy, Target, Zap } from 'lucide-react';
import { MatchmakingWaitingRoom } from './MatchmakingWaitingRoom';
import { getSocket, testSocket } from '../../utils/socket';
import { GameControls } from '../UI/GameControls';
import { getGameId } from '../../utils/gameId';
import { MatchChat } from './MatchChat';

interface TicTacToe5x5Props {
  onGameEnd?: (winner: string) => void;
  matchId?: string;
}

// Helper to convert 1D board to 2D 5x5
function to2DBoard(board: any): (string | null)[][] {
  if (Array.isArray(board) && board.length === 25 && !Array.isArray(board[0])) {
    return Array.from({ length: 5 }, (_, i) => board.slice(i * 5, i * 5 + 5));
  }
  return board;
}

export function TicTacToe5x5({ onGameEnd, matchId }: TicTacToe5x5Props) {
  const { user } = useAuth();
  const { walletMode } = useWalletMode();
  const GAME_ID = 'tictactoe5x5';
  const [board, setBoard] = useState<(string | null)[][]>(
    Array(5).fill(null).map(() => Array(5).fill(null))
  );
  const [currentPlayer, setCurrentPlayer] = useState<'X' | 'O'>('X');
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameStatus, setGameStatus] = useState<'menu' | 'waiting' | 'playing' | 'finished'>('menu');
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(matchId || null);
  const [currentStake, setCurrentStake] = useState(0);
  const [isInWaitingRoom, setIsInWaitingRoom] = useState(false);
  const [showBetModal, setShowBetModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultModalData, setResultModalData] = useState<{ isWin: boolean; isDraw: boolean }>({ isWin: false, isDraw: false });
  const [gameResult, setGameResult] = useState<{ winner: string; amount: number; matchId: string } | null>(null);
  const [userBalances, setUserBalances] = useState<{ real_balance: number; virtual_balance: number }>({ real_balance: 0, virtual_balance: 0 });
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [computerShouldMove, setComputerShouldMove] = useState(false);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [turnTimer, setTurnTimer] = useState(30);
  const [practiceTurn, setPracticeTurn] = useState<'X' | 'O'>('X');
  const [showRules, setShowRules] = useState(false);
  const [rules, setRules] = useState('');
  const [resultModalShown, setResultModalShown] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  console.log('RENDER TicTacToe5x5:', { gameStatus, board, isPracticeMode });

  useEffect(() => {
    if (user?.id) {
      loadUserBalances();
    }
  }, [user?.id]);

  // Reload balances when wallet mode changes
  useEffect(() => {
    if (user?.id) {
      loadUserBalances();
    }
  }, [walletMode, user?.id]);

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
    console.log('🎮 Starting game, current balances:', userBalances);
    console.log('🎮 Current wallet mode:', walletMode);
    
    // Load fresh balances before showing modal
    const freshBalances = await loadUserBalances();
    console.log('🎮 Fresh balances loaded:', freshBalances);
    
    // Only show modal if balances loaded successfully
    if (freshBalances) {
      setShowBetModal(true);
    } else {
      alert('Failed to load wallet balances. Please try again.');
    }
  };

  // Listen for matchFound event
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    
    const onMatchFound = (data: any) => {
      setCurrentMatchId(data.matchId);
      setGameStatus('playing');
      setShowBetModal(false);
      initializeGame();
    };
    
    socket.on('matchFound', onMatchFound);
    return () => {
      socket.off('matchFound', onMatchFound);
    };
  }, []);

  const handleBetConfirmed = (stakeAmount: number) => {
    setCurrentStake(stakeAmount);
    setGameStatus('waiting');
    setIsInWaitingRoom(true);
    setShowBetModal(false);
    const isConnected = testSocket();
    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('joinQueue', {
        stake: stakeAmount,
        walletMode,
        gameId: 'tictactoe5x5',
      });
      console.log('✅ Sent joinQueue', { stake: stakeAmount, walletMode, gameId: 'tictactoe5x5' });
    } else {
      console.error('❌ Socket not connected, cannot join queue');
      alert('Connection error. Please refresh the page and try again.');
      setGameStatus('menu');
      setIsInWaitingRoom(false);
    }
  };

  const handleWaitingRoomCancel = () => {
    const socket = getSocket();
    if (socket) {
      socket.emit('cancelQueue');
      console.log('Sent cancelQueue');
    }
    setGameStatus('menu');
    setIsInWaitingRoom(false);
    setCurrentStake(0);
  };

  const handlePracticeMode = () => {
    setIsPracticeMode(true);
    setGameStatus('waiting');
    setPracticeTurn('X');
    setBoard(Array(5).fill(null).map(() => Array(5).fill(null)));
    setGameOver(false);
    setWinner(null);
    setTimeLeft(30);
    setTurnTimer(30);
    setShowResultModal(false);
    setResultModalData({ isWin: false, isDraw: false });
    setTimeout(() => {
      setGameStatus('playing');
      initializeGame();
      setPracticeTurn('X');
    }, 2000);
  };

  const initializeGame = () => {
    const newBoard = Array(5).fill(null).map(() => Array(5).fill(null));
    setBoard(newBoard);
    setCurrentPlayer('X');
    setGameOver(false);
    setWinner(null);
    setTimeLeft(30);
  };

  useEffect(() => {
    if (gameStatus === 'waiting' && isPracticeMode) {
      const timer = setTimeout(() => {
        setGameStatus('playing');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [gameStatus, isPracticeMode]);

  // Listen for gameStart event
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    
    function onGameStart(data: { matchId: string; opponentId: string; yourTurn: boolean; gameId: string; stake: number; walletMode: string; timeLimit: number; currentTurnPlayerId?: string }) {
      setCurrentMatchId(data.matchId);
      setOpponentId(data.opponentId);
      if (typeof data.yourTurn === 'boolean') {
        setIsMyTurn(data.yourTurn);
      } else if (data.currentTurnPlayerId && user?.id) {
        setIsMyTurn(data.currentTurnPlayerId === user.id);
      } else {
        setIsMyTurn(true);
      }
      setCurrentStake(data.stake);
      setGameStatus('playing');
      setShowBetModal(false);
      setIsInWaitingRoom(false);
      setTurnTimer(data.timeLimit || 30);
      initializeGame();
    }
    
    function onYourTurn(data: { matchId: string; move: any; gameType: string; board: any; opponentId: string; yourTurn?: boolean; currentTurnPlayerId?: string }) {
      console.log('yourTurn event:', data);
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
        if (data.board) {
          setBoard(to2DBoard(data.board));
          console.log('Board after setBoard (yourTurn):', to2DBoard(data.board));
        }
      }
    }
    
    function onMoveMade(data: { matchId: string; move: any; gameType: string; board: any; opponentId: string; currentTurnPlayerId?: string }) {
      console.log('moveMade event:', data);
      if (data.matchId !== currentMatchId) return;
      if (data.board) {
        setBoard(to2DBoard(data.board));
        console.log('Board after setBoard (moveMade):', to2DBoard(data.board));
      }
      if (data.currentTurnPlayerId && user?.id) {
        setIsMyTurn(data.currentTurnPlayerId === user.id);
      } else if (data.opponentId !== user?.id) {
        setIsMyTurn(false);
      }
    }
    
    function onGameOver(data: { matchId: string; winner?: string; winnerId?: string; gameType: string; result: string; opponentId: string }) {
      console.log('🎯 onGameOver received:', data);
      if (data.matchId === currentMatchId && !resultModalShown) {
        console.log('🎯 Setting game over immediately');
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
        setResultModalShown(true);
      }
    }
    
    function onTurnTimeout(data: { matchId: string; message: string }) {
      if (data.matchId === currentMatchId) {
        console.log('⏰ Turn timeout:', data.message);
        alert(data.message);
      }
    }
    
    function onError(data: { message: string }) {
      console.error('❌ Socket error:', data.message);
      
      if (data.message === 'Game has already ended') {
        console.log('Game has ended, ignoring move attempt');
        return;
      }
      
      if (data.message === 'Not your turn') {
        console.log('Not your turn, ignoring move attempt');
        return;
      }
      
      if (data.message !== 'Game not found or has ended') {
        alert(`Error: ${data.message}`);
      } else {
        console.log('Game not found or has ended - this may be expected if the game just finished');
      }
    }
    
    socket.on('gameStart', onGameStart);
    socket.on('yourTurn', onYourTurn);
    socket.on('moveMade', onMoveMade);
    socket.on('gameOver', onGameOver);
    socket.on('turnTimeout', onTurnTimeout);
    socket.on('error', onError);
    
    return () => {
      socket.off('gameStart', onGameStart);
      socket.off('yourTurn', onYourTurn);
      socket.off('moveMade', onMoveMade);
      socket.off('gameOver', onGameOver);
      socket.off('turnTimeout', onTurnTimeout);
      socket.off('error', onError);
    };
  }, [currentMatchId, isPracticeMode, user?.id]);

  // Turn timer effect
  useEffect(() => {
    console.log('⏰ Timer effect:', { gameStatus, isMyTurn, gameOver, turnTimer });
    
    // STOP TIMER IMMEDIATELY IF GAME IS OVER
    if (gameOver || gameStatus !== 'playing') {
      console.log('⏰ Timer stopped: Game over or not playing');
      return;
    }
    
    if (gameStatus === 'playing' && isMyTurn && !gameOver && turnTimer > 0) {
      console.log('⏰ Starting timer countdown');
      const timer = setInterval(() => {
        setTurnTimer(prev => {
          if (prev <= 1) {
            console.log('⏰ Timer finished');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        console.log('⏰ Clearing timer');
        clearInterval(timer);
      };
    }
  }, [gameStatus, isMyTurn, gameOver]); // REMOVED turnTimer FROM DEPENDENCIES

  // Add computer move logic
  useEffect(() => {
    if (
      isPracticeMode &&
      gameStatus === 'playing' &&
      !gameOver &&
      practiceTurn === 'O'
    ) {
      const timer = setTimeout(() => {
        makeComputerMove();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isPracticeMode, gameStatus, gameOver, practiceTurn, board]);

  // Minimax algorithm for TicTacToe 5x5 (depth-limited for performance)
  function minimax(board: (string|null)[][], depth: number, isMaximizing: boolean): { score: number; move?: { row: number; col: number } } {
    const winner = getBoardWinner(board);
    if (winner === 'O') return { score: 1000 - depth };
    if (winner === 'X') return { score: -1000 + depth };
    if (isBoardFull(board) || depth === 0) return { score: 0 };

    const emptyCells: { row: number; col: number }[] = [];
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        if (board[i][j] === null) {
          emptyCells.push({ row: i, col: j });
        }
      }
    }

    if (isMaximizing) {
      let maxEval = -Infinity;
      let bestMove = emptyCells[0];
      for (const cell of emptyCells) {
        const tempBoard = board.map(r => [...r]);
        tempBoard[cell.row][cell.col] = 'O';
        const evalResult = minimax(tempBoard, depth - 1, false).score;
        if (evalResult > maxEval) {
          maxEval = evalResult;
          bestMove = cell;
        }
      }
      return { score: maxEval, move: bestMove };
    } else {
      let minEval = Infinity;
      let bestMove = emptyCells[0];
      for (const cell of emptyCells) {
        const tempBoard = board.map(r => [...r]);
        tempBoard[cell.row][cell.col] = 'X';
        const evalResult = minimax(tempBoard, depth - 1, true).score;
        if (evalResult < minEval) {
          minEval = evalResult;
          bestMove = cell;
        }
      }
      return { score: minEval, move: bestMove };
    }
  }

  // Helper to check winner for minimax
  function getBoardWinner(b: (string|null)[][]): string | null {
    // Horizontal
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j <= 1; j++) {
        if (
          b[i][j] &&
          b[i][j] === b[i][j+1] &&
          b[i][j] === b[i][j+2] &&
          b[i][j] === b[i][j+3]
        ) return b[i][j];
      }
    }
    // Vertical
    for (let i = 0; i <= 1; i++) {
      for (let j = 0; j < 5; j++) {
        if (
          b[i][j] &&
          b[i][j] === b[i+1][j] &&
          b[i][j] === b[i+2][j] &&
          b[i][j] === b[i+3][j]
        ) return b[i][j];
      }
    }
    // Diagonal TL-BR
    for (let i = 0; i <= 1; i++) {
      for (let j = 0; j <= 1; j++) {
        if (
          b[i][j] &&
          b[i][j] === b[i+1][j+1] &&
          b[i][j] === b[i+2][j+2] &&
          b[i][j] === b[i+3][j+3]
        ) return b[i][j];
      }
    }
    // Diagonal TR-BL
    for (let i = 0; i <= 1; i++) {
      for (let j = 3; j < 5; j++) {
        if (
          b[i][j] &&
          b[i][j] === b[i+1][j-1] &&
          b[i][j] === b[i+2][j-2] &&
          b[i][j] === b[i+3][j-3]
        ) return b[i][j];
      }
    }
    return null;
  }

  function isBoardFull(b: (string|null)[][]): boolean {
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        if (b[i][j] === null) return false;
      }
    }
    return true;
  }

  // Replace makeComputerMove with minimax AI
  const makeComputerMove = () => {
    if (gameOver) return;
    const { move } = minimax(board, 4, true);
    if (!move) {
      handleGameEnd('draw', 'draw');
      return;
    }
    const computerBoard = board.map(row => [...row]);
    computerBoard[move.row][move.col] = 'O';
    setBoard(computerBoard);
    setPracticeTurn('X');
    setTimeout(() => {
      checkForWinner();
    }, 100);
  };

  // Update handleCellClick for practice mode
  const handleCellClick = (row: number, col: number) => {
    console.log('Clicked:', row, col, 'isMyTurn:', isMyTurn, 'isPracticeMode:', isPracticeMode, 'gameStatus:', gameStatus, 'gameOver:', gameOver);
    
    // BLOCK ALL MOVES IF GAME IS OVER
    if (gameStatus !== 'playing' || gameOver || board[row][col] !== null) {
      console.log('❌ Move blocked:', { gameStatus, gameOver, cellValue: board[row][col] });
      return;
    }
    
    if (!isPracticeMode) {
      if (!isMyTurn) {
        console.log('❌ Not your turn');
        return;
      }
      if (gameOver) {
        console.log('❌ Game is over, cannot make move');
        return;
      }
      const socket = getSocket();
      if (socket && currentMatchId) {
        const index = row * 5 + col;
        console.log('✅ Emitting makeMove:', { matchId: currentMatchId, move: { index }, gameType: 'tictactoe5x5' });
        socket.emit('makeMove', {
          matchId: currentMatchId,
          move: { index },
          gameType: 'tictactoe5x5'
        });
      } else {
        alert('Connection error. Please refresh the page.');
      }
      return;
    }
    
    if (practiceTurn !== 'X') {
      console.log('❌ Not your turn in practice mode');
      return;
    }
    if (gameOver) {
      console.log('❌ Game is over in practice mode, cannot make move');
      return;
    }
    
    console.log('✅ Making practice move at:', row, col);
    const updatedBoard = board.map(rowArr => [...rowArr]);
    updatedBoard[row][col] = 'X';
    setBoard(updatedBoard);
    setPracticeTurn('O');
    
    // Check for winner immediately
    setTimeout(() => {
      checkForWinner();
    }, 100);
  };

  // Implement resetGame and handleSurrender if empty
  const resetGame = () => {
    setBoard(Array(5).fill(null).map(() => Array(5).fill(null)));
    setCurrentPlayer('X');
    setGameOver(false);
    setWinner(null);
    setTimeLeft(30);
    setGameStatus('menu');
    setCurrentMatchId(null);
    setOpponentId(null);
    setIsMyTurn(false);
    setTurnTimer(30);
  };
  const handleSurrender = () => {
    if (gameOver || gameStatus !== 'playing') return;
    setGameOver(true);
    setGameStatus('finished');
    setShowResultModal(true);
    setResultModalData({ isWin: false, isDraw: false });
  };

  const handleResultModalClose = () => {
    setShowResultModal(false);
  };

  const handleOpponentMove = (move: { row: number; col: number }) => {
    const { row, col } = move;
    setBoard(prev => {
      const newBoard = [...prev];
      newBoard[row][col] = 'O';
      return newBoard;
    });
    
    checkForWinner();
  };

  const handleGameEnd = (winnerId: string, result: string) => {
    setGameOver(true);
    setGameStatus('finished');
    setIsMyTurn(false);
    loadUserBalances();
    
    if (winnerId === user?.id) {
      setResultModalData({ isWin: true, isDraw: false });
    } else if (winnerId === 'draw') {
      setResultModalData({ isWin: false, isDraw: true });
    } else {
      setResultModalData({ isWin: false, isDraw: false });
    }
    setShowResultModal(true);
    
    // Call onGameEnd callback if provided
    onGameEnd && onGameEnd(winnerId);
  };

  const checkForWinner = () => {
    // Check horizontal
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j <= 5 - 4; j++) {
        if (
          board[i][j] &&
          board[i][j] === board[i][j+1] &&
          board[i][j] === board[i][j+2] &&
          board[i][j] === board[i][j+3]
        ) {
          console.log('🎯 WINNER FOUND: Horizontal at row', i, 'col', j, 'player:', board[i][j]);
          setGameOver(true);
          setGameStatus('finished');
          if (isPracticeMode) {
            setShowResultModal(true);
            handleGameEnd(board[i][j] === 'X' ? (user?.id || '') : (opponentId || ''), 'four_in_row');
          }
          return;
        }
      }
    }
    // Check vertical
    for (let i = 0; i <= 5 - 4; i++) {
      for (let j = 0; j < 5; j++) {
        if (
          board[i][j] &&
          board[i][j] === board[i+1][j] &&
          board[i][j] === board[i+2][j] &&
          board[i][j] === board[i+3][j]
        ) {
          console.log('🎯 WINNER FOUND: Vertical at row', i, 'col', j, 'player:', board[i][j]);
          setGameOver(true);
          setGameStatus('finished');
          if (isPracticeMode) {
            setShowResultModal(true);
            handleGameEnd(board[i][j] === 'X' ? (user?.id || '') : (opponentId || ''), 'four_in_row');
          }
          return;
        }
      }
    }
    // Check diagonal (top-left to bottom-right)
    for (let i = 0; i <= 5 - 4; i++) {
      for (let j = 0; j <= 5 - 4; j++) {
        if (
          board[i][j] &&
          board[i][j] === board[i+1][j+1] &&
          board[i][j] === board[i+2][j+2] &&
          board[i][j] === board[i+3][j+3]
        ) {
          console.log('🎯 WINNER FOUND: Diagonal TL-BR at row', i, 'col', j, 'player:', board[i][j]);
          setGameOver(true);
          setGameStatus('finished');
          if (isPracticeMode) {
            setShowResultModal(true);
            handleGameEnd(board[i][j] === 'X' ? (user?.id || '') : (opponentId || ''), 'four_in_row');
          }
          return;
        }
      }
    }
    // Check diagonal (top-right to bottom-left)
    for (let i = 0; i <= 5 - 4; i++) {
      for (let j = 3; j < 5; j++) {
        if (
          board[i][j] &&
          board[i][j] === board[i+1][j-1] &&
          board[i][j] === board[i+2][j-2] &&
          board[i][j] === board[i+3][j-3]
        ) {
          console.log('🎯 WINNER FOUND: Diagonal TR-BL at row', i, 'col', j, 'player:', board[i][j]);
          setGameOver(true);
          setGameStatus('finished');
          if (isPracticeMode) {
            setShowResultModal(true);
            handleGameEnd(board[i][j] === 'X' ? (user?.id || '') : (opponentId || ''), 'four_in_row');
          }
          return;
        }
      }
    }
    // Check for draw
    if (board.every(row => row.every(cell => cell !== null))) {
      console.log('🎯 DRAW: Board is full');
      if (isPracticeMode) {
        handleGameEnd('draw', 'draw');
      }
    }
  };

  useEffect(() => {
    if (showRules) {
      fetch('/api/game-rules/tic_tac_toe_5x5')
        .then(res => res.json())
        .then(data => setRules(data.rules_en || 'No rules found.'));
    }
  }, [showRules]);

  // In the result modal and post-game UI, if resultModalData.isDraw is true, show 'Draw! Both players have been refunded their stake.' and reloadUserBalances().
  useEffect(() => {
    if (showResultModal && resultModalData.isDraw) {
      loadUserBalances();
    }
  }, [showResultModal, resultModalData.isDraw]);

  // Main menu screen
  if (gameStatus === 'menu') {
    console.log('RENDER: MENU', { gameStatus, board });
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-card-gradient rounded-xl p-6 border border-gray-700">
          <div className="text-center mb-8">
            <X className="h-16 w-16 text-gaming-accent mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-2">Tic Tac Toe 5x5</h1>
            <p className="text-gray-400">Get 4 in a row to win! Play classic Tic Tac Toe with a twist.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                {/* 3D Light Effect Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-blue-400/5 to-purple-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 via-blue-400/10 to-purple-400/10 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-lg blur-sm scale-110 group-hover:scale-125"></div>
                {/* Inner Glow */}
                <div className="absolute inset-1 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-md"></div>
                {/* Content */}
                <div className="relative z-10 group-hover:scale-105 transition-all duration-300">
                  {loadingBalances ? 'Loading...' : 'Play 1v1 (Virtual Coins)'}
                </div>
                {/* Bottom Shadow for 3D Effect */}
                <div className="absolute -bottom-1 left-1 right-1 h-1 bg-black/20 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
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
                {/* 3D Light Effect Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-red-400/5 via-orange-400/5 to-yellow-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-red-400/10 via-orange-400/10 to-yellow-400/10 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-lg blur-sm scale-110 group-hover:scale-125"></div>
                {/* Inner Glow */}
                <div className="absolute inset-1 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-md"></div>
                {/* Content */}
                <div className="relative z-10 group-hover:scale-105 transition-all duration-300">
                  Practice vs Computer
                </div>
                {/* Bottom Shadow for 3D Effect */}
                <div className="absolute -bottom-1 left-1 right-1 h-1 bg-black/20 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
              </button>
            </div>
          </div>

          <div className="mt-8 p-4 bg-gaming-dark rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-3">How to Play</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
              <div>
                <h4 className="font-semibold text-gaming-accent mb-1">1. Get 4 in a Row</h4>
                <p>Place your X or O to make 4 in a row (horizontally, vertically, or diagonally).</p>
              </div>
              <div>
                <h4 className="font-semibold text-gaming-accent mb-1">2. Take Turns</h4>
                <p>Players take turns, 30 seconds per turn. Practice mode is vs computer.</p>
              </div>
              <div>
                <h4 className="font-semibold text-gaming-accent mb-1">3. Win the Game</h4>
                <p>First to get 4 in a row wins! If the board fills up, it's a draw.</p>
              </div>
            </div>
          </div>

          {/* Game Bet Modal */}
          {showBetModal && user && (
            <GameBetModal
              open={showBetModal}
              onClose={() => setShowBetModal(false)}
              gameType="tic_tac_toe"
              userId={user.id}
              username={user.username}
              onConfirm={handleBetConfirmed}
              onBetConfirmed={handleBetConfirmed}
              userBalances={userBalances}
            />
          )}
        </div>
      </div>
    );
  }

  // Floating new game button if not in menu
  const showFloatingNewGame = gameStatus === 'playing' && !gameOver;

  // Banner above the board
  let turnBanner = null;
  if (gameStatus === 'playing') {
    if (gameOver) {
      turnBanner = (
        <div className="mb-4 text-2xl font-bold text-white bg-red-600 rounded-lg py-3 px-6 shadow flex items-center justify-center">
          <Trophy className="h-6 w-6 text-yellow-400 mr-2" />
          Game Over - Check Result Below
        </div>
      );
    } else if (isMyTurn) {
      turnBanner = (
        <div className="mb-4 text-2xl font-bold text-white bg-gaming-dark rounded-lg py-3 px-6 shadow flex items-center justify-center">
          <User className="h-6 w-6 text-blue-400 mr-2" />
          Your Turn!
        </div>
      );
    } else {
      turnBanner = (
        <div className="mb-4 text-2xl font-bold text-white bg-gaming-dark rounded-lg py-3 px-6 shadow flex items-center justify-center">
          <Users className="h-6 w-6 text-red-400 mr-2" />
          Opponent Turn...
        </div>
      );
    }
  }

  if (gameStatus === 'waiting') {
    console.log('RENDER: WAITING', { gameStatus, board });
    return (
      <MatchmakingWaitingRoom
        gameType="tic_tac_toe"
        stakeAmount={currentStake}
        onMatchFound={(matchId: string) => {
          setCurrentMatchId(matchId);
          setGameStatus('playing');
          setShowBetModal(false);
          initializeGame();
        }}
        onCancel={handleWaitingRoomCancel}
      />
    );
  }

  console.log('RENDER: PLAYING', { gameStatus, board });
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-gaming-dark rounded-2xl border border-gray-700 shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <X className="h-6 w-6 mr-2 text-gaming-accent" />
            Tic Tac Toe 5x5
            {isPracticeMode && <span className="ml-2 text-sm text-gaming-accent">Practice Mode</span>}
            {currentMatchId && (
              <span className="ml-2 text-sm text-gaming-gold">Match #{currentMatchId.slice(-8)}</span>
            )}
          </h2>
          <div className="flex items-center space-x-4">
            {/* Info Button */}
            <button
              className="p-2 rounded-full bg-gray-800 hover:bg-blue-500 transition-colors"
              title="Regleman Jwèt la"
              onClick={() => setShowRules(true)}
            >
              <Info className="h-6 w-6 text-white" />
            </button>
            {isMyTurn && gameStatus === 'playing' && (
              <div className="flex items-center space-x-2 bg-gaming-dark px-3 py-2 rounded-lg">
                <Clock className="h-4 w-4 text-gaming-gold" />
                <span className="text-white font-semibold">{turnTimer}s</span>
              </div>
            )}
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
              isMyTurn ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-red-500/20 border border-red-500/30'
            }`}>
              <Circle className="h-4 w-4 text-red-400" />
              <span className="text-white">{isMyTurn ? 'Your Turn (X)' : 'Opponent Turn (O)'}</span>
            </div>
          </div>
        </div>

        {/* Board FIRST */}
        <div className="flex flex-col items-center justify-center min-h-[400px] py-8">
          <div className="relative w-full max-w-md mx-auto p-4 rounded-2xl bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 shadow-2xl border-4 border-gray-900">
            <div className="grid grid-cols-5 gap-2 w-full bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 p-2 rounded-2xl shadow-inner">
              {board.map((row, rowIndex) => (
                <React.Fragment key={rowIndex}>
                  {row.map((cell, colIndex) => {
                    const isActive = !gameOver && board[rowIndex][colIndex] === null && gameStatus === 'playing' && (isMyTurn || isPracticeMode);
                    const isDisabled = gameOver || board[rowIndex][colIndex] !== null || gameStatus !== 'playing' || (!isMyTurn && !isPracticeMode);
                    return (
                      <button
                        key={`${rowIndex}-${colIndex}`}
                        onClick={() => handleCellClick(rowIndex, colIndex)}
                        disabled={isDisabled}
                        className={`aspect-square w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center border-2 border-gray-800 bg-gray-900 shadow-inner transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                          isActive 
                            ? 'hover:bg-gray-800 hover:ring-4 hover:ring-blue-400/40 cursor-pointer' 
                            : isDisabled 
                              ? 'cursor-not-allowed' 
                              : 'cursor-not-allowed opacity-60'
                        }`}
                        style={{ boxShadow: 'inset 0 2px 8px 0 #111827, 0 1.5px 0 0 #374151' }}
                      >
                        {cell === 'X' && (
                          <span className="block w-10 h-10 md:w-14 md:h-14 rounded-full bg-blue-600 shadow-xl ring-4 ring-blue-300 flex items-center justify-center !opacity-100 !grayscale-0">
                            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <line x1="8" y1="8" x2="24" y2="24" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
                              <line x1="24" y1="8" x2="8" y2="24" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
                            </svg>
                          </span>
                        )}
                        {cell === 'O' && (
                          <span className="block w-10 h-10 md:w-14 md:h-14 rounded-full bg-red-500 shadow-xl ring-4 ring-orange-300 flex items-center justify-center !opacity-100 !grayscale-0">
                            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="16" cy="16" r="10" stroke="#fff" strokeWidth="3.5" fill="none" />
                            </svg>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* GameControls and info BELOW board */}
      <GameControls
        onNewGame={resetGame}
        onSurrender={handleSurrender}
        mode={isPracticeMode ? 'Practice' : '1v1 Match'}
        status={gameStatus}
        timeLeft={turnTimer}
        currentTurn={isPracticeMode ? (practiceTurn === 'X' ? 'You' : 'Computer') : (isMyTurn ? 'You' : 'Opponent')}
        winCondition={"4 in a row"}
        boardSize={"5x5"}
        symbols={"❌⭕"}
        stake={currentStake}
        walletMode={walletMode}
        showBalances={true}
        realBalance={userBalances.real_balance}
        virtualBalance={userBalances.virtual_balance}
        matchId={currentMatchId}
      />
      {/* Game Result Modal */}
      <GameResultModal
        isOpen={showResultModal}
        isWin={resultModalData.isWin}
        isDraw={resultModalData.isDraw}
        refundMessage={resultModalData.isDraw ? 'Draw! Both players have been refunded their stake.' : undefined}
        onClose={handleResultModalClose}
        gameType="connectfour"
        playerName="You"
        opponentName={isPracticeMode ? "Computer" : "Opponent"}
      />
      {/* Rules Modal */}
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