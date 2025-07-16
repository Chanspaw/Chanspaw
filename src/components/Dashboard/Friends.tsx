import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Users, UserPlus, Search, MessageSquare, Play, X, Check, Clock, AlertCircle, Send, Gamepad2 } from 'lucide-react';
import { friendAPI, Friend, FriendRequest, SearchResult } from '../../services/friendAPI';
import { getSocket } from '../../utils/socket';
import PlayerSearchInvite from '../UI/PlayerSearchInvite';
import { useToast } from '../UI/Toast';
import { GameBetModal } from '../Games/GameBetModal';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.VITE_API_URL;

interface OnlineFriend extends Friend {
  status: 'online' | 'offline';
}

interface FriendsProps {
  onNavigateToGame?: (gameType: string, matchId: string) => void;
}

const Friends: React.FC<FriendsProps> = ({ onNavigateToGame }) => {
  const { user } = useAuth();
  const { addToast, ToastContainer } = useToast();
  const [friends, setFriends] = useState<OnlineFriend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('friends');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [gameInvitation, setGameInvitation] = useState<{
    fromUserId: string;
    fromUsername: string;
    gameType: string;
    matchType: string;
    message: string;
  } | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteTarget, setInviteTarget] = useState<OnlineFriend | null>(null);
  const [inviteGame, setInviteGame] = useState<'connect_four' | 'tic_tac_toe' | 'dice_battle' | 'diamond_hunt' | 'chess'>('chess');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteCurrency, setInviteCurrency] = useState<'real' | 'virtual'>('real');
  const [inviteBet, setInviteBet] = useState<number>(10);
  const [pendingInvites, setPendingInvites] = useState<{ [userId: string]: { status: 'pending' | 'accepted' | 'declined' | 'failed', game: string, bet: number, currency: string, error?: string } }>({});
  const [inviteUserBalances, setInviteUserBalances] = useState<{ real_balance: number; virtual_balance: number }>({ real_balance: 0, virtual_balance: 0 });
  const [gameSelectModalOpen, setGameSelectModalOpen] = useState(false);
  const [pendingInviteFriend, setPendingInviteFriend] = useState<OnlineFriend | null>(null);
  const { t } = useTranslation();
  const gameOptions = [
    { value: 'chess', label: t('games.chess') },
    { value: 'connect_four', label: t('games.connectFour') },
    { value: 'diamond_hunt', label: t('games.diamondHunt') },
    { value: 'tic_tac_toe', label: t('games.ticTacToe5x5') },
    { value: 'dice_battle', label: t('games.diceBattle') },
  ];

  // Load data on component mount
  useEffect(() => {
    if (user?.id) {
      loadFriends();
      loadFriendRequests();
    }
  }, [user?.id]);

  // Request online users after friends are loaded
  useEffect(() => {
    if (friends.length > 0 && user?.id) {
      const socket = getSocket();
      if (socket && socket.connected) {
        console.log('Friends loaded, requesting online users...');
        socket.emit('getOnlineUsers');
      }
    }
  }, [friends.length, user?.id]);

  // Handle socket connection and status updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user?.id) {
      console.log('❌ Socket or user not available:', { socket: !!socket, userId: user?.id });
      return;
    }

    console.log('🔌 Setting up socket listeners for user:', user.id);
    console.log('🔌 Socket connected:', socket.connected);
    console.log('🔌 Socket ID:', socket.id);
    console.log('🔌 User authenticated:', !!localStorage.getItem('chanspaw_access_token'));

    // Request online users when component loads
    socket.emit('getOnlineUsers');
    console.log('📡 Requested online users');

    // Listen for initial online users list
    const handleOnlineUsers = (onlineUserIds: string[]) => {
      console.log('Received online users:', onlineUserIds);
      console.log('Current friends before update:', friends);
      setFriends(prevFriends => {
        const updatedFriends = prevFriends.map(friend => ({
          ...friend,
          status: onlineUserIds.includes(friend.id) ? 'online' as const : 'offline' as const
        }));
        console.log('Updated friends:', updatedFriends);
        return updatedFriends;
      });
    };

    // Listen for status changes
    const handleStatusChange = (data: { userId: string; status: 'online' | 'offline' }) => {
      console.log('Status change:', data);
      console.log('Current friends before status change:', friends);
      setFriends(prevFriends => {
        const updatedFriends = prevFriends.map(friend => 
          friend.id === data.userId 
            ? { ...friend, status: data.status }
            : friend
        );
        console.log('Friends after status change:', updatedFriends);
        return updatedFriends;
      });
    };

    // Listen for game invitations
    const handleGameInvite = (data: { fromUserId: string; fromUsername: string; gameType: string; message: string }) => {
      console.log('Game invitation received:', data);
      setGameInvitation({
        fromUserId: data.fromUserId,
        fromUsername: data.fromUsername,
        gameType: data.gameType,
        matchType: 'virtual', // Default for old socket-based invites
        message: data.message
      });
      addToast('info', t('friends.invitedYou', { user: data.fromUsername, game: data.gameType }));
    };

    // Listen for invitation responses
    const handleInviteResponse = (data: { toUserId: string; accepted: boolean; gameType: string }) => {
      if (!data.accepted) {
        addToast('warning', t('friends.inviteDeclined'));
      }
    };

    socket.on('online_users', handleOnlineUsers);
    socket.on('user_status_change', handleStatusChange);
    socket.on('gameInvite', handleGameInvite);
    socket.on('inviteResponse', handleInviteResponse);
    
    console.log('Socket listeners set up for online status');

    return () => {
      socket.off('online_users', handleOnlineUsers);
      socket.off('user_status_change', handleStatusChange);
      socket.off('gameInvite', handleGameInvite);
      socket.off('inviteResponse', handleInviteResponse);
    };
  }, [user?.id, addToast, t]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user?.id) return;

    // Listen for invite received
    socket.on('invite:received', (data) => {
      console.log('🎯 Invite received:', data);
      setGameInvitation({
        fromUserId: data.fromUserId || (data.fromUser && data.fromUser.id),
        fromUsername: data.fromUsername || (data.fromUser && data.fromUser.username) || `User ${data.fromUserId}`,
        gameType: data.gameType,
        matchType: data.matchType || 'virtual', // Store the matchType
        message: ''
      });
      // No toast here; modal will show
    });

    // Listen for invite declined
    socket.on('inviteDeclined', (data) => {
      console.log('❌ Invite declined:', data);
      addToast('warning', t('friends.inviteDeclined'));
      setInviteModalOpen(false);
      setInviteTarget(null);
      setPendingInvites(prev => {
        const updated = { ...prev };
        if (data && data.fromUserId) {
          Object.keys(updated).forEach(uid => {
            if (uid === data.fromUserId && updated[uid].status === 'pending') updated[uid].status = 'declined';
          });
        } else {
          Object.keys(updated).forEach(uid => {
            if (updated[uid].status === 'pending') updated[uid].status = 'declined';
          });
        }
        return updated;
      });
    });

    // Listen for match found (invite accepted)
    socket.on('matchFound', (data) => {
      console.log('🎮 Match found event received:', data);
      setPendingInvites(prev => {
        const updated = { ...prev };
        if (data && data.opponentId) {
          Object.keys(updated).forEach(uid => {
            if (uid === data.opponentId && updated[uid].status === 'pending') updated[uid].status = 'accepted';
          });
        } else {
          Object.keys(updated).forEach(uid => {
            if (updated[uid].status === 'pending') updated[uid].status = 'accepted';
          });
        }
        return updated;
      });
      
      // Use the app's navigation system instead of window.location.href
      if (onNavigateToGame && data.matchId && data.gameType) {
        console.log('🚀 Navigating to game:', { gameType: data.gameType, matchId: data.matchId });
        // Map backend game types to frontend game IDs
        const gameTypeMap: { [key: string]: string } = {
          'chess': 'chess',
          'connect_four': 'connect-four',
          'tic_tac_toe': 'tictactoe-5x5',
          'dice_battle': 'dice-battle',
          'diamond_hunt': 'diamond-hunt'
        };
        
        const frontendGameId = gameTypeMap[data.gameType] || data.gameType;
        console.log('🎯 Calling onNavigateToGame with:', { frontendGameId, matchId: data.matchId });
        onNavigateToGame(frontendGameId, data.matchId);
      } else {
        console.log('❌ Missing data for navigation:', { onNavigateToGame: !!onNavigateToGame, matchId: data.matchId, gameType: data.gameType });
      }
    });

    // Listen for invite timeout (if implemented)
    socket.on('invite:timeout', () => {
      addToast('error', t('friends.inviteTimeout'));
      setInviteModalOpen(false);
      setInviteTarget(null);
      setPendingInvites(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(uid => {
          if (updated[uid].status === 'pending') updated[uid].status = 'failed';
        });
        return updated;
      });
    });

    return () => {
      socket.off('invite:received');
      socket.off('inviteDeclined');
      socket.off('matchFound');
      socket.off('invite:timeout');
    };
  }, [user?.id, addToast, t, onNavigateToGame]);

  const loadFriends = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const result = await friendAPI.getFriends();
      if (result.success && result.data) {
        // Set initial status as offline
        const friendsWithStatus = result.data.friends.map((friend: Friend) => ({ 
          ...friend, 
          status: 'offline' as const 
        }));
        setFriends(friendsWithStatus);
      } else {
        console.error('Failed to load friends:', result.error);
      }
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFriendRequests = async () => {
    if (!user?.id) return;
    
    try {
      const result = await friendAPI.getReceivedRequests();
      if (result.success && result.data) {
        setFriendRequests(result.data.requests);
      } else {
        console.error('Failed to load friend requests:', result.error);
      }
    } catch (error) {
      console.error('Error loading friend requests:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return;
    
    setIsSearching(true);
    try {
      const result = await friendAPI.searchUsers(searchQuery);
      if (result.success && result.data) {
        setSearchResults(result.data.users);
      } else {
        console.error('Failed to search users:', result.error);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendFriendRequest = async (friendId: string) => {
    if (!user?.id) return;
    
    try {
      const result = await friendAPI.sendFriendRequest(friendId);
      if (result.success) {
        addToast('success', result.message || t('friends.friendRequestSent'));
        handleSearch(); // Refresh search results
      } else {
        addToast('error', result.error || t('friends.friendRequestFailed'));
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      addToast('error', t('friends.networkErrorSendingRequest'));
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    if (!user?.id) return;
    
    try {
      const result = await friendAPI.acceptFriendRequest(requestId);
      if (result.success) {
        addToast('success', result.message || t('friends.friendRequestAccepted'));
        loadFriends();
        loadFriendRequests();
      } else {
        addToast('error', result.error || t('friends.friendRequestFailed'));
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      addToast('error', t('friends.friendRequestFailed'));
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    if (!user?.id) return;
    
    try {
      const result = await friendAPI.rejectFriendRequest(requestId);
      if (result.success) {
        addToast('success', result.message || t('friends.friendRequestDeclined'));
        loadFriendRequests();
      } else {
        addToast('error', result.error || t('friends.friendRequestFailed'));
      }
    } catch (error) {
      console.error('Error declining friend request:', error);
      addToast('error', t('friends.friendRequestFailed'));
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!user?.id) return;
    
    try {
      const result = await friendAPI.removeFriend(friendId);
      if (result.success) {
        addToast('success', result.message || t('friends.friendRemoved'));
        loadFriends();
      } else {
        addToast('error', result.error || t('friends.friendRemoveFailed'));
      }
    } catch (error) {
      console.error('Error removing friend:', error);
      addToast('error', t('friends.friendRemoveFailed'));
    }
  };

  const handleInviteToPlay = async (friend: OnlineFriend) => {
    setPendingInviteFriend(friend);
    setGameSelectModalOpen(true);
  };

  const handleGameSelectConfirm = async (selectedGame: string) => {
    setInviteGame(selectedGame as typeof inviteGame);
    setGameSelectModalOpen(false);
    setInviteTarget(pendingInviteFriend);
    // Fetch latest wallet balances before opening modal
    try {
      const response = await fetch(`${API_URL}/api/wallet/balance`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setInviteUserBalances({
          real_balance: data.data?.real_balance || 0,
          virtual_balance: data.data?.virtual_balance || 0
        });
      } else {
        setInviteUserBalances({ real_balance: 0, virtual_balance: 0 });
      }
    } catch {
      setInviteUserBalances({ real_balance: 0, virtual_balance: 0 });
    }
    setInviteModalOpen(true);
  };
  const handleInviteModalConfirm = async (betAmount: number) => {
    if (!user?.id || !inviteTarget) return;
    setInviteLoading(true);
    setInviteError(null);
    setInviteSuccess(null);
    try {
      const res = await fetch(`${API_URL}/api/games/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`
        },
        body: JSON.stringify({
          toUserId: inviteTarget.id,
          gameType: inviteGame,
          betAmount,
          matchType: inviteCurrency
        })
      });
      const data = await res.json();
      if (data.success) {
        setPendingInvites(prev => ({
          ...prev,
          [inviteTarget.id]: { status: 'pending', game: inviteGame, bet: betAmount, currency: inviteCurrency }
        }));
        setInviteSuccess(t('friends.inviteSent'));
        setTimeout(() => {
          setInviteModalOpen(false);
          setInviteTarget(null);
          setInviteSuccess(null);
        }, 2000);
      } else {
        setPendingInvites(prev => ({
          ...prev,
          [inviteTarget.id]: { status: 'failed', game: inviteGame, bet: betAmount, currency: inviteCurrency, error: data.error || t('friends.inviteFailed') }
        }));
        setInviteError(data.error || t('friends.inviteFailed'));
      }
    } catch (e) {
      setInviteError(t('friends.networkError'));
    } finally {
      setInviteLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!gameInvitation || !user?.id) return;
    
    console.log('🎯 Accepting invitation:', gameInvitation);
    
    try {
      const requestBody = {
        fromUserId: gameInvitation.fromUserId,
        gameType: gameInvitation.gameType,
        matchType: gameInvitation.matchType // Use the stored matchType
      };
      
      console.log('📤 Sending accept request:', requestBody);
      
      const response = await fetch(`${API_URL}/api/games/invite/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      console.log('📥 Accept response:', data);
      
      if (data.success) {
        setGameInvitation(null);
        addToast('success', t('friends.inviteAccepted'));
        // The matchFound event will be emitted by the backend and handled by the socket listener
      } else {
        addToast('error', data.error || t('friends.inviteFailed'));
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      addToast('error', t('friends.networkError'));
    }
  };

  const handleDeclineInvitation = async () => {
    if (!gameInvitation || !user?.id) return;
    
    console.log('❌ Declining invitation:', gameInvitation);
    
    try {
      const requestBody = {
        fromUserId: gameInvitation.fromUserId,
        gameType: gameInvitation.gameType,
        matchType: gameInvitation.matchType // Use the stored matchType
      };
      
      console.log('📤 Sending decline request:', requestBody);
      
      const response = await fetch(`${API_URL}/api/games/invite/decline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      console.log('📥 Decline response:', data);
      
      if (data.success) {
        setGameInvitation(null);
        addToast('warning', t('friends.inviteDeclined'));
      } else {
        addToast('error', data.error || t('friends.inviteFailed'));
      }
    } catch (error) {
      console.error('Error declining invitation:', error);
      addToast('error', t('friends.networkError'));
    }
  };

  const getStatusBadge = (status: 'online' | 'offline') => {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        status === 'online' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'
      }`}>
        <span className={`w-2 h-2 mr-1 rounded-full ${
          status === 'online' ? 'bg-emerald-500' : 'bg-gray-500'
        }`}></span>
        {status === 'online' ? t('friends.online') : t('friends.offline')}
      </span>
    );
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return t('friends.justNow');
    if (diffInHours === 1) return t('friends.oneHourAgo');
    if (diffInHours < 24) return `${diffInHours}${t('friends.hoursAgo')}`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return t('friends.oneDayAgo');
    return `${diffInDays}${t('friends.daysAgo')}`;
  };

  return (
    <div className="w-full max-w-sm px-2 py-4 flex flex-col gap-4 ml-0 md:ml-4">
      <ToastContainer />
      
      {/* Game Invitation Modal */}
      {gameInvitation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="flex flex-col items-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-emerald-400 to-blue-400 rounded-full flex items-center justify-center mb-3">
                <Gamepad2 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white">{t('friends.gameInvitation')}</h3>
            </div>
            <p className="text-gray-300 mb-4 text-center">
              <span className="font-semibold text-white">{gameInvitation.fromUsername}</span> {t('friends.invitedYouToPlay', { user: gameInvitation.fromUsername, game: gameInvitation.gameType })}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleAcceptInvitation}
                className="flex-1 bg-gradient-to-r from-emerald-400 to-blue-400 text-white hover:opacity-90 transform duration-200 py-2 rounded text-sm font-medium"
              >
                {t('general.accept')}
              </button>
              <button
                onClick={handleDeclineInvitation}
                className="flex-1 bg-gray-600 text-white hover:bg-gray-700 py-2 rounded text-sm font-medium"
              >
                {t('general.decline')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Invite Matchmaking Modal */}
      {inviteModalOpen && inviteTarget && (
        <GameBetModal
          open={inviteModalOpen}
          onClose={() => { setInviteModalOpen(false); setInviteTarget(null); setInviteError(null); setInviteSuccess(null); }}
          onConfirm={() => {}} // No-op, using onBetConfirmed
          onBetConfirmed={handleInviteModalConfirm}
          gameType={inviteGame}
          userId={user?.id || ''}
          username={user?.username || ''}
          userBalances={inviteUserBalances}
        />
      )}
      
      {/* Game Selection Modal */}
      {gameSelectModalOpen && pendingInviteFriend && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-neutral-900 rounded-lg shadow-lg p-6 w-full max-w-xs">
            <h2 className="text-base font-medium text-center mb-4">{t('friends.selectGame')}</h2>
            <select
              className="w-full p-2 rounded bg-neutral-800 text-white text-sm mb-4 border border-neutral-700"
              value={inviteGame}
              onChange={e => setInviteGame(e.target.value as typeof inviteGame)}
            >
              {gameOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div className="flex gap-2 mt-2">
              <button
                className="flex-1 py-2 rounded bg-gradient-to-r from-emerald-400 to-blue-400 text-white text-sm font-medium hover:opacity-90"
                onClick={() => handleGameSelectConfirm(inviteGame)}
              >
                {t('general.next')}
              </button>
              <button
                className="flex-1 py-2 rounded bg-neutral-700 text-gray-200 text-sm hover:bg-neutral-600"
                onClick={() => { setGameSelectModalOpen(false); setPendingInviteFriend(null); }}
              >
                {t('general.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Tabs */}
      <div className="flex justify-between mb-2">
        <button onClick={() => setActiveTab('friends')} className={`flex-1 py-2 rounded-l-lg text-sm font-medium ${activeTab === 'friends' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'} transition-colors focus:outline-none focus:ring-0`}>{t('friends.yourFriends')}</button>
        <button onClick={() => setActiveTab('requests')} className={`flex-1 py-2 text-sm font-medium ${activeTab === 'requests' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'} transition-colors focus:outline-none focus:ring-0`}>{t('friends.friendRequests')}</button>
        <button onClick={() => setActiveTab('search')} className={`flex-1 py-2 rounded-r-lg text-sm font-medium ${activeTab === 'search' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'} transition-colors focus:outline-none focus:ring-0`}>{t('friends.findFriends')}</button>
      </div>

      {/* Friends Tab */}
      {activeTab === 'friends' && (
        <div className="flex flex-col items-center w-full">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-lg font-bold text-white">{t('friends.yourFriends')}</h2>
            <button 
              onClick={() => {
                const socket = getSocket();
                if (socket) {
                  console.log('Manual refresh of online status');
                  socket.emit('getOnlineUsers');
                }
              }}
              className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
            >
              {t('general.refresh')}
            </button>
          </div>
          {isLoading ? (
            <div className="py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div></div>
          ) : friends.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 w-full text-gray-400">
              <Users className="w-9 h-9 mb-2 text-gray-600" />
              <h3 className="text-base font-semibold mb-1 text-center">{t('friends.noFriendsYet')}</h3>
              <p className="mb-2 text-xs text-center">{t('friends.startBySearching')}</p>
              <button onClick={() => setActiveTab('search')} className="px-3 py-1.5 bg-gradient-to-r from-emerald-400 to-blue-400 text-white hover:opacity-90 transform duration-200 rounded text-xs mt-2">
                {t('friends.findFriends')}
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 max-h-[60vh] overflow-y-auto">
              {friends.map((friend) => (
                <li key={friend.id} className="flex items-center justify-between py-2 px-2 hover:bg-gray-50 transition">
                  <div className="flex items-center gap-3">
                    {/* Avatar or Initials */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-400 to-blue-400 flex items-center justify-center text-white font-bold text-sm">
                      {friend.avatar ? (
                        <img src={friend.avatar} alt={friend.username} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        friend.username?.slice(0, 2).toUpperCase() || '?' 
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{friend.username}</div>
                      <div className="text-xs flex items-center gap-1">
                        <span className={friend.status === 'online' ? 'text-green-500' : 'text-gray-400'}>
                          ●
                        </span>
                        <span className="text-gray-500">{friend.status === 'online' ? t('friends.online') : t('friends.offline')}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleInviteToPlay(friend)}
                    className="px-1 py-0.5 h-6 min-w-[44px] bg-gradient-to-r from-emerald-400 to-blue-400 text-white hover:opacity-90 transform duration-200 rounded-none text-xs ml-2"
                  >
                    {t('friends.invite')}
                  </button>
                  {pendingInvites[friend.id] && (
                    <div className="text-xs text-gray-400 mt-1">
                      {pendingInvites[friend.id].status === 'pending' && t('friends.invitePending')}
                      {pendingInvites[friend.id].status === 'accepted' && t('friends.inviteAccepted')}
                      {pendingInvites[friend.id].status === 'declined' && t('friends.inviteDeclined')}
                      {pendingInvites[friend.id].status === 'failed' && (
                        <span>{t('friends.inviteFailed')}: {pendingInvites[friend.id].error}</span>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Requests Tab */}
      {activeTab === 'requests' && (
        <div className="flex flex-col items-center w-full">
          <h2 className="text-lg font-bold mb-2 text-white">{t('friends.friendRequests')}</h2>
          {friendRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 w-full text-gray-400">
              <Check className="w-9 h-9 mb-2 text-gray-600" />
              <h3 className="text-base font-semibold mb-1 text-center">{t('friends.noPendingRequests')}</h3>
              <p className="mb-2 text-xs text-center">{t('friends.allCaughtUp')}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 w-full">
              {friendRequests.map((request) => (
                <div key={request.id} className="flex flex-col items-center bg-gray-700 rounded-lg p-3 w-full">
                  <div className="w-9 h-9 bg-gray-600 rounded-full flex items-center justify-center mb-1"><Users className="w-4 h-4 text-gray-300" /></div>
                  <p className="font-medium text-white text-center text-sm mb-0.5">{request.sender.username}</p>
                  <div className="flex gap-2 w-full mt-2">
                    <button onClick={() => handleAcceptRequest(request.id)} className="flex-1 bg-gradient-to-r from-emerald-400 to-blue-400 text-white hover:opacity-90 transform duration-200 py-1.5 rounded text-xs transition-colors focus:outline-none focus:ring-0">
                      {t('general.accept')}
                    </button>
                    <button onClick={() => handleDeclineRequest(request.id)} className="flex-1 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white py-1.5 rounded text-xs transition-colors focus:outline-none focus:ring-0">
                      {t('general.reject')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search Tab */}
      {activeTab === 'search' && (
        <div className="flex flex-col items-center w-full">
          <h2 className="text-lg font-bold mb-2 text-white">{t('friends.findFriends')}</h2>
          <form onSubmit={e => { e.preventDefault(); handleSearch(); }} className="w-full mb-3 flex gap-2">
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={t('friends.enterUserId')} className="flex-1 px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 text-sm focus:outline-none" />
            <button type="submit" disabled={isSearching || !searchQuery.trim()} className="w-auto px-3 py-1.5 bg-gradient-to-r from-emerald-400 to-blue-400 text-white hover:opacity-90 transform duration-200 rounded text-xs flex items-center gap-1">
              <Search className="w-4 h-4" />
              {isSearching ? t('general.searching') : t('general.search')}
            </button>
          </form>
          {searchResults.length > 0 && (
            <div className="flex flex-col gap-3 w-full">
              {searchResults.map((result) => (
                <div key={result.id} className="flex flex-col items-center bg-gray-700 rounded-lg p-3 w-full">
                  <div className="w-9 h-9 bg-gray-600 rounded-full flex items-center justify-center mb-1"><Users className="w-4 h-4 text-gray-300" /></div>
                  <p className="font-medium text-white text-center text-sm mb-0.5">{result.username}</p>
                  <p className="text-xs text-gray-400 mb-1">{result.id}</p>
                  <button onClick={() => handleSendFriendRequest(result.id)} className="bg-gradient-to-r from-emerald-400 to-blue-400 text-white hover:opacity-90 transform duration-200 w-full py-1.5 rounded text-xs mt-1 transition-colors">
                    {t('friends.sendRequest')}
                  </button>
                </div>
              ))}
            </div>
          )}
          {searchQuery && !isSearching && searchResults.length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 w-full text-gray-400">
              <Search className="w-9 h-9 mb-2 text-gray-600" />
              <h3 className="text-base font-semibold mb-1 text-center">{t('friends.noUsersFound')}</h3>
              <p className="mb-2 text-xs text-center">{t('friends.tryDifferentUsername')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Friends; 