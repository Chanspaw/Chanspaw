import React, { useState, useEffect } from 'react';
import { Eye, CheckCircle, XCircle, Clock, RefreshCw, Download, Plus } from 'lucide-react';
import { ownerProfitAPI, OwnerProfitStats, OwnerWithdrawal } from '../../services/ownerProfitAPI';

export function OwnerProfitManagement() {
  const [profits, setProfits] = useState<OwnerProfitStats | null>(null);
  const [withdrawals, setWithdrawals] = useState<OwnerWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: '',
    method: 'bank_transfer',
    accountDetails: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profitsResponse, withdrawalsResponse] = await Promise.all([
        ownerProfitAPI.getAvailableProfits(),
        ownerProfitAPI.getWithdrawals()
      ]);
      if (profitsResponse.success) setProfits(profitsResponse.data);
      if (withdrawalsResponse.success) setWithdrawals(withdrawalsResponse.data.withdrawals);
    } catch (error) {
      setMessage({ type: 'error', text: 'Error loading owner profit data' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await ownerProfitAPI.createWithdrawal({
        amount: parseFloat(withdrawalForm.amount),
        method: withdrawalForm.method,
        accountDetails: withdrawalForm.accountDetails ? JSON.parse(withdrawalForm.accountDetails) : undefined,
        notes: withdrawalForm.notes
      });
      if (response.success) {
        setShowWithdrawalModal(false);
        setWithdrawalForm({ amount: '', method: 'bank_transfer', accountDetails: '', notes: '' });
        await loadData();
        setMessage({ type: 'success', text: 'Withdrawal request created successfully' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error creating withdrawal request' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-500';
      case 'APPROVED': return 'text-blue-500';
      case 'PROCESSING': return 'text-yellow-500';
      case 'PENDING': return 'text-orange-500';
      case 'REJECTED': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'APPROVED': return <CheckCircle className="h-4 w-4" />;
      case 'PROCESSING': return <Clock className="h-4 w-4" />;
      case 'PENDING': return <Clock className="h-4 w-4" />;
      case 'REJECTED': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="bg-gray-800 border-b border-gray-700 p-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Owner Profit</h1>
          <p className="text-gray-400">Platform owner (admin) receives 10% of all real money game profits.</p>
        </div>
        <button onClick={loadData} className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors">
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </button>
      </div>

      {message && (
        <div className="p-4 mx-6 mt-4 rounded-lg bg-gray-800 text-gray-300 border border-gray-700">
          <div className="flex items-center justify-between">
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="text-gray-400 hover:text-gray-200">×</button>
          </div>
        </div>
      )}

      <div className="p-6">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:space-x-8 space-y-4 md:space-y-0">
          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="text-gray-400 text-sm mb-1">Total Profits</div>
                <div className="text-lg font-bold">${profits?.totalProfits.toFixed(2) || '0.00'}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="text-gray-400 text-sm mb-1">Total Withdrawn</div>
                <div className="text-lg font-bold">${profits?.totalWithdrawn.toFixed(2) || '0.00'}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="text-gray-400 text-sm mb-1">Available for Withdrawal</div>
                <div className="text-lg font-bold">${profits?.availableProfits.toFixed(2) || '0.00'}</div>
              </div>
            </div>
          </div>
          <div>
            <button onClick={() => setShowWithdrawalModal(true)} className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors">
              <Plus className="h-4 w-4" />
              <span>Request Withdrawal</span>
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-x-auto">
          <div className="p-6 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Owner Withdrawals</h3>
            <button onClick={loadData} className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors">
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Requested</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Processed</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">No withdrawals found.</td>
                </tr>
              ) : (
                withdrawals.map((withdrawal) => (
                  <tr key={withdrawal.id} className="hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-green-500 font-semibold">${withdrawal.amount.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap capitalize">{withdrawal.method.replace('_', ' ')}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`flex items-center ${getStatusColor(withdrawal.status)}`}>
                        {getStatusIcon(withdrawal.status)}
                        <span className="ml-1">{withdrawal.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(withdrawal.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{withdrawal.processedAt ? new Date(withdrawal.processedAt).toLocaleDateString() : '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button className="text-blue-400 hover:text-blue-300"><Eye className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Withdrawal Modal */}
      {showWithdrawalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Request Owner Withdrawal</h3>
            <form onSubmit={handleCreateWithdrawal}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Amount ($)</label>
                  <input type="number" step="0.01" value={withdrawalForm.amount} onChange={(e) => setWithdrawalForm({ ...withdrawalForm, amount: e.target.value })} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Withdrawal Method</label>
                  <select value={withdrawalForm.method} onChange={(e) => setWithdrawalForm({ ...withdrawalForm, method: e.target.value })} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="paypal">PayPal</option>
                    <option value="crypto">Cryptocurrency</option>
                    <option value="check">Check</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Account Details (JSON)</label>
                  <textarea value={withdrawalForm.accountDetails} onChange={(e) => setWithdrawalForm({ ...withdrawalForm, accountDetails: e.target.value })} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" rows={3} placeholder='{"account": "123456789", "routing": "987654321"}' />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
                  <textarea value={withdrawalForm.notes} onChange={(e) => setWithdrawalForm({ ...withdrawalForm, notes: e.target.value })} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" rows={2} />
                </div>
              </div>
              <div className="flex space-x-3 mt-6">
                <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">Create Withdrawal</button>
                <button type="button" onClick={() => setShowWithdrawalModal(false)} className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 