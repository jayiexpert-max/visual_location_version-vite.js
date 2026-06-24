import { useEffect } from 'react';
import { getSocket, type SocketAuth } from '../services/socketService';

export function useSocketEvent<T>(
  event: string,
  handler: (payload: T) => void,
  enabled = true,
  auth?: SocketAuth,
) {
  useEffect(() => {
    if (!enabled) return;
    const socket = getSocket(auth);
    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, [auth, enabled, event, handler]);
}
