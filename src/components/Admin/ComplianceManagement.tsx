import React, { useState } from 'react';

const tabs = [
  { label: 'Reports', key: 'reports' },
  { label: 'Rules', key: 'rules' },
  { label: 'Violations', key: 'violations' },
  { label: 'Risk Scoring', key: 'risk' },
];

export default function ComplianceManagement() {
  const [activeTab, setActiveTab] = useState('reports');

  return (
    <div className="admin-compliance-management p-6">
      <h2 className="text-2xl font-bold mb-4">Compliance Management</h2>
      <div className="flex space-x-4 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`px-4 py-2 rounded ${activeTab === tab.key ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="bg-white rounded shadow p-4 min-h-[300px]">
        {activeTab === 'reports' && (
          <div>
            <h3 className="text-xl font-semibold mb-2">Compliance Reports</h3>
            <p>View, filter, and download compliance reports here. (To be implemented)</p>
          </div>
        )}
        {activeTab === 'rules' && (
          <div>
            <h3 className="text-xl font-semibold mb-2">Compliance Rules</h3>
            <p>Manage compliance rules. (To be implemented)</p>
          </div>
        )}
        {activeTab === 'violations' && (
          <div>
            <h3 className="text-xl font-semibold mb-2">Compliance Violations</h3>
            <p>Review and resolve compliance violations. (To be implemented)</p>
          </div>
        )}
        {activeTab === 'risk' && (
          <div>
            <h3 className="text-xl font-semibold mb-2">User Risk Scoring</h3>
            <p>View user risk scores. (To be implemented)</p>
          </div>
        )}
      </div>
    </div>
  );
} 