import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PicklistUpdatePayload } from '@visual-location/shared';
import { SocketEvents } from '@visual-location/shared';
import * as cpkService from '../services/cpkService';
import { useSocketEvent } from './useSocket';
import { useAuthStore } from '../store/authStore';
import {
  alertPendingPicklists,
  alertNewPicklists,
  bindPicklistAudioUnlock,
  countPendingPicklists,
  detectNewPicklistIds,
  enrichPicklistIssueStates,
  normalizeDetailItems,
  normalizePicklistList,
  type PicklistIssueState,
} from '../utils/picklistNotify';

export const PICKLIST_NOTIFY_QUERY_KEY = ['picklist-notify', 'open'] as const;

const POLL_MS = 60_000;

/** Bust dashboard/handheld pending badge after issue, close, or remote sync. */
export function invalidatePicklistNotify(queryClient: ReturnType<typeof useQueryClient>): void {
  void queryClient.invalidateQueries({ queryKey: [...PICKLIST_NOTIFY_QUERY_KEY] });
}

export function usePicklistNotify(enabled: boolean) {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);
  const stateMapRef = useRef<Record<string, PicklistIssueState>>({});
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    return bindPicklistAudioUnlock();
  }, [enabled]);

  const fetchPending = useCallback(async () => {
    const data = await cpkService.getOpenPicklists();
    const list = normalizePicklistList(data);
    await enrichPicklistIssueStates(list, stateMapRef.current, async (picklistId) => {
      const detail = await cpkService.getPicklistDetail({ picklistId });
      return normalizeDetailItems(detail);
    });
    const pending = countPendingPicklists(list, stateMapRef.current);
    const newIds = detectNewPicklistIds(list, stateMapRef.current);
    if (pending > 0 && newIds.length) {
      alertNewPicklists(newIds, pending);
    } else if (pending > 0) {
      alertPendingPicklists(pending);
    }
    return { list, pending };
  }, []);

  const query = useQuery({
    queryKey: [...PICKLIST_NOTIFY_QUERY_KEY],
    enabled,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: POLL_MS,
    queryFn: fetchPending,
  });

  const socketAuth = accessToken ? { token: accessToken } : undefined;

  useSocketEvent<PicklistUpdatePayload>(
    SocketEvents.picklistUpdate,
    () => {
      invalidatePicklistNotify(queryClient);
    },
    enabled && Boolean(accessToken),
    socketAuth,
  );

  useEffect(() => {
    if (query.data?.pending != null) setPendingCount(query.data.pending);
  }, [query.data?.pending]);

  return {
    pendingCount: query.data?.pending ?? pendingCount,
    isLoading: query.isLoading,
    refresh: () => invalidatePicklistNotify(queryClient),
  };
}
