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

export function OwnerProfitManagement() {
  const [revenue, setRevenue] = useState<PlatformRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/platform-revenue')
      .then(res => res.json())
      .then(data => {
        setRevenue(data.data || []);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load platform revenue');
        setLoading(false);
      });
  }, []);

  const handleExport = () => {
    window.open('/api/admin/platform-revenue/export', '_blank');
  };

  const total = revenue.reduce((sum, r) => sum + (r.platformCut || 0), 0);

  return (
    <div className="bg-neutral-900 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Platform Revenue</h2>
        <button onClick={handleExport} className="flex items-center gap-2 px-3 py-1 bg-gray-800 text-gray-200 rounded hover:bg-gray-700">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>
      <div className="mb-2 text-gray-300">Total Revenue: <span className="font-bold text-white">${total.toFixed(2)}</span></div>
      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : error ? (
        <div className="text-gray-400">{error}</div>
      ) : (
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
      )}
    </div>
  );
} 