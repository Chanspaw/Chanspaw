import React, { useState, useEffect } from 'react';

interface ComplianceReport {
  id: string;
  type: string;
  status: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
}

interface ComplianceViolation {
  id: string;
  userId: string;
  username: string;
  rule: string;
  status: string;
  createdAt: string;
  resolvedAt?: string;
  resolution?: string;
}

export default function ComplianceManagement() {
  const [activeTab, setActiveTab] = useState<'reports' | 'rules' | 'violations' | 'risk'>('reports');
  const [reports, setReports] = useState<ComplianceReport[]>([]);
  const [rules, setRules] = useState<ComplianceRule[]>([]);
  const [violations, setViolations] = useState<ComplianceViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setLoading(true);
    if (activeTab === 'reports') loadReports();
    if (activeTab === 'rules') loadRules();
    if (activeTab === 'violations') loadViolations();
    setLoading(false);
  }, [activeTab]);

  const loadReports = async () => {
    try {
      const res = await fetch('/api/compliance/reports', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}` }
      });
      const data = await res.json();
      setReports(data.data || []);
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to load compliance reports' });
    }
  };

  const loadRules = async () => {
    try {
      const res = await fetch('/api/compliance/rules', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}` }
      });
      const data = await res.json();
      setRules(data.data || []);
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to load compliance rules' });
    }
  };

  const loadViolations = async () => {
    try {
      const res = await fetch('/api/compliance/violations', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}` }
      });
      const data = await res.json();
      setViolations(data.data || []);
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to load compliance violations' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="bg-gray-800 border-b border-gray-700 p-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Compliance Management</h1>
          <p className="text-gray-400">Monitor compliance reports, rules, and violations</p>
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
          <button onClick={() => setActiveTab('reports')} className={`px-4 py-2 rounded-lg ${activeTab === 'reports' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400'}`}>Reports</button>
          <button onClick={() => setActiveTab('rules')} className={`px-4 py-2 rounded-lg ${activeTab === 'rules' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400'}`}>Rules</button>
          <button onClick={() => setActiveTab('violations')} className={`px-4 py-2 rounded-lg ${activeTab === 'violations' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400'}`}>Violations</button>
          <button onClick={() => setActiveTab('risk')} className={`px-4 py-2 rounded-lg ${activeTab === 'risk' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400'}`}>Risk Scoring</button>
        </div>
        {activeTab === 'reports' && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-x-auto">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Compliance Reports</h3>
            </div>
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Updated</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center text-gray-400 py-8">Loading...</td></tr>
                ) : reports.length === 0 ? (
                  <tr><td colSpan={5} className="text-center text-gray-400 py-8">No reports found.</td></tr>
                ) : reports.map(report => (
                  <tr key={report.id} className="hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">{report.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{report.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{report.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(report.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(report.updatedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {activeTab === 'rules' && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-x-auto">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Compliance Rules</h3>
            </div>
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Active</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="text-center text-gray-400 py-8">Loading...</td></tr>
                ) : rules.length === 0 ? (
                  <tr><td colSpan={4} className="text-center text-gray-400 py-8">No rules found.</td></tr>
                ) : rules.map(rule => (
                  <tr key={rule.id} className="hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">{rule.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{rule.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{rule.isActive ? 'Yes' : 'No'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(rule.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {activeTab === 'violations' && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-x-auto">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Compliance Violations</h3>
            </div>
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Rule</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Resolved</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Resolution</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center text-gray-400 py-8">Loading...</td></tr>
                ) : violations.length === 0 ? (
                  <tr><td colSpan={6} className="text-center text-gray-400 py-8">No violations found.</td></tr>
                ) : violations.map(v => (
                  <tr key={v.id} className="hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">{v.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{v.rule}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{v.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(v.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{v.resolvedAt ? new Date(v.resolvedAt).toLocaleDateString() : '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{v.resolution || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {activeTab === 'risk' && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h3 className="text-lg font-semibold mb-4">User Risk Scoring</h3>
            <p className="text-gray-400">Search for a user to view their risk score.</p>
            {/* Implement risk scoring UI as needed */}
          </div>
        )}
      </div>
    </div>
  );
} 