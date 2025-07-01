import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Users, UserPlus, Search, MessageSquare, Play, X, Check, Clock, AlertCircle, Send, Gamepad2 } from 'lucide-react';
import { friendAPI, Friend, FriendRequest, SearchResult } from '../../services/friendAPI';
import { getSocket } from '../../utils/socket';
import PlayerSearchInvite from '../UI/PlayerSearchInvite';
import { useToast } from '../UI/Toast';

const API_URL = import.meta.env.VITE_API_URL;

interface OnlineFriend extends Friend {
  status: 'online' | 'offline';
}

const Friends: React.FC = () => {
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
    message: string;
  } | null>(null);

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
    if (!socket || !user?.id) return;

    console.log('Setting up socket listeners for user:', user.id);
    console.log('Socket connected:', socket.connected);

    // Request online users when component loads
    socket.emit('getOnlineUsers');
    console.log('Requested online users');

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
      setGameInvitation(data);
      addToast('info', `${data.fromUsername} invited you to play ${data.gameType}!`);
    };

    // Listen for invitation responses
    const handleInviteResponse = (data: { toUserId: string; accepted: boolean; gameType: string }) => {
      if (data.accepted) {
        addToast('success', `Your game invitation was accepted! Starting ${data.gameType}...`);
      } else {
        addToast('warning', 'Your game invitation was declined.');
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
  }, [user?.id, addToast]);

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
        addToast('success', result.message || 'Friend request sent successfully!');
        handleSearch(); // Refresh search results
      } else {
        addToast('error', result.error || 'Failed to send friend request');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      addToast('error', 'Network error while sending friend request');
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    if (!user?.id) return;
    
    try {
      const result = await friendAPI.acceptFriendRequest(requestId);
      if (result.success) {
        addToast('success', result.message || 'Friend request accepted!');
        loadFriends();
        loadFriendRequests();
      } else {
        addToast('error', result.error || 'Failed to accept friend request');
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      addToast('error', 'Failed to accept friend request');
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    if (!user?.id) return;
    
    try {
      const result = await friendAPI.rejectFriendRequest(requestId);
      if (result.success) {
        addToast('success', result.message || 'Friend request declined');
        loadFriendRequests();
      } else {
        addToast('error', result.error || 'Failed to decline friend request');
      }
    } catch (error) {
      console.error('Error declining friend request:', error);
      addToast('error', 'Failed to decline friend request');
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!user?.id) return;
    
    try {
      const result = await friendAPI.removeFriend(friendId);
      if (result.success) {
        addToast('success', result.message || 'Friend removed successfully');
        loadFriends();
      } else {
        addToast('error', result.error || 'Failed to remove friend');
      }
    } catch (error) {
      console.error('Error removing friend:', error);
      addToast('error', 'Failed to remove friend');
    }
  };

  const handleInviteToPlay = (friend: OnlineFriend) => {
    if (!user?.id) return;
    
    const socket = getSocket();
    if (!socket) {
      addToast('error', 'Connection error. Please refresh the page.');
      return;
    }

    console.log('Sending game invitation:', {
      toUserId: friend.id,
      fromUserId: user.id,
      gameType: 'tictactoe5x5',
      message: `${user.username} invited you to play!`
    });

    // Send game invitation via socket
    socket.emit('gameInvite', {
      toUserId: friend.id,
      fromUserId: user.id,
      gameType: 'tictactoe5x5', // Default game type
      message: `${user.username} invited you to play!`
    });

    addToast('success', `Game invitation sent to ${friend.username}!`);
  };

  const handleAcceptInvitation = () => {
    if (!gameInvitation || !user?.id) return;
    
    const socket = getSocket();
    if (!socket) {
      addToast('error', 'Connection error. Please refresh the page.');
      return;
    }

    socket.emit('inviteResponse', {
      toUserId: gameInvitation.fromUserId,
      accepted: true,
      gameType: gameInvitation.gameType
    });

    setGameInvitation(null);
    addToast('success', 'Game invitation accepted! Starting game...');
  };

  const handleDeclineInvitation = () => {
    if (!gameInvitation || !user?.id) return;
    
    const socket = getSocket();
    if (!socket) {
      addToast('error', 'Connection error. Please refresh the page.');
      return;
    }

    socket.emit('inviteResponse', {
      toUserId: gameInvitation.fromUserId,
      accepted: false,
      gameType: gameInvitation.gameType
    });

    setGameInvitation(null);
    addToast('warning', 'Game invitation declined.');
  };

  const getStatusBadge = (status: 'online' | 'offline') => {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        status === 'online' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'
      }`}>
        <span className={`w-2 h-2 mr-1 rounded-full ${
          status === 'online' ? 'bg-emerald-500' : 'bg-gray-500'
        }`}></span>
        {status === 'online' ? 'Online' : 'Offline'}
      </span>
    );
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours === 1) return '1 hour ago';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return '1 day ago';
    return `${diffInDays} days ago`;
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
              <h3 className="text-lg font-bold text-white">Game Invitation</h3>
            </div>
            <p className="text-gray-300 mb-4 text-center">
              <span className="font-semibold text-white">{gameInvitation.fromUsername}</span> invited you to play <span className="font-semibold text-white">{gameInvitation.gameType}</span>!
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleAcceptInvitation}
                className="flex-1 bg-gradient-to-r from-emerald-400 to-blue-400 text-white hover:opacity-90 transform duration-200 py-2 rounded text-sm font-medium"
              >
                Accept
              </button>
              <button
                onClick={handleDeclineInvitation}
                className="flex-1 bg-gray-600 text-white hover:bg-gray-700 py-2 rounded text-sm font-medium"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Tabs */}
      <div className="flex justify-between mb-2">
        <button onClick={() => setActiveTab('friends')} className={`flex-1 py-2 rounded-l-lg text-sm font-medium ${activeTab === 'friends' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'} transition-colors focus:outline-none focus:ring-0`}>Friends</button>
        <button onClick={() => setActiveTab('requests')} className={`flex-1 py-2 text-sm font-medium ${activeTab === 'requests' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'} transition-colors focus:outline-none focus:ring-0`}>Requests</button>
        <button onClick={() => setActiveTab('search')} className={`flex-1 py-2 rounded-r-lg text-sm font-medium ${activeTab === 'search' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'} transition-colors focus:outline-none focus:ring-0`}>Find Friends</button>
      </div>

      {/* Friends Tab */}
      {activeTab === 'friends' && (
        <div className="flex flex-col items-center w-full">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-lg font-bold text-white">Your Friends</h2>
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
              Refresh
            </button>
          </div>
          {isLoading ? (
            <div className="py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div></div>
          ) : friends.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 w-full text-gray-400">
              <Users className="w-9 h-9 mb-2 text-gray-600" />
              <h3 className="text-base font-semibold mb-1 text-center">No friends yet</h3>
              <p className="mb-2 text-xs text-center">Start by searching for players</p>
              <button onClick={() => setActiveTab('search')} className="px-3 py-1.5 bg-gradient-to-r from-emerald-400 to-blue-400 text-white hover:opacity-90 transform duration-200 rounded text-xs mt-2">
                Find Friends
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
                        <span className="text-gray-500">{friend.status === 'online' ? 'Online' : 'Offline'}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleInviteToPlay(friend)}
                    className="px-1 py-0.5 h-6 min-w-[44px] bg-gradient-to-r from-emerald-400 to-blue-400 text-white hover:opacity-90 transform duration-200 rounded-none text-xs ml-2"
                  >
                    Invite
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Requests Tab */}
      {activeTab === 'requests' && (
        <div className="flex flex-col items-center w-full">
          <h2 className="text-lg font-bold mb-2 text-white">Friend Requests</h2>
          {friendRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 w-full text-gray-400">
              <Check className="w-9 h-9 mb-2 text-gray-600" />
              <h3 className="text-base font-semibold mb-1 text-center">No pending requests</h3>
              <p className="mb-2 text-xs text-center">You're all caught up!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 w-full">
              {friendRequests.map((request) => (
                <div key={request.id} className="flex flex-col items-center bg-gray-700 rounded-lg p-3 w-full">
                  <div className="w-9 h-9 bg-gray-600 rounded-full flex items-center justify-center mb-1"><Users className="w-4 h-4 text-gray-300" /></div>
                  <p className="font-medium text-white text-center text-sm mb-0.5">{request.sender.username}</p>
                  <div className="flex gap-2 w-full mt-2">
                    <button onClick={() => handleAcceptRequest(request.id)} className="flex-1 bg-gradient-to-r from-emerald-400 to-blue-400 text-white hover:opacity-90 transform duration-200 py-1.5 rounded text-xs transition-colors focus:outline-none focus:ring-0">Accept</button>
                    <button onClick={() => handleDeclineRequest(request.id)} className="flex-1 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white py-1.5 rounded text-xs transition-colors focus:outline-none focus:ring-0">Reject</button>
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
          <h2 className="text-lg font-bold mb-2 text-white">Find Friends</h2>
          <form onSubmit={e => { e.preventDefault(); handleSearch(); }} className="w-full mb-3 flex gap-2">
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Enter user ID (e.g., CHS-003-USR)" className="flex-1 px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 text-sm focus:outline-none" />
            <button type="submit" disabled={isSearching || !searchQuery.trim()} className="w-auto px-3 py-1.5 bg-gradient-to-r from-emerald-400 to-blue-400 text-white hover:opacity-90 transform duration-200 rounded text-xs flex items-center gap-1">
              <Search className="w-4 h-4" />
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </form>
          {searchResults.length > 0 && (
            <div className="flex flex-col gap-3 w-full">
              {searchResults.map((result) => (
                <div key={result.id} className="flex flex-col items-center bg-gray-700 rounded-lg p-3 w-full">
                  <div className="w-9 h-9 bg-gray-600 rounded-full flex items-center justify-center mb-1"><Users className="w-4 h-4 text-gray-300" /></div>
                  <p className="font-medium text-white text-center text-sm mb-0.5">{result.username}</p>
                  <p className="text-xs text-gray-400 mb-1">{result.id}</p>
                  <button onClick={() => handleSendFriendRequest(result.id)} className="bg-gradient-to-r from-emerald-400 to-blue-400 text-white hover:opacity-90 transform duration-200 w-full py-1.5 rounded text-xs mt-1 transition-colors">Send Request</button>
                </div>
              ))}
            </div>
          )}
          {searchQuery && !isSearching && searchResults.length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 w-full text-gray-400">
              <Search className="w-9 h-9 mb-2 text-gray-600" />
              <h3 className="text-base font-semibold mb-1 text-center">No users found</h3>
              <p className="mb-2 text-xs text-center">Try searching with a different username</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Friends; 