import React, { useState, useEffect } from 'react';
import { useWalletMode } from '../../contexts/WalletModeContext';
import { GameAPI } from '../../services/gameAPI';
import { commissionAPI, CommissionConfig } from '../../services/commissionAPI';
import { DollarSign, Zap, Shield, Sparkles } from 'lucide-react';
import { getGameId } from '../../utils/gameId';
import { useTranslation } from 'react-i18next';

interface GameBetModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (stake: number) => void;
  gameType: 'connect_four' | 'tic_tac_toe' | 'dice_battle' | 'diamond_hunt' | 'chess';
  userId: string;
  username: string;
  onBetConfirmed?: (stakeAmount: number) => void;
  userBalances?: {
    real_balance: number;
    virtual_balance: number;
  };
}

const quickAmounts = [1, 5, 10, 20, 50, 100];

export const GameBetModal: React.FC<GameBetModalProps> = ({ 
  open, 
  onClose, 
  gameType, 
  userId, 
  username, 
  onBetConfirmed,
  userBalances 
}) => {
  const { walletMode, isRealMode, isVirtualMode } = useWalletMode();
  const [betAmount, setBetAmount] = useState<number>(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [commissionConfig, setCommissionConfig] = useState<CommissionConfig | null>(null);
  const { t } = useTranslation();

  // Load commission config when modal opens (only for real money mode)
  useEffect(() => {
    if (open && isRealMode) {
      loadCommissionConfig();
    }
  }, [open, gameType, isRealMode]);

  const loadCommissionConfig = async () => {
    try {
      const gameId = getGameId(gameType);
      const config = await commissionAPI.getCommissionConfig(gameId);
      setCommissionConfig(config);
    } catch (error) {
      console.error('Error loading commission config:', error);
    }
  };

  // Calculate commission using the API service (only for real money)
  const calculateCommission = () => {
    if (!commissionConfig || isVirtualMode) {
      return {
        platformFee: 0,
        winnerAmount: betAmount * 2,
        totalPot: betAmount * 2
      };
    }

    const { winnerPayout, platformCommission } = commissionAPI.calculateCommission(
      betAmount * 2, // Total pot (both players' bets)
      commissionConfig
    );

    return {
      platformFee: platformCommission,
      winnerAmount: winnerPayout,
      totalPot: betAmount * 2
    };
  };

  const { platformFee, winnerAmount, totalPot } = calculateCommission();

  const handleQuickAmount = (amt: number) => {
    setBetAmount(amt);
    setError(null);
  };

  const handleBetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAmount = Number(e.target.value);
    setBetAmount(newAmount);
    setError(null);

    // Validate bet amount if commission config is loaded (only for real money)
    if (commissionConfig && isRealMode) {
      const validation = commissionAPI.validateBetAmount(newAmount, commissionConfig);
      if (!validation.isValid) {
        setError(validation.error || 'Invalid bet amount');
      }
    }
  };

  const handleJoin = async () => {
    // Validate bet amount (only for real money)
    if (commissionConfig && isRealMode) {
      const validation = commissionAPI.validateBetAmount(betAmount, commissionConfig);
      if (!validation.isValid) {
        setError(validation.error || 'Invalid bet amount');
        return;
      }
    }

    // Check balance
    const currentBalance = isRealMode ? userBalances?.real_balance : userBalances?.virtual_balance;
    if (currentBalance && currentBalance < betAmount) {
      setError(`Insufficient ${isRealMode ? 'real money' : 'virtual coins'} balance`);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (onBetConfirmed) {
        onBetConfirmed(betAmount);
        onClose();
        return;
      }
      setError('Matchmaking not available');
    } catch (error) {
      setError('Error joining matchmaking');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const currentBalance = isRealMode ? userBalances?.real_balance : userBalances?.virtual_balance;
  const balanceDisplay = isRealMode 
    ? `$${currentBalance?.toLocaleString() || '0.00'}`
    : `${currentBalance?.toLocaleString() || '0'} coins`;

  // Debug logging
  console.log('🎯 GameBetModal Debug:', {
    walletMode,
    isRealMode,
    isVirtualMode,
    userBalances,
    currentBalance,
    balanceDisplay,
    'real_balance': userBalances?.real_balance,
    'virtual_balance': userBalances?.virtual_balance,
    'balance_type': isRealMode ? 'real' : 'virtual'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-neutral-900 rounded-lg shadow-lg p-6 w-full max-w-sm">
        <h2 className="text-base font-medium text-center mb-4">
          {isRealMode ? 'Place Your Bet' : 'Choose Bet Amount'}
        </h2>
        
        {/* Current Mode Display */}
        <div className="mb-4 p-3 bg-neutral-800 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-gray-300 text-sm">
              {isRealMode ? 'Real Money Mode' : 'Virtual Coins Mode'}
            </span>
            <div className="flex items-center space-x-2">
              {isRealMode ? (
                <DollarSign className="h-4 w-4 text-gaming-gold" />
              ) : (
                <Zap className="h-4 w-4 text-gaming-accent" />
              )}
              <span className={`text-sm font-medium ${isRealMode ? 'text-gaming-gold' : 'text-gaming-accent'}`}>
                {isRealMode ? 'Real Money' : 'Virtual Coins'}
              </span>
            </div>
          </div>
        </div>

        {/* Balance Display */}
        <div className="mb-4 p-3 bg-neutral-800 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-gray-300 text-sm">
              {isRealMode ? 'Real Money Balance' : 'Virtual Coins Balance'}
            </span>
            <span className="text-white font-semibold">{balanceDisplay}</span>
          </div>
        </div>
        
        {/* Commission Info (only for real money) */}
        {isRealMode && commissionConfig && (
          <div className="text-xs text-gray-400 mb-3 p-2 bg-neutral-800 rounded">
            <div className="flex justify-between">
              <span>Platform Commission:</span>
              <span className="text-yellow-400">{commissionConfig.houseEdge}%</span>
            </div>
            <div className="flex justify-between">
              <span>Winner receives:</span>
              <span className="text-green-400">${winnerAmount.toFixed(2)}</span>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-3 flex-wrap justify-center">
          {quickAmounts.map((amt) => (
            <button
              key={amt}
              className={`px-2 py-1 rounded text-xs border transition-all duration-200 ${
                betAmount === amt 
                  ? isRealMode 
                    ? 'bg-green-600 text-white border-green-500' 
                    : 'bg-purple-600 text-white border-purple-500'
                  : 'bg-neutral-800 text-gray-200 border-neutral-700 hover:border-neutral-600'
              }`}
              onClick={() => handleQuickAmount(amt)}
              type="button"
            >
              {isRealMode ? `$${amt}` : `${amt} coins`}
            </button>
          ))}
        </div>
        
        <input
          type="number"
          min={commissionConfig?.minBet || 1}
          max={commissionConfig?.maxBet || 1000}
          className="w-full p-2 rounded bg-neutral-800 text-white text-sm mb-2 border border-neutral-700"
          value={betAmount}
          onChange={handleBetChange}
          placeholder={`Enter bet amount... (${isRealMode ? '$' : 'coins'})`}
        />
        
        {/* Game Details */}
        <div className="text-xs text-gray-400 mb-2">
          <div>Total Pot: <span className="text-white">
            {isRealMode ? `$${totalPot}` : `${totalPot} coins`}
          </span></div>
          <div>Winner will receive: <span className="text-green-400">
            {isRealMode ? `$${winnerAmount}` : `${winnerAmount} coins`}
          </span></div>
          {isRealMode && (
            <div>Platform fee: <span className="text-yellow-400">${platformFee}</span></div>
          )}
        </div>
        
        {error && <div className="text-xs text-red-400 mb-2">{error}</div>}
        {success && <div className="text-xs text-green-400 mb-2">{success}</div>}
        
        <div className="flex gap-2 mt-2">
          <button
            className={`flex-1 py-2 rounded text-sm font-medium disabled:opacity-60 transition-all duration-200 ${
              isRealMode
                ? 'bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-white'
                : 'bg-gradient-to-r from-purple-400 to-purple-500 hover:from-purple-500 hover:to-purple-600 text-white'
            }`}
            onClick={handleJoin}
            disabled={loading || betAmount < (commissionConfig?.minBet || 1) || betAmount > (commissionConfig?.maxBet || 1000) || (currentBalance !== undefined && currentBalance < betAmount)}
          >
            {loading ? 'Waiting...' : 'Play 1v1'}
          </button>
          <button
            className="flex-1 py-2 rounded bg-neutral-700 text-gray-200 text-sm hover:bg-neutral-600"
            onClick={onClose}
            disabled={loading}
          >Cancel</button>
        </div>
      </div>
    </div>
  );
}; 