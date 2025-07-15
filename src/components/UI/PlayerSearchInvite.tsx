import React, { useState, useEffect, useRef } from "react";
import { FaSearch, FaUserPlus, FaUserCheck, FaUserTimes, FaGamepad, FaTimes, FaCheck } from "react-icons/fa";
import { debounce } from "lodash";
import io, { Socket } from "socket.io-client";
import { useTranslation } from 'react-i18next';

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

  // Fetch current user info (assume /api/auth/me returns { id, username })
  useEffect(() => {
    fetch(`${API_BASE}/auth/me`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setCurrentUser(data))
      .catch(() => setCurrentUser(null));
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

  // Send invite
  const sendInvite = (user: User) => {
    if (!socketRef.current || !currentUser) return;
    socketRef.current.emit("invite:send", { to: user.id });
    setInvitesSent((prev) => [
      { from: currentUser, to: user, status: "pending" },
      ...prev.filter(i => i.to.id !== user.id),
    ]);
  };

  // Cancel invite
  const cancelInvite = (user: User) => {
    if (!socketRef.current) return;
    socketRef.current.emit("invite:cancel", { to: user.id });
    setInvitesSent((prev) => prev.filter(i => i.to.id !== user.id));
  };

  // Accept invite
  const acceptInvite = (from: User) => {
    if (!socketRef.current) return;
    socketRef.current.emit("invite:accept", { from: from.id });
    setInvitesReceived((prev) => prev.filter(i => i.from.id !== from.id));
  };

  // Decline invite
  const declineInvite = (from: User) => {
    if (!socketRef.current) return;
    socketRef.current.emit("invite:decline", { from: from.id });
    setInvitesReceived((prev) => prev.filter(i => i.from.id !== from.id));
  };

  // Start match instantly (bypass invite)
  const startMatch = (user: User) => {
    if (!socketRef.current) return;
    setMatchStarting("pending");
    socketRef.current.emit("match:start", { opponentId: user.id });
  };

  // UI
  return (
    <div className="max-w-xl mx-auto p-3 bg-card-gradient border border-gray-700 rounded-lg shadow-lg">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
        <FaUserPlus className="text-gaming-accent" /> {t('playerSearch.title')} & {t('invite.1v1')}
      </h2>
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
                  <div className="flex gap-2">
                    <button
                      className="px-3 py-1.5 bg-gradient-to-r from-emerald-400 to-blue-400 text-white hover:opacity-90 transform duration-200 rounded text-xs flex items-center gap-1"
                      onClick={() => sendInvite(user)}
                    >
                      <FaUserPlus /> {t('invite.invite')}
                    </button>
                    <button
                      className="px-3 py-1.5 bg-gradient-to-r from-emerald-400 to-blue-400 text-white hover:opacity-90 transform duration-200 rounded text-xs flex items-center gap-1"
                      onClick={() => startMatch(user)}
                      disabled={matchStarting === "pending"}
                    >
                      <FaGamepad /> {matchStarting === "pending" ? t('invite.starting') : t('invite.instantMatch')}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
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
      <div className="mb-4">
        <div className="font-semibold mb-1 text-white">{t('invite.received')}:</div>
        {invitesReceived.length === 0 ? (
          <div className="text-gray-400 text-sm">{t('invite.noInvitesReceived')}</div>
        ) : (
          <ul>
            {invitesReceived.map(invite => (
              <li key={invite.from.id} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-b-0">
                <span className="flex items-center gap-2">
                  <span className="text-white">{invite.from.username}</span>
                </span>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1.5 bg-gradient-to-r from-emerald-400 to-blue-400 text-white hover:opacity-90 transform duration-200 rounded text-xs flex items-center gap-1"
                    onClick={() => acceptInvite(invite.from)}
                  >
                    <FaCheck /> {t('invite.accept')}
                  </button>
                  <button
                    className="px-3 py-1.5 bg-gradient-to-r from-emerald-400 to-blue-400 text-white hover:opacity-90 transform duration-200 rounded text-xs flex items-center gap-1"
                    onClick={() => declineInvite(invite.from)}
                  >
                    <FaTimes /> {t('invite.decline')}
                  </button>
                </div>
              </li>
            ))}
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