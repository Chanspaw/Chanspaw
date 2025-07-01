import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useWalletMode } from '../../contexts/WalletModeContext';
import { PaymentAPI } from '../../services/paymentAPI';
import { Transaction, WalletBalance } from '../../types/payment';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  DollarSign,
  Shield,
  Plus,
  ArrowUp,
  Zap,
  History,
  Banknote,
  ArrowDown,
  Trophy,
  Gamepad2
} from 'lucide-react';

export function WalletDashboard() {
  const { user } = useAuth();
  const { isRealMode } = useWalletMode();
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Credit Card');
  const [withdrawalMethod, setWithdrawalMethod] = useState('Bank Transfer');
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Load wallet data on component mount
  useEffect(() => {
    if (user?.id) {
      loadWalletData();
    }
  }, [user?.id]);

  const loadWalletData = async () => {
    try {
      setLoading(true);

      // Load wallet balance
      const balanceResponse = await fetch(import.meta.env.VITE_API_URL + '/api/wallet/balance', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        setWalletBalance(balanceData.data || balanceData);
      } else {
        console.error('Failed to load wallet balance:', balanceResponse.status);
      }

      // Load transaction history (only real money transactions)
      const transactionsResponse = await fetch(import.meta.env.VITE_API_URL + '/api/wallet/transactions?limit=10', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setTransactions(transactionsData.data?.transactions || transactionsData.transactions || []);
      } else {
        console.error('Failed to load transactions:', transactionsResponse.status);
        setTransactions([]);
      }
    } catch (err) {
      console.error('Error loading wallet data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    const amount = Number(depositAmount);
    if (amount <= 0) {
      alert('Please enter a valid amount greater than $0');
      return;
    }
    if (amount > 10000) {
      alert('Maximum deposit amount is $10,000');
      return;
    }
    setIsProcessing(true);
    try {
      const response = await PaymentAPI.createDeposit(user!.id, amount, '1'); // Using Stripe
      if (response.success) {
        alert(`Deposit initiated successfully! Transaction ID: ${response.data?.id}`);
        setShowDepositModal(false);
        setDepositAmount('');
        setPaymentMethod('Credit Card');
        setTimeout(() => {
          loadWalletData();
        }, 3000);
      } else {
        alert(`Deposit failed: ${response.error}`);
      }
    } catch (error) {
      alert('Deposit failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = Number(withdrawAmount);
    if (amount <= 0) {
      alert('Please enter a valid amount greater than $0');
      return;
    }
    if (amount > (walletBalance?.real_balance || 0)) {
      alert('Insufficient funds for this withdrawal');
      return;
    }
    if (amount > 5000) {
      alert('Maximum withdrawal amount is $5,000');
      return;
    }
    setIsProcessing(true);
    try {
      const accountDetails = {
        accountNumber: '1234567890',
        routingNumber: '021000021',
        bankName: 'Sample Bank'
      };
      const response = await PaymentAPI.createWithdrawal(
        user!.id, 
        amount, 
        withdrawalMethod, 
        accountDetails
      );
      if (response.success) {
        alert(`Withdrawal request submitted successfully! Request ID: ${response.data?.id}`);
        setShowWithdrawModal(false);
        setWithdrawAmount('');
        setWithdrawalMethod('Bank Transfer');
        loadWalletData();
      } else {
        alert(`Withdrawal failed: ${response.error}`);
      }
    } catch (error) {
      alert('Withdrawal failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'text-green-400';
      case 'pending':
        return 'text-yellow-400';
      case 'failed':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-400" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gaming-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Real Money Balance */}
        <div className="bg-card-gradient rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <DollarSign className="h-6 w-6 text-green-400" />
            </div>
            <div>
                <h3 className="text-white font-semibold">Real Money</h3>
                <p className="text-gray-400 text-sm">Actual funds</p>
              </div>
            </div>
            <Shield className="h-5 w-5 text-green-400" />
          </div>
          
          <div className="mb-4">
            <p className="text-2xl font-bold text-white">
              ${walletBalance?.real_balance?.toLocaleString() || '0.00'}
            </p>
            <p className="text-gray-400 text-sm">Available for real money games</p>
          </div>

          <div className="flex space-x-2">
              <button
                onClick={() => setShowDepositModal(true)}
                className="flex-1 bg-emerald-900 hover:bg-emerald-800 text-white py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 border border-emerald-950"
              >
                <Plus className="h-4 w-4 inline mr-1" />
                Deposit
              </button>
              <button
                onClick={() => setShowWithdrawModal(true)}
                className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 border border-neutral-700"
              >
                <ArrowUp className="h-4 w-4 inline mr-1" />
                Withdraw
              </button>
        </div>
      </div>
      </div>

      {/* Balance Mode Display */}
      <div className="bg-card-gradient rounded-xl p-4 border border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold">Current Game Mode</h3>
            <p className="text-gray-400 text-sm">
              {isRealMode ? 'Real money games' : 'Virtual coin games'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {isRealMode ? (
              <DollarSign className="h-5 w-5 text-gaming-gold" />
            ) : (
              <Zap className="h-5 w-5 text-gaming-accent" />
            )}
            <span className={`text-sm font-medium ${isRealMode ? 'text-gaming-gold' : 'text-gaming-accent'}`}>
              {isRealMode ? 'Real Money' : 'Virtual Coins'}
            </span>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-gray-300 text-sm">
              Current Balance: {isRealMode ? 'Real Money' : 'Virtual Coins'}
            </span>
            <span className="text-white font-semibold">
              {isRealMode 
                ? `$${walletBalance?.real_balance?.toLocaleString() || '0.00'}`
                : `${walletBalance?.virtual_balance?.toLocaleString() || '0'} coins`
              }
            </span>
          </div>
          <p className="text-gray-400 text-xs mt-1">
            {isRealMode 
              ? 'Real money games are tracked and appear in admin panel'
              : 'Virtual coin games are for practice and fun only'
            }
          </p>
        </div>
      </div>

      {/* Transaction History (Real Money Only) */}
      <div className="bg-card-gradient rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-lg font-semibold">Transaction History</h3>
          <History className="h-5 w-5 text-gray-400" />
        </div>
        
          {transactions.length === 0 ? (
          <div className="text-center py-8">
            <Banknote className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No transactions yet</p>
            <p className="text-gray-500 text-sm">Your real money transactions will appear here</p>
            </div>
          ) : (
          <div className="space-y-3">
            {transactions.slice(0, 5).map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {transaction.type.includes('DEPOSIT') ? (
                    <ArrowDown className="h-5 w-5 text-green-400" />
                  ) : transaction.type.includes('WITHDRAW') ? (
                    <ArrowUp className="h-5 w-5 text-red-400" />
                  ) : transaction.type.includes('WIN') ? (
                    <Trophy className="h-5 w-5 text-yellow-400" />
                  ) : (
                    <Gamepad2 className="h-5 w-5 text-blue-400" />
                  )}
                  <div>
                    <p className="text-white font-medium">{transaction.type.replace('_', ' ')}</p>
                    <p className="text-gray-400 text-sm">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${
                    transaction.type.includes('DEPOSIT') || transaction.type.includes('WIN')
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}>
                    {transaction.type.includes('DEPOSIT') || transaction.type.includes('WIN') ? '+' : '-'}
                    ${transaction.amount.toLocaleString()}
                    </p>
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(transaction.status)}
                    <span className={`text-xs ${getStatusColor(transaction.status)}`}>
                      {transaction.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-neutral-900 rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-white mb-4">Deposit Funds</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Payment Method
                </label>
                <select 
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full p-3 rounded bg-neutral-800 text-white border border-neutral-700"
                >
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Amount ($)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full p-3 rounded bg-neutral-800 text-white border border-neutral-700"
                  placeholder="Enter amount..."
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleDeposit}
                disabled={isProcessing || Number(depositAmount) <= 0}
                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 rounded-lg font-medium disabled:opacity-50 transition-all duration-200"
              >
                {isProcessing ? 'Processing...' : 'Deposit'}
              </button>
                <button
                  onClick={() => setShowDepositModal(false)}
                className="flex-1 bg-neutral-700 text-white py-3 rounded-lg font-medium hover:bg-neutral-600 transition-all duration-200"
                >
                  Cancel
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-neutral-900 rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-white mb-4">Withdraw Funds</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Withdrawal Method
                </label>
                <select 
                  value={withdrawalMethod}
                  onChange={(e) => setWithdrawalMethod(e.target.value)}
                  className="w-full p-3 rounded bg-neutral-800 text-white border border-neutral-700"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="PayPal">PayPal</option>
                  <option value="Crypto">Cryptocurrency</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Amount ($)
                </label>
                <input
                  type="number"
                  min="1"
                  max={walletBalance?.real_balance || 0}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full p-3 rounded bg-neutral-800 text-white border border-neutral-700"
                  placeholder="Enter amount..."
                />
                <p className="text-gray-400 text-xs mt-1">
                  Available: ${walletBalance?.real_balance?.toLocaleString() || '0.00'}
                </p>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleWithdraw}
                disabled={isProcessing || Number(withdrawAmount) <= 0 || Number(withdrawAmount) > (walletBalance?.real_balance || 0)}
                className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white py-3 rounded-lg font-medium disabled:opacity-50 transition-all duration-200 border border-neutral-700"
              >
                {isProcessing ? 'Processing...' : 'Withdraw'}
              </button>
                <button
                  onClick={() => setShowWithdrawModal(false)}
                className="flex-1 bg-neutral-700 text-white py-3 rounded-lg font-medium hover:bg-neutral-600 transition-all duration-200"
                >
                  Cancel
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}