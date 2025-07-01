import { io, Socket } from 'socket.io-client';

// Use Vite env variable if available, fallback to localhost:3001
const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  if (!socket) {
    console.log('No socket found, creating new connection...');
    return resetSocket();
  }
  return socket;
}

export function resetSocket() {
  console.log('Resetting socket connection...');
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  const token = localStorage.getItem('chanspaw_access_token');
  if (!token) {
    console.error('No JWT token found for Socket.io connection');
    return null;
  }
  console.log('Creating new socket connection with token:', token.substring(0, 20) + '...');
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling']
  });
  socket.on('connect', () => {
    console.log('✅ Socket.io connected successfully:', socket?.id);
  });
  socket.on('connect_error', (err) => {
    console.error('❌ Socket.io connection error:', err);
    if (err.message.includes('Unauthorized')) {
      console.error('JWT token invalid or expired');
      localStorage.removeItem('chanspaw_access_token');
      // Redirect to login or show error
    }
  });
  socket.on('disconnect', () => {
    console.log('🔌 Socket.io disconnected');
  });
  socket.on('error', (err) => {
    console.error('Socket error:', err);
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function testSocket() {
  const currentSocket = getSocket();
  if (currentSocket) {
    console.log('🔍 Socket status:', {
      connected: currentSocket.connected,
      id: currentSocket.id,
      hasToken: !!localStorage.getItem('chanspaw_access_token')
    });
    return currentSocket.connected;
  }
  return false;
}

// Make socket available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).socket = getSocket();
  (window as any).testSocket = testSocket;
  (window as any).resetSocket = resetSocket;
} 