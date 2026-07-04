import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const agentSocket = io(`${SOCKET_URL}/agent`, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

agentSocket.on('connect', () => {
  console.log(' Agent socket connected');
});

agentSocket.on('disconnect', (reason) => {
  console.log(' Agent socket disconnected:', reason);
});

agentSocket.on('connect_error', (error) => {
  console.error(' Agent socket error:', error.message);
});

export default agentSocket;
