import { useCallback, useMemo, useRef } from 'react';
import type { ReservationUpdatePayload } from '@visual-location/shared';
import { SocketEvents } from '@visual-location/shared';
import { useSocketEvent } from './useSocket';
import { useAuthStore } from '../store/authStore';
import { resNoKey } from '../utils/reservationUtils';

export function useReservationRealtimeSync(
  activeResNo: string | null,
  onRemoteDetailUpdate: (resNo: string) => void,
  onRemoteListChange: () => void,
  enabled = true,
) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const activeRef = useRef(activeResNo);
  activeRef.current = activeResNo;

  const onDetailRef = useRef(onRemoteDetailUpdate);
  onDetailRef.current = onRemoteDetailUpdate;

  const onListRef = useRef(onRemoteListChange);
  onListRef.current = onRemoteListChange;

  const socketAuth = useMemo(
    () => (accessToken ? { token: accessToken } : undefined),
    [accessToken],
  );

  const handler = useCallback((payload: ReservationUpdatePayload) => {
    const incoming = resNoKey(payload.resNo);
    if (!incoming) return;

    onListRef.current();

    const current = resNoKey(activeRef.current);
    if (current && incoming === current) {
      onDetailRef.current(incoming);
    }
  }, []);

  useSocketEvent<ReservationUpdatePayload>(
    SocketEvents.reservationUpdate,
    handler,
    enabled && Boolean(accessToken),
    socketAuth,
  );
}
