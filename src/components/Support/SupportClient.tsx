import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  Ticket, 
  HelpCircle, 
  Phone, 
  Send, 
  Paperclip, 
  X, 
  CheckCircle, 
  AlertCircle,
  Clock,
  User,
  Search,
  Filter,
  Plus,
  FileText,
  Video,
  Mail,
  Star,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import { getAIChatResponse } from '../../services/supportAPI';

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'technical' | 'billing' | 'account' | 'game' | 'other';
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  username: string;
  assignedTo?: string;
  messages: Message[];
}

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'support';
  timestamp: Date;
  attachments?: string[];
}

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'support';
  timestamp: Date;
  isTyping?: boolean;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  helpful: number;
  notHelpful: number;
  tags: string[];
}

export function SupportClient() {
  const [activeTab, setActiveTab] = useState<'chat' | 'tickets' | 'faq' | 'emergency'>('chat');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isChatConnected, setIsChatConnected] = useState(false);
  const [supportTyping, setSupportTyping] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    category: 'technical' as const,
    priority: 'medium' as const
  });
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [faqItems, setFaqItems] = useState<FAQItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [emergencyContact, setEmergencyContact] = useState({
    phone: '+1-800-SUPPORT',
    email: 'emergency@chanspaw.com',
    available: true
  });
  const [aiTries, setAiTries] = useState(1);
  const [aiEscalation, setAiEscalation] = useState(false);

  useEffect(() => {
    loadTickets();
    loadFAQ();
    initializeChat();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const loadTickets = async () => {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/api/support/tickets', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTickets(data.data?.tickets || data.tickets || []);
      } else {
        console.error('Failed to load tickets:', response.status);
        setTickets([]);
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
      setTickets([]);
    }
  };

  const loadFAQ = async () => {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/api/support/faq', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFaqItems(data.data?.faqs || data.faqs || []);
      } else {
        console.error('Failed to load FAQ:', response.status);
        setFaqItems([]);
      }
    } catch (error) {
      console.error('Error loading FAQ:', error);
      setFaqItems([]);
    }
  };

  const initializeChat = () => {
    // Simulate chat connection
    setTimeout(() => {
      setIsChatConnected(true);
      setChatMessages([
        {
          id: '1',
          content: 'Hello! Welcome to ChansPaw Support. How can I help you today?',
          sender: 'support',
          timestamp: new Date()
        }
      ]);
    }, 1000);
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: newMessage,
      sender: 'user',
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setSupportTyping(true);
    try {
      const messages = [
        ...chatMessages.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.content })),
        { role: 'user', content: newMessage }
      ];
      const res = await getAIChatResponse(messages, aiTries);
      setSupportTyping(false);
      if (res.escalation) {
        setAiEscalation(true);
        setAiTries(1);
        setChatMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          content: res.message,
          sender: 'support',
          timestamp: new Date()
        }]);
      } else {
        setAiTries(aiTries + 1);
        setChatMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          content: res.message,
          sender: 'support',
          timestamp: new Date()
        }]);
      }
    } catch (e) {
      setSupportTyping(false);
      setChatMessages(prev => [...prev, {
        id: (Date.now() + 2).toString(),
        content: 'Sorry, there was a problem contacting support. Please try again.',
        sender: 'support',
        timestamp: new Date()
      }]);
    }
  };

  const createTicket = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch('/api/support/tickets', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(newTicket)
      // });
      
      const ticket: Ticket = {
        id: Date.now().toString(),
        ...newTicket,
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'current-user',
        username: 'Current User',
        messages: []
      };

      setTickets(prev => [ticket, ...prev]);
      setNewTicket({
        subject: '',
        description: '',
        category: 'technical',
        priority: 'medium'
      });
      setShowNewTicketForm(false);
    } catch (error) {
      console.error('Error creating ticket:', error);
    }
  };

  const handleFaqHelpful = (faqId: string, helpful: boolean) => {
    setFaqItems(prev => 
      prev.map(item => 
        item.id === faqId 
          ? { 
              ...item, 
              helpful: helpful ? item.helpful + 1 : item.helpful,
              notHelpful: helpful ? item.notHelpful : item.notHelpful + 1
            }
          : item
      )
    );
  };

  const filteredFAQ = faqItems.filter(item => 
    (item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
     item.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
     item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))) &&
    (selectedCategory === 'all' || item.category === selectedCategory)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-blue-500';
      case 'in_progress': return 'text-yellow-500';
      case 'resolved': return 'text-green-500';
      case 'closed': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Support Center</h1>
            <p className="text-gray-400">Get help with your account, games, and payments</p>
          </div>
          <div className="flex items-center space-x-4">
            {emergencyContact.available && (
              <div className="flex items-center space-x-2 bg-red-600 px-4 py-2 rounded-lg">
                <Phone className="h-4 w-4" />
                <span className="font-semibold">24/7 Emergency: {emergencyContact.phone}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="flex space-x-1 p-4">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'chat'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <MessageCircle className="h-4 w-4" />
            <span>Live Chat</span>
            {isChatConnected && (
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'tickets'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Ticket className="h-4 w-4" />
            <span>Support Tickets</span>
            {tickets.filter(t => t.status === 'open').length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {tickets.filter(t => t.status === 'open').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'faq'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <HelpCircle className="h-4 w-4" />
            <span>FAQ & Help</span>
          </button>
          <button
            onClick={() => setActiveTab('emergency')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'emergency'
                ? 'bg-red-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <AlertCircle className="h-4 w-4" />
            <span>Emergency Support</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Live Chat Tab */}
        {activeTab === 'chat' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-700 bg-gray-750">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${isChatConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="font-semibold">
                      {isChatConnected ? 'AI Support Chat' : 'Connecting...'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">
                    24/7 Smart AI Assistant
                  </div>
                </div>
              </div>
              
              <div className="h-96 overflow-y-auto p-4 space-y-4">
                {chatMessages.map(message => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.sender === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-white'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {supportTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-700 text-white px-4 py-2 rounded-lg">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              
              <div className="p-4 border-t border-gray-700">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    disabled={supportTyping || aiEscalation}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={supportTyping || aiEscalation || !newMessage.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
                {aiEscalation && (
                  <div className="mt-4 p-3 bg-yellow-900/40 border border-yellow-700 rounded-lg text-yellow-200 flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-yellow-400" />
                    <span>
                      This issue may require human support. Please contact <a href="mailto:chanspaw1v1@gmail.com" className="underline text-yellow-300">chanspaw1v1@gmail.com</a> or wait for an admin to assist you.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Support Tickets Tab */}
        {activeTab === 'tickets' && (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Support Tickets</h2>
              <button
                onClick={() => setShowNewTicketForm(true)}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>New Ticket</span>
              </button>
            </div>

            {tickets.length === 0 ? (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
                <Ticket className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-300 mb-2">No support tickets</h3>
                <p className="text-gray-500 mb-4">You haven't created any support tickets yet.</p>
                <button
                  onClick={() => setShowNewTicketForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
                >
                  Create Your First Ticket
                </button>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Ticket</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Priority</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Created</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {tickets.map(ticket => (
                        <tr key={ticket.id} className="hover:bg-gray-700">
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm font-medium">{ticket.subject}</div>
                              <div className="text-sm text-gray-400 truncate max-w-xs">{ticket.description}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
                              {ticket.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm ${getPriorityColor(ticket.priority)}`}>
                              {ticket.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 capitalize">
                            {ticket.category}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                            {ticket.createdAt.toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button className="text-blue-400 hover:text-blue-300 mr-3">View</button>
                            <button className="text-green-400 hover:text-green-300">Reply</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* FAQ Tab */}
        {activeTab === 'faq' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Frequently Asked Questions</h2>
            </div>

            {/* Search and Filter */}
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search FAQ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Categories</option>
                <option value="account">Account</option>
                <option value="billing">Billing</option>
                <option value="security">Security</option>
                <option value="technical">Technical</option>
              </select>
            </div>

            {/* FAQ Items */}
            <div className="space-y-4">
              {filteredFAQ.map(item => (
                <div key={item.id} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === item.id ? null : item.id)}
                    className="w-full p-4 text-left hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{item.question}</h3>
                      {expandedFaq === item.id ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </button>
                  
                  {expandedFaq === item.id && (
                    <div className="px-4 pb-4 border-t border-gray-700">
                      <p className="text-gray-300 mt-4 mb-4">{item.answer}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex space-x-2">
                          {item.tags.map(tag => (
                            <span key={tag} className="px-2 py-1 bg-gray-700 text-xs rounded-full text-gray-300">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleFaqHelpful(item.id, true)}
                              className="flex items-center space-x-1 text-green-400 hover:text-green-300"
                            >
                              <ThumbsUp className="h-4 w-4" />
                              <span className="text-sm">{item.helpful}</span>
                            </button>
                            <button
                              onClick={() => handleFaqHelpful(item.id, false)}
                              className="flex items-center space-x-1 text-red-400 hover:text-red-300"
                            >
                              <ThumbsDown className="h-4 w-4" />
                              <span className="text-sm">{item.notHelpful}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {filteredFAQ.length === 0 && (
              <div className="text-center py-12">
                <HelpCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-300 mb-2">No FAQ items found</h3>
                <p className="text-gray-500">Try adjusting your search terms or category filter.</p>
              </div>
            )}
          </div>
        )}

        {/* Emergency Support Tab */}
        {activeTab === 'emergency' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-red-600/10 border border-red-500/20 rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <AlertCircle className="h-6 w-6 text-red-400" />
                <h2 className="text-xl font-semibold text-red-400">24/7 Emergency Support</h2>
              </div>
              <p className="text-gray-300 mb-6">
                For urgent issues that require immediate attention, use one of the following emergency contact methods:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                  <div className="flex items-center space-x-3 mb-4">
                    <Phone className="h-6 w-6 text-green-400" />
                    <h3 className="text-lg font-semibold">Emergency Phone</h3>
                  </div>
                  <p className="text-2xl font-bold text-green-400 mb-2">{emergencyContact.phone}</p>
                  <p className="text-gray-400 text-sm mb-4">Available 24/7 for urgent issues</p>
                  <button className="w-full bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors">
                    Call Now
                  </button>
                </div>
                
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                  <div className="flex items-center space-x-3 mb-4">
                    <Mail className="h-6 w-6 text-blue-400" />
                    <h3 className="text-lg font-semibold">Emergency Email</h3>
                  </div>
                  <p className="text-lg font-medium text-blue-400 mb-2">{emergencyContact.email}</p>
                  <p className="text-gray-400 text-sm mb-4">Response within 30 minutes</p>
                  <button className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors">
                    Send Email
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h3 className="text-lg font-semibold mb-4">What constitutes an emergency?</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-400">Account Security Breach</p>
                    <p className="text-gray-400 text-sm">Suspicious login attempts, unauthorized transactions</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-400">Large Financial Issues</p>
                    <p className="text-gray-400 text-sm">Missing deposits over $1000, withdrawal problems</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-400">Account Locked</p>
                    <p className="text-gray-400 text-sm">Unable to access account, verification issues</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Ticket Modal */}
      {showNewTicketForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Create New Support Ticket</h3>
              <button 
                onClick={() => setShowNewTicketForm(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Subject</label>
                <input
                  type="text"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="Brief description of your issue"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={newTicket.category}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, category: e.target.value as any }))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="technical">Technical Issue</option>
                  <option value="billing">Billing & Payment</option>
                  <option value="account">Account Issue</option>
                  <option value="game">Game Problem</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Priority</label>
                <select
                  value={newTicket.priority}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, priority: e.target.value as any }))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={newTicket.description}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                  rows={6}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="Please provide detailed information about your issue..."
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button 
                onClick={() => setShowNewTicketForm(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={createTicket}
                disabled={!newTicket.subject || !newTicket.description}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                Create Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 