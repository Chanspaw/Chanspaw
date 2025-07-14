import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageCircle, X } from 'lucide-react';
import { getSocket } from '../../utils/socket';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isOwn: boolean;
}

interface MatchChatProps {
  matchId: string;
  currentUserId: string;
  currentUsername: string;
  opponentName: string;
  isOpen: boolean;
  onToggle: () => void;
}

// Simple profanity filter (you can expand this)
const profanityWords = [
  'fuck', 'shit', 'bitch', 'ass', 'damn', 'hell', 'crap', 'piss', 'dick', 'cock',
  'pussy', 'cunt', 'whore', 'slut', 'bastard', 'motherfucker', 'fucker', 'shithead'
];

const containsProfanity = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  return profanityWords.some(word => lowerText.includes(word));
};

export function MatchChat({ 
  matchId, 
  currentUserId, 
  currentUsername, 
  opponentName, 
  isOpen, 
  onToggle 
}: MatchChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [showProfanityWarning, setShowProfanityWarning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-remove messages after 120 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setMessages(prev => prev.filter(msg => now - msg.timestamp < 120000));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Clear messages when match changes
  useEffect(() => {
    setMessages([]);
  }, [matchId]);

  const handleSendMessage = () => {
    const trimmedText = inputText.trim();
    if (!trimmedText) return;

    // Check for profanity
    if (containsProfanity(trimmedText)) {
      setShowProfanityWarning(true);
      setTimeout(() => setShowProfanityWarning(false), 3000);
      return;
    }

    // Check word limit (max 100 words)
    const wordCount = trimmedText.split(/\s+/).filter(word => word.length > 0).length;
    if (wordCount > 100) {
      alert('Message too long. Maximum 100 words allowed.');
      return;
    }

    // Create message object
    const message: ChatMessage = {
      id: `${Date.now()}-${Math.random()}`,
      senderId: currentUserId,
      senderName: currentUsername,
      text: trimmedText,
      timestamp: Date.now(),
      isOwn: true
    };

    // Add to local messages immediately
    setMessages(prev => [...prev, message]);

    // Emit to socket
    const socket = getSocket();
    if (socket) {
      socket.emit('chatMessage', {
        matchId,
        senderId: currentUserId,
        senderName: currentUsername,
        text: trimmedText
      });
    }

    setInputText('');
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Listen for incoming messages
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleIncomingMessage = (data: any) => {
      if (data.matchId === matchId && data.senderId !== currentUserId) {
        const message: ChatMessage = {
          id: `${Date.now()}-${Math.random()}`,
          senderId: data.senderId,
          senderName: data.senderName,
          text: data.text,
          timestamp: Date.now(),
          isOwn: false
        };
        setMessages(prev => [...prev, message]);
      }
    };

    socket.on('chatMessage', handleIncomingMessage);

    return () => {
      socket.off('chatMessage', handleIncomingMessage);
    };
  }, [matchId, currentUserId]);

  if (!isOpen) {
    return (
      <motion.button
        onClick={onToggle}
        className="fixed bottom-4 right-4 z-40 p-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <MessageCircle className="w-6 h-6" />
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
      </motion.button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed bottom-4 right-4 z-50 w-80 max-w-[90vw]"
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 20 }}
        transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
      >
        {/* Chat Container */}
        <div className="bg-gaming-dark/90 backdrop-blur-sm rounded-xl border border-gray-700 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-700 px-4 py-3 flex items-center justify-between border-b border-gray-600">
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-5 h-5 text-blue-400" />
              <span className="text-white font-semibold text-sm">Chat with {opponentName}</span>
            </div>
            <button
              onClick={onToggle}
              className="text-gray-400 hover:text-white transition-colors duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="h-48 max-h-48 overflow-y-auto p-3 space-y-2 bg-gray-900/50">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-8">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No messages yet</p>
                <p className="text-xs">Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => (
                <motion.div
                  key={message.id}
                  className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                      message.isOwn
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                        : 'bg-gray-700 text-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs font-semibold opacity-80">
                        {message.senderName}
                      </span>
                      <span className="text-xs opacity-60">
                        {new Date(message.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                    <p className="break-words">{message.text}</p>
                  </div>
                </motion.div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-gray-800/50 border-t border-gray-600">
            <div className="flex space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                maxLength={500}
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim()}
                className="px-4 py-2 bg-gradient-to-r from-emerald-400 to-blue-400 hover:from-emerald-500 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg font-semibold text-sm transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 hover:shadow-lg hover:scale-105 active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-400 text-center">
              Max 100 words • Messages auto-delete in 30s
            </div>
          </div>
        </div>

        {/* Profanity Warning Toast */}
        <AnimatePresence>
          {showProfanityWarning && (
            <motion.div
              className="absolute bottom-full left-0 right-0 mb-2 p-3 bg-red-500/90 backdrop-blur-sm rounded-lg border border-red-400 text-white text-sm text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3 }}
            >
              ⚠️ Inappropriate language is not allowed.
            </motion.div>
          )}
        </AnimatePresence>

        {/* Glow Effect */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-emerald-500/20 pointer-events-none blur-sm" />
      </motion.div>
    </AnimatePresence>
  );
} 