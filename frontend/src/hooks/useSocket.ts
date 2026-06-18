import { useEffect } from 'react';
import { getSocket, type SocketAuth } from '../services/socketService';

export function useSocketEvent<T>(
  event: string,
  handler: (payload: T) => void,
  enabled = true,
  auth?: SocketAuth,
) {
  const authKey = auth?.token ?? auth?.kioskKey ?? '';

  useEffect(() => {
    if (!enabled || !authKey) return;
    const socket = getSocket(auth);
    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, [auth, authKey, enabled, event, handler]);
}
