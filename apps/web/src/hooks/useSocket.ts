import { useEffect } from 'react';
import { getSocket } from '../services/socketService';

export function useSocketEvent<T>(
  event: string,
  handler: (payload: T) => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;
    const socket = getSocket();
    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, [event, handler, enabled]);
}
