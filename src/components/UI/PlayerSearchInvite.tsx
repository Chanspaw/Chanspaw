import React, { useState, useEffect, useRef } from "react";
import { FaSearch, FaUserPlus, FaUserCheck, FaUserTimes, FaGamepad, FaTimes, FaCheck } from "react-icons/fa";
import { debounce } from "lodash";
import io, { Socket } from "socket.io-client";
import { useTranslation } from 'react-i18next';
import { GameAPI } from '../../services/gameAPI';

// Types
interface User {
  id: string;
  username: string;
  online: boolean;
}

interface Invite {
  from: User;
  to: User;
  status: "pending" | "accepted" | "declined";
  matchId?: string;
  gameType?: string;
  betAmount?: number;
}

// Replace with your actual API base URL and socket URL
const API_BASE = "/api";
const SOCKET_URL = "/";

const PlayerSearchInvite: React.FC = () => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [invitesSent, setInvitesSent] = useState<Invite[]>([]);
  const [invitesReceived, setInvitesReceived] = useState<Invite[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [matchStarting, setMatchStarting] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const { t } = useTranslation();
  const [games, setGames] = useState<any[]>([]);
  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [betAmount, setBetAmount] = useState<number>(10);
  const [userBalances, setUserBalances] = useState<{ real_balance: number; virtual_balance: number }>({ real_balance: 0, virtual_balance: 0 });
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Fetch current user info (assume /api/auth/me returns { id, username })
  useEffect(() => {
    fetch(`${API_BASE}/auth/me`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setCurrentUser(data))
      .catch(() => setCurrentUser(null));
  }, []);

  // Fetch games and user balances on mount
  useEffect(() => {
    (async () => {
      const res = await GameAPI.getGameConfigs();
      if (res.success && res.configs) setGames(res.configs);
      // Fetch user balances
      const token = localStorage.getItem('chanspaw_access_token') || localStorage.getItem('token');
      const response = await fetch('/api/wallet/balance', { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) {
        const data = await response.json();
        setUserBalances(data.data);
      }
    })();
  }, []);

  // Setup socket.io
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.on("invite:received", (invite: Invite) => {
      setInvitesReceived((prev) => [invite, ...prev.filter(i => i.from.id !== invite.from.id)]);
    });
    socket.on("invite:cancelled", (fromUserId: string) => {
      setInvitesReceived((prev) => prev.filter(i => i.from.id !== fromUserId));
    });
    socket.on("invite:accepted", (invite: Invite) => {
      setInvitesSent((prev) => prev.map(i => i.to.id === invite.to.id ? { ...i, status: "accepted", matchId: invite.matchId } : i));
      setMatchStarting(invite.matchId || null);
    });
    socket.on("invite:declined", (invite: Invite) => {
      setInvitesSent((prev) => prev.map(i => i.to.id === invite.to.id ? { ...i, status: "declined" } : i));
    });
    socket.on("match:started", (match: { matchId: string, opponent: User }) => {
      setMatchStarting(match.matchId);
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  // Debounced search
  const doSearch = debounce((q: string) => {
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`${API_BASE}/users/search?q=${encodeURIComponent(q)}`)
      .then((res) => res.json())
      .then((data) => setResults(data))
      .finally(() => setLoading(false));
  }, 400);

  useEffect(() => {
    doSearch(search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Send invite with game and amount
  const sendInvite = (user: User) => {
    if (!currentUser || !selectedGame) return;
    if (betAmount < selectedGame.minBet || betAmount > selectedGame.maxBet) {
      setInviteError(`Bet must be between ${selectedGame.minBet} and ${selectedGame.maxBet}`);
      return;
    }
    const balance = selectedGame.type === 'real' ? userBalances.real_balance : userBalances.virtual_balance;
    if (balance < betAmount) {
      setInviteError('Insufficient balance');
      return;
    }
    setInviteError(null);
    fetch(`${API_BASE}/invite/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token') || localStorage.getItem('token')}`
      },
      body: JSON.stringify({ to: user.id, gameType: selectedGame.id, betAmount })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setInvitesSent((prev) => [
            { from: currentUser, to: user, status: 'pending', gameType: selectedGame.id, betAmount },
            ...prev.filter(i => i.to.id !== user.id),
          ]);
        } else {
          setInviteError(data.message || 'Failed to send invite');
        }
      })
      .catch(err => {
        setInviteError('Network error sending invite');
        console.error(err);
      });
  };

  // Cancel invite
  const cancelInvite = (user: User) => {
    if (!currentUser) return;
    fetch(`${API_BASE}/invite/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token') || localStorage.getItem('token')}`
      },
      body: JSON.stringify({ to: user.id })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setInvitesSent((prev) => prev.filter(i => i.to.id !== user.id));
        } else {
          setInviteError(data.message || 'Failed to cancel invite');
        }
      })
      .catch(err => {
        setInviteError('Network error cancelling invite');
        console.error(err);
      });
  };

  // Accept invite only if enough balance
  const acceptInvite = (invite: Invite) => {
    if (!currentUser) return;
    const balance = invite.gameType === 'real' ? userBalances.real_balance : userBalances.virtual_balance;
    if (balance < invite.betAmount) return;
    fetch(`${API_BASE}/invite/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token') || localStorage.getItem('token')}`
      },
      body: JSON.stringify({ from: invite.from.id, gameType: invite.gameType, betAmount: invite.betAmount })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setInvitesReceived((prev) => prev.filter(i => i.from.id !== invite.from.id));
        } else {
          setInviteError(data.message || 'Failed to accept invite');
        }
      })
      .catch(err => {
        setInviteError('Network error accepting invite');
        console.error(err);
      });
  };

  // Decline invite
  const declineInvite = (from: User) => {
    if (!currentUser) return;
    fetch(`${API_BASE}/invite/decline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token') || localStorage.getItem('token')}`
      },
      body: JSON.stringify({ from: from.id })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setInvitesReceived((prev) => prev.filter(i => i.from.id !== from.id));
        } else {
          setInviteError(data.message || 'Failed to decline invite');
        }
      })
      .catch(err => {
        setInviteError('Network error declining invite');
        console.error(err);
      });
  };

  // Start match instantly (bypass invite)
  const startMatch = (user: User) => {
    if (!currentUser) return;
    setMatchStarting("pending");
    fetch(`${API_BASE}/match/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token') || localStorage.getItem('token')}`
      },
      body: JSON.stringify({ opponentId: user.id })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setMatchStarting(data.matchId);
        } else {
          setInviteError(data.message || 'Failed to start match');
        }
      })
      .catch(err => {
        setInviteError('Network error starting match');
        console.error(err);
      });
  };

  // UI
  return (
    <div className="max-w-xl mx-auto p-3 bg-card-gradient border border-gray-700 rounded-lg shadow-lg">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
        <FaUserPlus className="text-gaming-accent" /> {t('playerSearch.title')} & {t('invite.1v1')}
      </h2>
      {/* Game and amount selection */}
      <div className="mb-4 flex gap-2 items-center">
        <select
          className="bg-gaming-dark text-white px-3 py-2 rounded border border-gray-600 focus:border-gaming-accent focus:outline-none text-sm"
          value={selectedGame?.id || ''}
          onChange={e => {
            const g = games.find(g => g.id === e.target.value);
            setSelectedGame(g);
            setBetAmount(g?.minBet || 10);
          }}
        >
          <option value="">{t('invite.selectGame')}</option>
          {games.map(g => (
            <option key={g.id} value={g.id}>{g.name} (${g.minBet}-{g.maxBet})</option>
          ))}
        </select>
        <input
          type="number"
          className="bg-gaming-dark text-white px-3 py-2 rounded border border-gray-600 focus:border-gaming-accent focus:outline-none text-sm w-28"
          min={selectedGame?.minBet || 1}
          max={selectedGame?.maxBet || 1000}
          value={betAmount}
          onChange={e => setBetAmount(Number(e.target.value))}
          placeholder={t('invite.amount')}
          disabled={!selectedGame}
        />
      </div>
      {inviteError && <div className="text-red-400 mb-2">{inviteError}</div>}
      {/* Search and results */}
      <div className="mb-4 flex items-center gap-2">
        <input
          className="flex-1 bg-gaming-dark text-white px-3 py-2 rounded border border-gray-600 focus:border-gaming-accent focus:outline-none text-sm"
          placeholder={t('playerSearch.searchPlaceholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <FaSearch className="text-gaming-accent" />
      </div>
      {loading && <div className="text-gaming-accent mb-2">{t('playerSearch.searching')}</div>}
      {results.length > 0 && (
        <div className="mb-4">
          <div className="font-semibold mb-1 text-white">{t('playerSearch.results')}:</div>
          <ul>
            {results.map(user => (
              <li key={user.id} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-b-0">
                <span className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${user.online ? "bg-gaming-accent" : "bg-gray-500"}`}></span>
                  <span className="text-white">{user.username}</span>
                </span>
                {user.id === currentUser?.id ? (
                  <span className="text-xs text-gray-400">{t('playerSearch.you')}</span>
                ) : invitesSent.some(i => i.to.id === user.id && i.status === "pending") ? (
                  <button
                    className="px-3 py-1.5 bg-gradient-to-r from-emerald-400 to-blue-400 text-white hover:opacity-90 transform duration-200 rounded text-xs flex items-center gap-1"
                    onClick={() => cancelInvite(user)}
                  >
                    <FaTimes /> {t('invite.cancel')}
                  </button>
                ) : (
                  <button
                    className="px-3 py-1.5 bg-gradient-to-r from-emerald-400 to-blue-400 text-white hover:opacity-90 transform duration-200 rounded text-xs flex items-center gap-1"
                    onClick={() => sendInvite(user)}
                    disabled={!selectedGame || betAmount < (selectedGame?.minBet || 1) || betAmount > (selectedGame?.maxBet || 1000)}
                  >
                    <FaUserPlus /> {t('invite.invite')}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* Sent invites */}
      <div className="mb-4">
        <div className="font-semibold mb-1 text-white">{t('invite.sent')}:</div>
        {invitesSent.length === 0 ? (
          <div className="text-gray-400 text-sm">{t('invite.noInvitesSent')}</div>
        ) : (
          <ul>
            {invitesSent.map(invite => (
              <li key={invite.to.id} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-b-0">
                <span className="flex items-center gap-2">
                  <span className="text-white">{invite.to.username}</span>
                  <span className="text-xs text-gray-400">({invite.status})</span>
                </span>
                {invite.status === "pending" && (
                  <button
                    className="px-3 py-1.5 bg-gradient-to-r from-emerald-400 to-blue-400 text-white hover:opacity-90 transform duration-200 rounded text-xs flex items-center gap-1"
                    onClick={() => cancelInvite(invite.to)}
                  >
                    <FaTimes /> {t('invite.cancel')}
                  </button>
                )}
                {invite.status === "accepted" && invite.matchId && (
                  <a
                    href={`/match/${invite.matchId}`}
                    className="px-3 py-1.5 bg-gradient-to-r from-emerald-400 to-blue-400 text-white hover:opacity-90 transform duration-200 rounded text-xs flex items-center gap-1"
                  >
                    <FaCheck /> {t('invite.goToMatch')}
                  </a>
                )}
                {invite.status === "declined" && (
                  <span className="text-xs text-red-400 flex items-center gap-1"><FaUserTimes /> {t('invite.declined')}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* Received invites */}
      <div className="mb-4">
        <div className="font-semibold mb-1 text-white">{t('invite.received')}:</div>
        {invitesReceived.length === 0 ? (
          <div className="text-gray-400 text-sm">{t('invite.noInvitesReceived')}</div>
        ) : (
          <ul>
            {invitesReceived.map(invite => {
              const balance = invite.gameType === 'real' ? userBalances.real_balance : userBalances.virtual_balance;
              const bet = invite.betAmount ?? 0;
              const canAccept = balance >= bet;
              return (
                <li key={invite.from.id} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-b-0">
                  <span className="flex flex-col gap-1">
                    <span className="text-white">{invite.from.username}</span>
                    <span className="text-xs text-gray-400">{invite.gameType} - ${bet}</span>
                  </span>
                  <div className="flex gap-2">
                    <button
                      className={`px-3 py-1.5 bg-gradient-to-r from-emerald-400 to-blue-400 text-white rounded text-xs flex items-center gap-1 ${!canAccept ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => canAccept && acceptInvite(invite)}
                      disabled={!canAccept}
                      title={!canAccept ? t('invite.insufficientBalance') : ''}
                    >
                      <FaCheck /> {t('invite.accept')}
                    </button>
                    <button
                      className="px-3 py-1.5 bg-gradient-to-r from-emerald-400 to-blue-400 text-white rounded text-xs flex items-center gap-1"
                      onClick={() => declineInvite(invite.from)}
                    >
                      <FaTimes /> {t('invite.decline')}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {matchStarting && matchStarting !== "pending" && (
        <div className="p-4 bg-gaming-dark border border-gaming-accent rounded flex items-center gap-2 mt-4">
          <FaGamepad className="text-gaming-accent" />
          <span className="text-white">{t('invite.matchStarted')}: <a href={`/match/${matchStarting}`} className="underline text-gaming-accent">{t('invite.goToMatch')}</a></span>
        </div>
      )}
    </div>
  );
};

export default PlayerSearchInvite; 