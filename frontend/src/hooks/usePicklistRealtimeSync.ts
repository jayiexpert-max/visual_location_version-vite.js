import { useCallback, useMemo, useRef } from 'react';
import type { PicklistUpdatePayload } from '@visual-location/shared';
import { SocketEvents } from '@visual-location/shared';
import { useSocketEvent } from './useSocket';
import { useAuthStore } from '../store/authStore';

function normalizePicklistId(value: string | null | undefined): string {
  return String(value ?? '').trim();
}

export function usePicklistRealtimeSync(
  selectedPicklistId: string,
  onRemoteUpdate: (picklistId: string, action: PicklistUpdatePayload['action']) => void,
  onRemoteListChange: () => void,
  enabled = true,
) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const selectedRef = useRef(selectedPicklistId);
  selectedRef.current = selectedPicklistId;

  const onRemoteUpdateRef = useRef(onRemoteUpdate);
  onRemoteUpdateRef.current = onRemoteUpdate;

  const onRemoteListChangeRef = useRef(onRemoteListChange);
  onRemoteListChangeRef.current = onRemoteListChange;

  const socketAuth = useMemo(
    () => (accessToken ? { token: accessToken } : undefined),
    [accessToken],
  );

  const handler = useCallback((payload: PicklistUpdatePayload) => {
    const incoming = normalizePicklistId(payload.picklistId);
    if (!incoming) return;

    onRemoteListChangeRef.current();

    const current = normalizePicklistId(selectedRef.current);
    if (current && incoming === current) {
      onRemoteUpdateRef.current(incoming, payload.action);
    }
  }, []);

  useSocketEvent<PicklistUpdatePayload>(
    SocketEvents.picklistUpdate,
    handler,
    enabled && Boolean(accessToken),
    socketAuth,
  );
}
