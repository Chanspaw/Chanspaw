import React, { useState, useEffect } from 'react';
import { 
  HelpCircle, 
  MessageCircle, 
  Mail, 
  Phone, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Send,
  FileText,
  Video,
  BookOpen,
  Users,
  Zap,
  MessageSquare,
  Ticket
} from 'lucide-react';
import { supportAPI, CreateSupportMessageRequest } from '../../services/supportAPI';
import { useAuth } from '../../contexts/AuthContext';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

interface SupportTicket {
  id: string;
  subject: string;
  status: 'open' | 'in-progress' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  lastUpdated: string;
}

export function Support() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('faq');
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{
    id: number;
    sender: 'user' | 'support';
    message: string;
    timestamp: Date;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const faqData: FAQItem[] = [
    {
      question: "How do I deposit money into my wallet?",
      answer: "You can deposit money using various payment methods including credit cards, bank transfers, and digital wallets. Go to your Wallet page and click 'Deposit' to see all available options.",
      category: "wallet"
    },
    {
      question: "How do I withdraw my winnings?",
      answer: "To withdraw your winnings, go to your Wallet page, click 'Withdraw', and select your preferred withdrawal method. Withdrawals are typically processed within 24-48 hours.",
      category: "wallet"
    },
    {
      question: "What games are available?",
      answer: "We offer a variety of games including Connect Four, Diamond Hunt, Dice Battle, and Tic-Tac-Toe 5x5. More games are being added regularly.",
      category: "gaming"
    },
    {
      question: "How do I add friends?",
      answer: "You can add friends by searching for their User ID in the Friends page. Click 'Add Friend' and wait for them to accept your request.",
      category: "account"
    },
    {
      question: "What if I forget my password?",
      answer: "If you forget your password, you can reset it by clicking 'Forgot Password' on the login page. You'll receive a reset link via email.",
      category: "account"
    }
  ];

  const categories = [
    { id: 'all', label: 'All Questions', count: faqData.length },
    { id: 'gaming', label: 'Gaming', count: faqData.filter(f => f.category === 'gaming').length },
    { id: 'wallet', label: 'Wallet & Payments', count: faqData.filter(f => f.category === 'wallet').length },
    { id: 'technical', label: 'Technical Issues', count: faqData.filter(f => f.category === 'technical').length },
    { id: 'account', label: 'Account & Settings', count: faqData.filter(f => f.category === 'account').length }
  ];

  const filteredFAQ = selectedCategory === 'all' 
    ? faqData 
    : faqData.filter(f => f.category === selectedCategory);

  const handleSendMessage = async () => {
    if (!subject.trim() || !message.trim()) {
      setErrorMessage('Please fill in both subject and message');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const supportData: CreateSupportMessageRequest = {
        subject: subject.trim(),
        message: message.trim(),
        type: 'contact_form',
        category: selectedCategory as any,
        priority: 'medium'
      };

      const response = await supportAPI.createSupportMessage(supportData);
      
      if (response.success) {
        setSuccessMessage('Your message has been sent successfully! We will respond within 24 hours.');
        setSubject('');
        setMessage('');
        
        // Add to chat messages
        const newMessage = {
          id: chatMessages.length + 1,
          sender: 'user' as const,
          message: message.trim(),
          timestamp: new Date()
        };
        setChatMessages([...chatMessages, newMessage]);
        
        // Simulate support response
        setTimeout(() => {
          const supportResponse = {
            id: chatMessages.length + 2,
            sender: 'support' as const,
            message: 'Thank you for your message. Our support team will get back to you within 24 hours.',
            timestamp: new Date()
          };
          setChatMessages(prev => [...prev, supportResponse]);
        }, 1000);
      } else {
        setErrorMessage(response.error || 'Failed to send message');
      }
    } catch (error) {
      setErrorMessage('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChatMessage = () => {
    if (message.trim()) {
      const newMessage = {
        id: chatMessages.length + 1,
        sender: 'user' as const,
        message: message.trim(),
        timestamp: new Date()
      };
      setChatMessages([...chatMessages, newMessage]);
      setMessage('');
      
      // Simulate support response
      setTimeout(() => {
        const supportResponse = {
          id: chatMessages.length + 2,
          sender: 'support' as const,
          message: 'Thank you for your message. Our support team will get back to you within 24 hours.',
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, supportResponse]);
      }, 1000);
    }
  };

  const supportTickets: SupportTicket[] = [];

  return (
    <div className="w-80 bg-gaming-dark border-r border-gray-700 h-screen overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-lg font-bold text-white flex items-center">
          <HelpCircle className="h-5 w-5 mr-2 text-gaming-accent" />
          Support Center
        </h1>
        <p className="text-gray-400 text-xs mt-1">Get help with your gaming experience</p>
      </div>

      {/* Tabs */}
      <div className="p-4">
        <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('faq')}
            className={`flex-1 py-2 px-3 rounded-md font-medium transition-all text-sm ${
              activeTab === 'faq'
                ? 'bg-gray-700 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            FAQ
          </button>
          <button
            onClick={() => setActiveTab('contact')}
            className={`flex-1 py-2 px-3 rounded-md font-medium transition-all text-sm ${
              activeTab === 'contact'
                ? 'bg-gray-700 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            Contact
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-2 px-3 rounded-md font-medium transition-all text-sm ${
              activeTab === 'chat'
                ? 'bg-gray-700 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`flex-1 py-2 px-3 rounded-md font-medium transition-all text-sm ${
              activeTab === 'tickets'
                ? 'bg-gray-700 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            Tickets
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-4 pb-4 space-y-4">
        {/* FAQ Tab */}
        {activeTab === 'faq' && (
          <div className="space-y-3">
            {filteredFAQ.length > 0 ? (
              filteredFAQ.map((item, index) => (
                <div key={index} className="bg-card-gradient rounded-lg border border-gray-700 overflow-hidden">
                  <button
                    onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                    className="w-full px-3 py-3 text-left flex items-center justify-between hover:bg-gaming-dark/50 transition-colors"
                  >
                    <h3 className="text-white font-semibold text-sm pr-3">{item.question}</h3>
                    {expandedFAQ === index ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  {expandedFAQ === index && (
                    <div className="px-3 pb-3">
                      <p className="text-gray-300 text-sm leading-relaxed">{item.answer}</p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <div className="text-gray-400 mb-2">
                  <HelpCircle className="w-8 h-8 mx-auto" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">No FAQ items available</h3>
                <p className="text-gray-400 text-xs">Check back later for frequently asked questions</p>
              </div>
            )}
          </div>
        )}

        {/* Contact Tab */}
        {activeTab === 'contact' && (
          <div className="space-y-4">
            {/* Success/Error Messages */}
            {successMessage && (
              <div className="bg-green-600/20 border border-green-600/30 rounded-lg p-3">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-400 mr-2" />
                  <p className="text-green-400 text-sm">{successMessage}</p>
                </div>
              </div>
            )}
            
            {errorMessage && (
              <div className="bg-red-600/20 border border-red-600/30 rounded-lg p-3">
                <div className="flex items-center">
                  <AlertCircle className="h-4 w-4 text-red-400 mr-2" />
                  <p className="text-red-400 text-sm">{errorMessage}</p>
                </div>
              </div>
            )}

            <div className="bg-card-gradient rounded-lg p-3 border border-gray-700">
              <h3 className="text-white font-semibold mb-3 text-sm flex items-center">
                <MessageSquare className="h-4 w-4 mr-2 text-gaming-accent" />
                Send us a message
              </h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }} className="space-y-3">
                <div>
                  <label className="block text-gray-300 text-xs font-medium mb-1">Subject</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-gaming-dark text-white px-3 py-2 rounded border border-gray-600 focus:border-gaming-accent focus:outline-none text-sm"
                    placeholder="Enter subject..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-xs font-medium mb-1">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full bg-gaming-dark text-white px-3 py-2 rounded border border-gray-600 focus:border-gaming-accent focus:outline-none text-sm"
                    required
                  >
                    <option value="">Select a category</option>
                    <option value="gaming">Gaming</option>
                    <option value="wallet">Wallet & Payments</option>
                    <option value="technical">Technical Issues</option>
                    <option value="account">Account & Settings</option>
                    <option value="general">General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 text-xs font-medium mb-1">Message</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    className="w-full bg-gaming-dark text-white px-3 py-2 rounded border border-gray-600 focus:border-gaming-accent focus:outline-none text-sm"
                    placeholder="Describe your issue..."
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-400 to-emerald-500 hover:opacity-90 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 px-3 rounded font-medium transition-all text-sm flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-3 w-3 mr-1" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="bg-card-gradient rounded-lg p-3 border border-gray-700">
              <h3 className="text-white font-semibold mb-3 text-sm flex items-center">
                <MessageCircle className="h-4 w-4 mr-2 text-gaming-accent" />
                Contact Information
              </h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="p-1 bg-gaming-accent/20 rounded">
                    <Mail className="w-4 h-4 text-gaming-accent" />
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">Email</p>
                    <p className="text-gray-400 text-xs">support@chanspaw.com</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="p-1 bg-gaming-gold/20 rounded">
                    <Phone className="w-4 h-4 text-gaming-gold" />
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">Phone</p>
                    <p className="text-gray-400 text-xs">+1 (555) 123-4567</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="p-1 bg-green-600/20 rounded">
                    <Clock className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">Response Time</p>
                    <p className="text-gray-400 text-xs">Within 24 hours</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live Chat Tab */}
        {activeTab === 'chat' && (
          <div className="bg-card-gradient rounded-lg border border-gray-700 overflow-hidden">
            <div className="p-3 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold text-sm flex items-center">
                  <MessageCircle className="h-4 w-4 mr-2 text-gaming-accent" />
                  Live Chat
                </h3>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-400 text-xs">Online</span>
                </div>
              </div>
            </div>

            <div className="h-64 overflow-y-auto p-3 space-y-3">
              {chatMessages.length > 0 ? (
                chatMessages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs px-3 py-2 rounded-lg ${
                        message.sender === 'user'
                          ? 'bg-gaming-accent text-white'
                          : 'bg-gaming-dark text-white'
                      }`}
                    >
                      <p className="text-sm">{message.message}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <MessageCircle className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-400 text-xs">Start a conversation with our support team</p>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-gray-700">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleChatMessage()}
                  placeholder="Type your message..."
                  className="flex-1 bg-gaming-dark text-white px-3 py-2 rounded border border-gray-600 focus:border-gaming-accent focus:outline-none text-sm"
                />
                <button
                  onClick={handleChatMessage}
                  disabled={!message.trim()}
                  className="bg-gradient-to-r from-emerald-400 to-emerald-500 hover:opacity-90 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-2 rounded transition-all text-sm flex items-center"
                >
                  <Send className="h-3 w-3 mr-1" />
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tickets Tab */}
        {activeTab === 'tickets' && (
          <div className="space-y-3">
            {supportTickets.length > 0 ? (
              supportTickets.map((ticket) => (
                <div key={ticket.id} className="bg-card-gradient rounded-lg p-3 border border-gray-700">
                  <div className="space-y-2">
                    <div>
                      <h3 className="text-white font-semibold text-sm">{ticket.subject}</h3>
                      <p className="text-gray-400 text-xs mt-1">{ticket.status === 'open' ? 'Open' : ticket.status === 'in-progress' ? 'In Progress' : 'Resolved'}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        ticket.status === 'open' ? 'bg-green-600/20 text-green-400' :
                        ticket.status === 'in-progress' ? 'bg-gaming-gold/20 text-gaming-gold' :
                        'bg-gray-600/20 text-gray-400'
                      }`}>
                        {ticket.status}
                      </span>
                      <span className="text-gray-500 text-xs">#{ticket.id}</span>
                      <span className="text-gray-500 text-xs">{ticket.createdAt}</span>
                    </div>
                    <button className="w-full bg-gradient-to-r from-emerald-400 to-emerald-500 hover:opacity-90 text-white py-1 px-3 rounded font-medium transition-all text-sm">
                      View Details
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <div className="text-gray-400 mb-2">
                  <Ticket className="w-8 h-8 mx-auto" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">No support tickets</h3>
                <p className="text-gray-400 text-xs mb-3">You haven't created any support tickets yet</p>
                <button
                  onClick={() => setActiveTab('contact')}
                  className="bg-gradient-to-r from-emerald-400 to-emerald-500 hover:opacity-90 text-white py-1 px-3 rounded font-medium transition-all text-sm"
                >
                  Create Ticket
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 