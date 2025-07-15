import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Send, 
  Clock, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Info,
  Edit, 
  Plus, 
  Trash2, 
  Save, 
  X, 
  Eye,
  Settings,
  Calendar,
  Target,
  Filter,
  Search,
  Download,
  Copy,
  Check,
  AlertCircle,
  Zap,
  Shield,
  DollarSign,
  UserCheck,
  UserX,
  Activity,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  target: 'all' | 'specific' | 'admin';
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  scheduledFor?: string;
  sentAt?: string;
  recipients: number;
  openedCount: number;
  createdAt: string;
  createdBy: string;
}

interface ScheduledMessage {
  id: string;
  title: string;
  message: string;
  type: 'announcement' | 'reminder' | 'promotion';
  target: 'all' | 'new_users' | 'inactive_users' | 'vip_users';
  scheduledFor: string;
  isRecurring: boolean;
  recurringPattern?: string;
  status: 'scheduled' | 'sent' | 'cancelled';
  createdAt: string;
}

interface AdminAlert {
  id: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'security' | 'financial' | 'system' | 'user' | 'game';
  status: 'new' | 'acknowledged' | 'resolved';
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  assignedTo?: string;
}

interface NotificationTemplate {
  id: string;
  name: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: string;
  isActive: boolean;
  createdAt: string;
}

export function NotificationSystem() {
  const [activeTab, setActiveTab] = useState<'notifications' | 'scheduled' | 'alerts' | 'templates'>('notifications');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'notification' | 'scheduled' | 'template'>('notification');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Real data from API
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [adminAlerts, setAdminAlerts] = useState<AdminAlert[]>([]);
  const [notificationTemplates, setNotificationTemplates] = useState<NotificationTemplate[]>([]);

  useEffect(() => {
    loadNotificationData();
  }, []);

  const loadNotificationData = async () => {
    try {
      // Load notifications from real API
      const notificationsResponse = await fetch(import.meta.env.VITE_API_URL + '/api/notifications', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json();
        setNotifications(notificationsData.data?.notifications || notificationsData.notifications || []);
      } else {
        console.error('Failed to load notifications:', notificationsResponse.status);
        setNotifications([]);
      }

      // Load scheduled messages from real API
      const scheduledResponse = await fetch(import.meta.env.VITE_API_URL + '/api/notifications/scheduled', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (scheduledResponse.ok) {
        const scheduledData = await scheduledResponse.json();
        setScheduledMessages(scheduledData.data?.messages || scheduledData.messages || []);
      } else {
        console.error('Failed to load scheduled messages:', scheduledResponse.status);
        setScheduledMessages([]);
      }

      // Load admin alerts from real API
      const alertsResponse = await fetch(import.meta.env.VITE_API_URL + '/api/admin/alerts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        setAdminAlerts(alertsData.data?.alerts || alertsData.alerts || []);
      } else {
        console.error('Failed to load admin alerts:', alertsResponse.status);
        setAdminAlerts([]);
      }

      // Load notification templates from real API
      const templatesResponse = await fetch(import.meta.env.VITE_API_URL + '/api/notifications/templates', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json();
        setNotificationTemplates(templatesData.data?.templates || templatesData.templates || []);
      } else {
        console.error('Failed to load notification templates:', templatesResponse.status);
        setNotificationTemplates([]);
      }
    } catch (error) {
      console.error('Error loading notification data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = (type: 'notification' | 'scheduled' | 'template') => {
    setModalType(type);
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEdit = (item: any, type: 'notification' | 'scheduled' | 'template') => {
    setModalType(type);
    setEditingItem(item);
    setShowModal(true);
  };

  const handleDelete = (id: string, type: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      console.log(`Deleting ${type} with id: ${id}`);
    }
  };

  const handleSave = (data: any) => {
    console.log('Saving:', data);
    setShowModal(false);
  };

  const handleAcknowledgeAlert = (id: string) => {
    console.log('Acknowledging alert:', id);
  };

  const handleResolveAlert = (id: string) => {
    console.log('Resolving alert:', id);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
      case 'error': return <XCircle className="h-5 w-5 text-red-400" />;
      default: return <Info className="h-5 w-5 text-blue-400" />;
    }
  };

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Push Notifications & In-App Messages</h3>
        <button
          onClick={() => handleAddNew('notification')}
          className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Send Notification</span>
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gaming-dark rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Sent</p>
              <p className="text-white text-2xl font-bold">0</p>
            </div>
            <Send className="h-8 w-8 text-gaming-accent" />
          </div>
        </div>
        <div className="bg-gaming-dark rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Open Rate</p>
              <p className="text-white text-2xl font-bold">0%</p>
            </div>
            <Eye className="h-8 w-8 text-green-400" />
          </div>
        </div>
        <div className="bg-gaming-dark rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Scheduled</p>
              <p className="text-white text-2xl font-bold">0</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-400" />
          </div>
        </div>
        <div className="bg-gaming-dark rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Failed</p>
              <p className="text-white text-2xl font-bold">0</p>
            </div>
            <XCircle className="h-8 w-8 text-red-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <select
          value={selectedFilter}
          onChange={(e) => setSelectedFilter(e.target.value)}
          className="px-3 py-2 bg-gaming-dark border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
        >
          <option value="all">All Notifications</option>
          <option value="sent">Sent</option>
          <option value="scheduled">Scheduled</option>
          <option value="draft">Draft</option>
          <option value="failed">Failed</option>
        </select>
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search notifications..."
            className="px-3 py-2 bg-gaming-dark border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
          />
        </div>
      </div>

      <div className="text-center py-12">
        <Bell className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-white text-lg font-medium mb-2">No Notifications Yet</h3>
        <p className="text-gray-400 mb-4">Send your first notification to engage with users</p>
        <button
          onClick={() => handleAddNew('notification')}
          className="bg-gray-700 text-white px-6 py-3 rounded-lg hover:opacity-90 flex items-center space-x-2 mx-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Send First Notification</span>
        </button>
      </div>
    </div>
  );

  const renderScheduledTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Scheduled Messages & Announcements</h3>
        <button
          onClick={() => handleAddNew('scheduled')}
          className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Schedule Message</span>
        </button>
      </div>

      <div className="text-center py-12">
        <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-white text-lg font-medium mb-2">No Scheduled Messages</h3>
        <p className="text-gray-400 mb-4">Schedule announcements and reminders for your users</p>
        <button
          onClick={() => handleAddNew('scheduled')}
          className="bg-gray-700 text-white px-6 py-3 rounded-lg hover:opacity-90 flex items-center space-x-2 mx-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Schedule First Message</span>
        </button>
      </div>
    </div>
  );

  const renderAlertsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Admin Alerts & System Notifications</h3>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-red-500/20 text-red-400 px-3 py-2 rounded-lg">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">0 Critical</span>
          </div>
          <div className="flex items-center space-x-2 bg-yellow-500/20 text-yellow-400 px-3 py-2 rounded-lg">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">0 Pending</span>
          </div>
        </div>
      </div>

      {/* Alert Categories */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-gaming-dark rounded-lg p-4 border border-gray-700 text-center">
          <Shield className="h-8 w-8 text-red-400 mx-auto mb-2" />
          <p className="text-white font-medium">Security</p>
          <p className="text-gray-400 text-sm">0 alerts</p>
        </div>
        <div className="bg-gaming-dark rounded-lg p-4 border border-gray-700 text-center">
          <DollarSign className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
          <p className="text-white font-medium">Financial</p>
          <p className="text-gray-400 text-sm">0 alerts</p>
        </div>
        <div className="bg-gaming-dark rounded-lg p-4 border border-gray-700 text-center">
          <Activity className="h-8 w-8 text-blue-400 mx-auto mb-2" />
          <p className="text-white font-medium">System</p>
          <p className="text-gray-400 text-sm">0 alerts</p>
        </div>
        <div className="bg-gaming-dark rounded-lg p-4 border border-gray-700 text-center">
          <Users className="h-8 w-8 text-green-400 mx-auto mb-2" />
          <p className="text-white font-medium">User</p>
          <p className="text-gray-400 text-sm">0 alerts</p>
        </div>
        <div className="bg-gaming-dark rounded-lg p-4 border border-gray-700 text-center">
          <Zap className="h-8 w-8 text-purple-400 mx-auto mb-2" />
          <p className="text-white font-medium">Game</p>
          <p className="text-gray-400 text-sm">0 alerts</p>
        </div>
      </div>

      <div className="text-center py-12">
        <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
        <h3 className="text-white text-lg font-medium mb-2">All Systems Operational</h3>
        <p className="text-gray-400 mb-4">No active alerts at the moment</p>
      </div>
    </div>
  );

  const renderTemplatesTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Notification Templates</h3>
        <button
          onClick={() => handleAddNew('template')}
          className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Create Template</span>
        </button>
      </div>

      <div className="text-center py-12">
        <Settings className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-white text-lg font-medium mb-2">No Templates Yet</h3>
        <p className="text-gray-400 mb-4">Create reusable notification templates</p>
        <button
          onClick={() => handleAddNew('template')}
          className="bg-gray-700 text-white px-6 py-3 rounded-lg hover:opacity-90 flex items-center space-x-2 mx-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Create First Template</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-card-gradient text-white">
      <div className="p-6">
        <div className="bg-gaming-dark rounded-xl p-6 border border-gray-700 mb-6">
          <h1 className="text-3xl font-bold text-gaming-accent">Notification System</h1>
          <div className="flex items-center space-x-3">
            <button className="bg-gaming-gold text-gaming-dark px-4 py-2 rounded-lg hover:opacity-90 flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Export Logs</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-gaming-dark rounded-lg p-1 border border-gray-700">
          <div className="flex space-x-1">
            {[
              { id: 'notifications', label: 'Notifications', icon: Bell },
              { id: 'scheduled', label: 'Scheduled', icon: Clock },
              { id: 'alerts', label: 'Admin Alerts', icon: AlertTriangle },
              { id: 'templates', label: 'Templates', icon: Settings }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-gaming-accent text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-card-gradient rounded-xl p-6 border border-gray-700">
          {activeTab === 'notifications' && renderNotificationsTab()}
          {activeTab === 'scheduled' && renderScheduledTab()}
          {activeTab === 'alerts' && renderAlertsTab()}
          {activeTab === 'templates' && renderTemplatesTab()}
        </div>

        {/* Modal for adding/editing content */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gaming-dark rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">
                  {editingItem ? 'Edit' : 'Create'} {modalType.charAt(0).toUpperCase() + modalType.slice(1)}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
                    placeholder={`Enter ${modalType} title...`}
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Message
                  </label>
                  <textarea
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
                    placeholder={`Enter ${modalType} message...`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Type
                    </label>
                    <select className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent">
                      <option value="info">Info</option>
                      <option value="success">Success</option>
                      <option value="warning">Warning</option>
                      <option value="error">Error</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Target
                    </label>
                    <select className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent">
                      <option value="all">All Users</option>
                      <option value="specific">Specific Users</option>
                      <option value="admin">Admins Only</option>
                    </select>
                  </div>
                </div>

                {modalType === 'scheduled' && (
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Schedule Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gaming-accent"
                    />
                  </div>
                )}

                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" defaultChecked />
                    <span className="text-gray-300 text-sm">Active</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSave({})}
                  className="bg-gaming-accent text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>Save</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
