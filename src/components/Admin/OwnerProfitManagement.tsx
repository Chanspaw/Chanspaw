import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

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
    <div className="bg-neutral-900 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Platform Revenue</h2>
        <button onClick={() => setShowWithdrawModal(true)} className="px-3 py-1 bg-gray-800 text-gray-200 rounded hover:bg-gray-700">Request Withdrawal</button>
      </div>
      <div className="mb-2 text-gray-300">Available Profit: <span className="font-bold text-white">${availableProfit.toFixed(2)}</span></div>
      {message && <div className="mb-2 text-gray-400">{message}</div>}
      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-white">Request Withdrawal</h3>
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Amount</label>
                <input type="number" min="1" step="0.01" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white" required />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Method</label>
                <select value={withdrawMethod} onChange={e => setWithdrawMethod(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white">
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="paypal">PayPal</option>
                  <option value="crypto">Cryptocurrency</option>
                  <option value="check">Check</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Account Details</label>
                <input type="text" value={withdrawAccount} onChange={e => setWithdrawAccount(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white" required />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Notes</label>
                <textarea value={withdrawNotes} onChange={e => setWithdrawNotes(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white" rows={2} />
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
      <div className="mt-6">
        <h3 className="text-base font-semibold text-white mb-2">Withdrawal Requests</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-gray-300">
            <thead>
              <tr>
                <th className="px-2 py-1">Date</th>
                <th className="px-2 py-1">Amount</th>
                <th className="px-2 py-1">Method</th>
                <th className="px-2 py-1">Account</th>
                <th className="px-2 py-1">Status</th>
                <th className="px-2 py-1">Notes</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.map(w => (
                <tr key={w.id}>
                  <td className="px-2 py-1">{new Date(w.createdAt).toLocaleString()}</td>
                  <td className="px-2 py-1">${w.amount.toFixed(2)}</td>
                  <td className="px-2 py-1">{w.method}</td>
                  <td className="px-2 py-1">{w.accountDetails || '-'}</td>
                  <td className="px-2 py-1">{w.status}</td>
                  <td className="px-2 py-1">{w.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Platform Revenue Table (as before) */}
      <div className="mt-8">
        <h3 className="text-base font-semibold text-white mb-2">Platform Revenue</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-gray-300">
            <thead>
              <tr>
                <th className="px-2 py-1">Date</th>
                <th className="px-2 py-1">Game</th>
                <th className="px-2 py-1">Match ID</th>
                <th className="px-2 py-1">Player 1</th>
                <th className="px-2 py-1">Player 2</th>
                <th className="px-2 py-1">Winner</th>
                <th className="px-2 py-1">Currency</th>
                <th className="px-2 py-1">Platform Cut</th>
              </tr>
            </thead>
            <tbody>
              {revenue.map((r) => (
                <tr key={r.id}>
                  <td className="px-2 py-1">{new Date(r.timestamp).toLocaleString()}</td>
                  <td className="px-2 py-1">{r.gameType}</td>
                  <td className="px-2 py-1">{r.matchId}</td>
                  <td className="px-2 py-1">{r.player1Id}</td>
                  <td className="px-2 py-1">{r.player2Id}</td>
                  <td className="px-2 py-1">{r.winnerId || '-'}</td>
                  <td className="px-2 py-1">{r.currency}</td>
                  <td className="px-2 py-1">${r.platformCut.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 