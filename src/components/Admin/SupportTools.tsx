import React, { useState, useEffect } from 'react';

interface Dispute {
  id: string;
  userId: string;
  username: string;
  type: string;
  status: string;
  subject: string;
  description: string;
  createdAt: string;
  updatedAt?: string;
}

interface SupportTicket {
  id: string;
  userId: string;
  username: string;
  category: string;
  status: string;
  priority: string;
  subject: string;
  description: string;
  createdAt: string;
  updatedAt?: string;
}

export function SupportTools() {
  const [activeTab, setActiveTab] = useState<'disputes' | 'tickets'>('disputes');
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setLoading(true);
    if (activeTab === 'disputes') loadDisputes();
    if (activeTab === 'tickets') loadTickets();
    setLoading(false);
  }, [activeTab]);

  const loadDisputes = async () => {
    try {
      const res = await fetch('/api/support/disputes', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}` }
      });
      const data = await res.json();
      setDisputes(data.data?.disputes || []);
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to load disputes' });
    }
  };

  const loadTickets = async () => {
    try {
      const res = await fetch('/api/admin/support-tickets', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}` }
      });
      const data = await res.json();
      setTickets(data.data?.tickets || []);
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to load support tickets' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="bg-gray-800 border-b border-gray-700 p-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Support & Disputes</h1>
          <p className="text-gray-400">Manage user disputes and support tickets</p>
        </div>
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
        <div className="mb-6 flex space-x-4">
          <button onClick={() => setActiveTab('disputes')} className={`px-4 py-2 rounded-lg ${activeTab === 'disputes' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400'}`}>Disputes</button>
          <button onClick={() => setActiveTab('tickets')} className={`px-4 py-2 rounded-lg ${activeTab === 'tickets' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400'}`}>Support Tickets</button>
        </div>
        {activeTab === 'disputes' && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-x-auto">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold">User Disputes</h3>
            </div>
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center text-gray-400 py-8">Loading...</td></tr>
                ) : disputes.length === 0 ? (
                  <tr><td colSpan={5} className="text-center text-gray-400 py-8">No disputes found.</td></tr>
                ) : disputes.map(dispute => (
                  <tr key={dispute.id} className="hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">{dispute.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{dispute.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{dispute.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{dispute.subject}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(dispute.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {activeTab === 'tickets' && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-x-auto">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Support Tickets</h3>
            </div>
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center text-gray-400 py-8">Loading...</td></tr>
                ) : tickets.length === 0 ? (
                  <tr><td colSpan={6} className="text-center text-gray-400 py-8">No support tickets found.</td></tr>
                ) : tickets.map(ticket => (
                  <tr key={ticket.id} className="hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">{ticket.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{ticket.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{ticket.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{ticket.priority}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{ticket.subject}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(ticket.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 
