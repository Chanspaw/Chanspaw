import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, Banknote, TrendingUp, Wallet, CheckCircle, XCircle } from 'lucide-react';

interface PlatformRevenue {
  id: string;
  matchId: string;
  gameType: string;
  amount: number;
  currency: string;
  player1Id: string;
  player2Id: string;
  winnerId?: string | null;
  platformCut: number;
  timestamp: string;
  metadata?: string | null;
}

interface OwnerWithdrawal {
  id: string;
  amount: number;
  method: string;
  accountDetails?: string | null;
  notes?: string | null;
  status: string;
  createdAt: string;
  processedAt?: string | null;
}

export function OwnerProfitManagement() {
  const [revenue, setRevenue] = useState<PlatformRevenue[]>([]);
  const [withdrawals, setWithdrawals] = useState<OwnerWithdrawal[]>([]);
  const [availableProfit, setAvailableProfit] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('bank_transfer');
  const [withdrawAccount, setWithdrawAccount] = useState('');
  const [withdrawNotes, setWithdrawNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [revenueRes, withdrawRes, profitRes] = await Promise.all([
        fetch('/api/admin/platform-revenue').then(r => r.json()),
        fetch('/api/admin/owner-withdrawals').then(r => r.json()),
        fetch('/api/owner-profit/available').then(r => r.json()).catch(() => ({ data: { availableProfits: 0 } }))
      ]);
      setRevenue(revenueRes.data || []);
      setWithdrawals(withdrawRes.data.withdrawals || []);
      setAvailableProfit(profitRes.data.availableProfits || 0);
      setLoading(false);
    } catch (err) {
      setError('Failed to load data');
      setLoading(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/owner-withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(withdrawAmount),
          method: withdrawMethod,
          accountDetails: withdrawAccount,
          notes: withdrawNotes
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowWithdrawModal(false);
        setWithdrawAmount('');
        setWithdrawMethod('bank_transfer');
        setWithdrawAccount('');
        setWithdrawNotes('');
        setMessage('Withdrawal request submitted');
        loadData();
      } else {
        setMessage(data.error || 'Failed to submit withdrawal');
      }
    } catch {
      setMessage('Error submitting withdrawal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = () => {
    window.open('/api/admin/platform-revenue/export', '_blank');
  };

  const total = revenue.reduce((sum, r) => sum + (r.platformCut || 0), 0);

  return (
    <div className="bg-neutral-900 rounded-lg p-6 max-w-7xl mx-auto shadow-lg">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 flex items-center gap-4">
          <Banknote className="h-8 w-8 text-green-400" />
          <div>
            <div className="text-gray-400 text-sm">Total Platform Profit</div>
            <div className="text-2xl font-bold text-white">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 flex items-center gap-4">
          <Wallet className="h-8 w-8 text-blue-400" />
          <div>
            <div className="text-gray-400 text-sm">Available Profit</div>
            <div className="text-2xl font-bold text-white">${availableProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 flex flex-col items-center justify-center gap-2">
          <button onClick={handleExport} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors">
            <Download className="h-5 w-5" />
            Export CSV
          </button>
          <button onClick={() => setShowWithdrawModal(true)} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded transition-colors mt-2">
            <TrendingUp className="h-5 w-5" />
            Request Withdrawal
          </button>
        </div>
      </div>
      {message && <div className="mb-4 text-center text-sm text-gray-300 bg-gray-800 rounded p-2">{message}</div>}
      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-8 w-full max-w-md border border-gray-700 shadow-xl">
            <h3 className="text-xl font-semibold mb-4 text-white text-center">Request Withdrawal</h3>
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Amount</label>
                <input type="number" min="1" step="0.01" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white" required />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Method</label>
                <select value={withdrawMethod} onChange={e => setWithdrawMethod(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white">
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="paypal">PayPal</option>
                  <option value="crypto">Cryptocurrency</option>
                  <option value="check">Check</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Account Details</label>
                <input type="text" value={withdrawAccount} onChange={e => setWithdrawAccount(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white" required />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Notes</label>
                <textarea value={withdrawNotes} onChange={e => setWithdrawNotes(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white" rows={2} />
              </div>
              <div className="flex gap-2 mt-4">
                <button type="submit" className="flex-1 py-2 rounded bg-green-700 text-white text-sm font-medium disabled:opacity-60" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit'}</button>
                <button type="button" className="flex-1 py-2 rounded bg-gray-700 text-gray-200 text-sm" onClick={() => setShowWithdrawModal(false)} disabled={submitting}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Withdrawals Table */}
      <div className="mt-10">
        <h3 className="text-lg font-semibold text-white mb-3">Withdrawal Requests</h3>
        <div className="overflow-x-auto rounded-lg border border-gray-700 bg-gray-800">
          <table className="min-w-full text-sm text-gray-300 divide-y divide-gray-700">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Amount</th>
                <th className="px-4 py-2 text-left">Method</th>
                <th className="px-4 py-2 text-left">Account</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.length === 0 && (
                <tr><td colSpan={6} className="text-center py-4 text-gray-500">No withdrawal requests found.</td></tr>
              )}
              {withdrawals.map(w => (
                <tr key={w.id} className="hover:bg-gray-700 transition-colors">
                  <td className="px-4 py-2">{new Date(w.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2">${w.amount.toFixed(2)}</td>
                  <td className="px-4 py-2">{w.method}</td>
                  <td className="px-4 py-2">{w.accountDetails || '-'}</td>
                  <td className="px-4 py-2">
                    {w.status === 'COMPLETED' && <span className="inline-flex items-center gap-1 text-green-400"><CheckCircle className="h-4 w-4" /> Completed</span>}
                    {w.status === 'PENDING' && <span className="inline-flex items-center gap-1 text-yellow-400"><Wallet className="h-4 w-4" /> Pending</span>}
                    {w.status === 'FAILED' && <span className="inline-flex items-center gap-1 text-red-400"><XCircle className="h-4 w-4" /> Failed</span>}
                    {w.status !== 'COMPLETED' && w.status !== 'PENDING' && w.status !== 'FAILED' && <span>{w.status}</span>}
                  </td>
                  <td className="px-4 py-2">{w.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Platform Revenue Table */}
      <div className="mt-10">
        <h3 className="text-lg font-semibold text-white mb-3">Platform Revenue</h3>
        <div className="overflow-x-auto rounded-lg border border-gray-700 bg-gray-800">
          <table className="min-w-full text-sm text-gray-300 divide-y divide-gray-700">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Game</th>
                <th className="px-4 py-2 text-left">Match ID</th>
                <th className="px-4 py-2 text-left">Player 1</th>
                <th className="px-4 py-2 text-left">Player 2</th>
                <th className="px-4 py-2 text-left">Winner</th>
                <th className="px-4 py-2 text-left">Currency</th>
                <th className="px-4 py-2 text-left">Platform Cut</th>
              </tr>
            </thead>
            <tbody>
              {revenue.length === 0 && (
                <tr><td colSpan={8} className="text-center py-4 text-gray-500">No platform revenue found.</td></tr>
              )}
              {revenue.map((r) => (
                <tr key={r.id} className="hover:bg-gray-700 transition-colors">
                  <td className="px-4 py-2">{new Date(r.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-2">{r.gameType}</td>
                  <td className="px-4 py-2">{r.matchId}</td>
                  <td className="px-4 py-2">{r.player1Id}</td>
                  <td className="px-4 py-2">{r.player2Id}</td>
                  <td className="px-4 py-2">{r.winnerId || '-'}</td>
                  <td className="px-4 py-2">{r.currency}</td>
                  <td className="px-4 py-2">${r.platformCut.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 