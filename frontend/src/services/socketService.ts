import { io, type Socket } from 'socket.io-client';
import { SocketEvents } from '@visual-location/shared';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? '';

export interface SocketAuth {
  token?: string;
  kioskKey?: string;
}

let socket: Socket | null = null;

function buildAuthPayload(auth?: SocketAuth): Record<string, string> {
  const payload: Record<string, string> = {};
  if (auth?.token) payload.token = auth.token;
  if (auth?.kioskKey) payload.kioskKey = auth.kioskKey;
  return payload;
}

function authMatches(current: unknown, next?: SocketAuth): boolean {
  const cur = (current ?? {}) as SocketAuth;
  return cur.token === next?.token && cur.kioskKey === next?.kioskKey;
}

export function getSocket(auth?: SocketAuth): Socket {
  if (!socket || !authMatches(socket.auth, auth)) {
    socket?.disconnect();
    socket = io(`${SOCKET_URL}/realtime`, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      auth: buildAuthPayload(auth),
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

export { SocketEvents };
