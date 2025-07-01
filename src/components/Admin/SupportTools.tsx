import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  XCircle, 
  User, 
  Mail, 
  Phone,
  FileText,
  Download,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Edit,
  Send,
  Archive,
  Flag,
  Star,
  Calendar,
  Tag,
  Users,
  TrendingUp,
  BarChart3,
  Settings
} from 'lucide-react';

interface Dispute {
  id: string;
  userId: string;
  username: string;
  email: string;
  type: 'payment' | 'game_result' | 'technical' | 'fraud' | 'account' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  subject: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: string;
  assignedAt?: Date;
  resolution?: string;
  resolvedAt?: Date;
  userRating?: number;
  tags: string[];
  attachments: {
    id: string;
    name: string;
    type: string;
    size: number;
    uploadedAt: Date;
  }[];
  messages: {
    id: string;
    sender: 'user' | 'admin';
    senderName: string;
    content: string;
    timestamp: Date;
    attachments?: {
      id: string;
      name: string;
      type: string;
      size: number;
    }[];
  }[];
}

interface SupportTicket {
  id: string;
  userId: string;
  username: string;
  category: 'general' | 'technical' | 'billing' | 'account' | 'game';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  subject: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: string;
  responseTime?: number;
  userSatisfaction?: number;
}

export function SupportTools() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [activeTab, setActiveTab] = useState('disputes');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    loadRealData();
    setLoading(false);
  }, []);

  const loadRealData = async () => {
    try {
      // Load disputes from real API - Fixed endpoint
      const disputesResponse = await fetch(import.meta.env.VITE_API_URL + '/api/support/disputes', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (disputesResponse.ok) {
        const disputesData = await disputesResponse.json();
        setDisputes(disputesData.data?.disputes || disputesData.disputes || []);
      } else {
        console.error('Failed to load disputes:', disputesResponse.status);
        setDisputes([]);
      }

      // Load support tickets from real API - Fixed endpoint
      const ticketsResponse = await fetch(import.meta.env.VITE_API_URL + '/api/admin/support-tickets', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (ticketsResponse.ok) {
        const ticketsData = await ticketsResponse.json();
        setTickets(ticketsData.data?.tickets || ticketsData.tickets || []);
      } else {
        console.error('Failed to load support tickets:', ticketsResponse.status);
        setTickets([]);
      }
    } catch (error) {
      console.error('Error loading support data:', error);
      setDisputes([]);
      setTickets([]);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-blue-500';
      case 'investigating':
      case 'in_progress': return 'text-yellow-500';
      case 'resolved': return 'text-green-500';
      case 'closed': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'payment': return 'text-purple-500';
      case 'game_result': return 'text-blue-500';
      case 'technical': return 'text-orange-500';
      case 'fraud': return 'text-red-500';
      case 'account': return 'text-green-500';
      case 'general': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  const filteredDisputes = disputes.filter(dispute => 
    (dispute.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
     dispute.subject.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (filterStatus === 'all' || dispute.status === filterStatus) &&
    (filterPriority === 'all' || dispute.priority === filterPriority) &&
    (filterType === 'all' || dispute.type === filterType)
  );

  const filteredTickets = tickets.filter(ticket => 
    (ticket.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
     ticket.subject.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (filterStatus === 'all' || ticket.status === filterStatus) &&
    (filterPriority === 'all' || ticket.priority === filterPriority) &&
    (filterType === 'all' || ticket.category === filterType)
  );

  const openDisputes = disputes.filter(d => d.status === 'open');
  const urgentDisputes = disputes.filter(d => d.priority === 'urgent');
  const openTickets = tickets.filter(t => t.status === 'open');

  const handleDisputeAction = (disputeId: string, action: string) => {
    setDisputes(prevDisputes =>
      prevDisputes.map(dispute => {
        if (dispute.id === disputeId) {
          switch (action) {
            case 'assign':
              return { ...dispute, assignedTo: 'current-admin', assignedAt: new Date() };
            case 'investigate':
              return { ...dispute, status: 'investigating' as any };
            case 'resolve':
              return { 
                ...dispute, 
                status: 'resolved' as any, 
                resolvedAt: new Date(),
                resolution: 'Issue resolved by admin team.'
              };
            case 'close':
              return { ...dispute, status: 'closed' as any };
            default:
              return dispute;
          }
        }
        return dispute;
      })
    );
  };

  const handleTicketAction = (ticketId: string, action: string) => {
    setTickets(prevTickets =>
      prevTickets.map(ticket => {
        if (ticket.id === ticketId) {
          switch (action) {
            case 'assign':
              return { ...ticket, assignedTo: 'current-admin' };
            case 'progress':
              return { ...ticket, status: 'in_progress' as any };
            case 'resolve':
              return { ...ticket, status: 'resolved' as any };
            case 'close':
              return { ...ticket, status: 'closed' as any };
            default:
              return ticket;
          }
        }
        return ticket;
      })
    );
  };

  const sendMessage = (disputeId: string) => {
    if (!newMessage.trim()) return;

    setDisputes(prevDisputes =>
      prevDisputes.map(dispute => {
        if (dispute.id === disputeId) {
          return {
            ...dispute,
            messages: [
              ...dispute.messages,
              {
                id: `msg-${Date.now()}`,
                sender: 'admin',
                senderName: 'Current Admin',
                content: newMessage,
                timestamp: new Date()
              }
            ],
            updatedAt: new Date()
          };
        }
        return dispute;
      })
    );

    setNewMessage('');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Support Tools</h1>
            <p className="text-gray-400">Dispute management and customer support system</p>
          </div>
          <div className="flex items-center space-x-4">
            <button className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors">
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
            <button className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors">
              <Download className="h-4 w-4" />
              <span>Export Reports</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="bg-gray-800 p-6 border-b border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Open Disputes</p>
                <p className="text-2xl font-bold text-orange-500">{openDisputes.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </div>
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Urgent Disputes</p>
                <p className="text-2xl font-bold text-red-500">{urgentDisputes.length}</p>
              </div>
              <Flag className="h-8 w-8 text-red-500" />
            </div>
          </div>
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Open Tickets</p>
                <p className="text-2xl font-bold text-blue-500">{openTickets.length}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Avg Response Time</p>
                <p className="text-2xl font-bold text-green-500">2.4h</p>
              </div>
              <Clock className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="flex space-x-1 p-4">
          <button
            onClick={() => setActiveTab('disputes')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'disputes'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            <span>Disputes ({disputes.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'tickets'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>Support Tickets ({tickets.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'analytics'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Analytics</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search disputes and tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Types</option>
            <option value="payment">Payment</option>
            <option value="game_result">Game Result</option>
            <option value="technical">Technical</option>
            <option value="fraud">Fraud</option>
            <option value="account">Account</option>
            <option value="general">General</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {/* Disputes Tab */}
            {activeTab === 'disputes' && (
              <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-700">
                  <h3 className="text-lg font-semibold">Dispute Management</h3>
                  <p className="text-gray-400">Handle user disputes and complaints</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Priority</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Subject</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Created</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {filteredDisputes.map(dispute => (
                        <tr key={dispute.id} className="hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{dispute.id}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium">{dispute.username}</div>
                              <div className="text-sm text-gray-400">{dispute.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm ${getTypeColor(dispute.type)}`}>
                              {dispute.type.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <div className={`w-3 h-3 rounded-full ${getPriorityColor(dispute.priority)}`}></div>
                              <span className="text-sm capitalize">{dispute.priority}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(dispute.status)}`}>
                              {dispute.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="max-w-xs">
                              <div className="text-sm font-medium truncate">{dispute.subject}</div>
                              <div className="text-sm text-gray-400 truncate">{dispute.description}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                            {dispute.createdAt.toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center space-x-2">
                              <button 
                                onClick={() => setSelectedDispute(dispute)}
                                className="text-blue-400 hover:text-blue-300"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {dispute.status === 'open' && (
                                <>
                                  <button 
                                    onClick={() => handleDisputeAction(dispute.id, 'assign')}
                                    className="text-green-400 hover:text-green-300"
                                  >
                                    Assign
                                  </button>
                                  <button 
                                    onClick={() => handleDisputeAction(dispute.id, 'investigate')}
                                    className="text-yellow-400 hover:text-yellow-300"
                                  >
                                    Investigate
                                  </button>
                                </>
                              )}
                              {dispute.status === 'investigating' && (
                                <button 
                                  onClick={() => handleDisputeAction(dispute.id, 'resolve')}
                                  className="text-green-400 hover:text-green-300"
                                >
                                  Resolve
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tickets Tab */}
            {activeTab === 'tickets' && (
              <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-700">
                  <h3 className="text-lg font-semibold">Support Tickets</h3>
                  <p className="text-gray-400">Manage customer support requests</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Priority</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Subject</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Response Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {filteredTickets.map(ticket => (
                        <tr key={ticket.id} className="hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{ticket.id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{ticket.username}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm capitalize">{ticket.category.replace('_', ' ')}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <div className={`w-3 h-3 rounded-full ${getPriorityColor(ticket.priority)}`}></div>
                              <span className="text-sm capitalize">{ticket.priority}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
                              {ticket.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="max-w-xs">
                              <div className="text-sm font-medium truncate">{ticket.subject}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                            {ticket.responseTime ? `${ticket.responseTime}h` : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center space-x-2">
                              <button 
                                onClick={() => setSelectedTicket(ticket)}
                                className="text-blue-400 hover:text-blue-300"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {ticket.status === 'open' && (
                                <>
                                  <button 
                                    onClick={() => handleTicketAction(ticket.id, 'assign')}
                                    className="text-green-400 hover:text-green-300"
                                  >
                                    Assign
                                  </button>
                                  <button 
                                    onClick={() => handleTicketAction(ticket.id, 'progress')}
                                    className="text-yellow-400 hover:text-yellow-300"
                                  >
                                    Start
                                  </button>
                                </>
                              )}
                              {ticket.status === 'in_progress' && (
                                <button 
                                  onClick={() => handleTicketAction(ticket.id, 'resolve')}
                                  className="text-green-400 hover:text-green-300"
                                >
                                  Resolve
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h4 className="font-semibold mb-4">Response Time Analytics</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Average Response Time</span>
                        <span className="text-green-500 font-semibold">2.4 hours</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Resolution Rate</span>
                        <span className="text-blue-500 font-semibold">94%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Customer Satisfaction</span>
                        <span className="text-yellow-500 font-semibold">4.2/5</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h4 className="font-semibold mb-4">Dispute Categories</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Payment Issues</span>
                        <span className="text-purple-500 font-semibold">35%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Game Results</span>
                        <span className="text-blue-500 font-semibold">28%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Technical Problems</span>
                        <span className="text-orange-500 font-semibold">22%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Fraud Reports</span>
                        <span className="text-red-500 font-semibold">15%</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h4 className="font-semibold mb-4">Support Performance</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Tickets Resolved Today</span>
                        <span className="text-green-500 font-semibold">24</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Active Disputes</span>
                        <span className="text-orange-500 font-semibold">8</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Urgent Cases</span>
                        <span className="text-red-500 font-semibold">3</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Dispute Detail Modal */}
      {showDisputeModal && selectedDispute && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Dispute Details - {selectedDispute.id}</h3>
              <button 
                onClick={() => setShowDisputeModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="font-semibold mb-3">Dispute Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Type:</span>
                    <span className={getTypeColor(selectedDispute.type)}>{selectedDispute.type.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Priority:</span>
                    <span className="capitalize">{selectedDispute.priority}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Status:</span>
                    <span className={getStatusColor(selectedDispute.status)}>{selectedDispute.status}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Assigned To:</span>
                    <span>{selectedDispute.assignedTo || 'Unassigned'}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3">User Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span>{selectedDispute.username}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>{selectedDispute.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>Created: {selectedDispute.createdAt.toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-semibold mb-3">Subject & Description</h4>
              <div className="bg-gray-700 p-4 rounded-lg">
                <h5 className="font-medium mb-2">{selectedDispute.subject}</h5>
                <p className="text-gray-300">{selectedDispute.description}</p>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-semibold mb-3">Messages</h4>
              <div className="space-y-4 max-h-64 overflow-y-auto">
                {selectedDispute.messages.map(message => (
                  <div key={message.id} className={`p-3 rounded-lg ${
                    message.sender === 'admin' ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-gray-700'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{message.senderName}</span>
                      <span className="text-xs text-gray-400">{message.timestamp.toLocaleString()}</span>
                    </div>
                    <p className="text-sm">{message.content}</p>
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2">
                        {message.attachments.map(att => (
                          <div key={att.id} className="flex items-center space-x-2 text-xs text-gray-400">
                            <FileText className="h-3 w-3" />
                            <span>{att.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-semibold mb-3">Send Response</h4>
              <div className="flex space-x-3">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your response..."
                  className="flex-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  rows={3}
                />
                <button
                  onClick={() => sendMessage(selectedDispute.id)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <Send className="h-4 w-4" />
                  <span>Send</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setShowDisputeModal(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
              >
                Close
              </button>
              <button className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors">
                Resolve Dispute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
