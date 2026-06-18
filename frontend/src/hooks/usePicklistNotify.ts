import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import * as cpkService from '../services/cpkService';
import {
  alertNewPicklists,
  bindPicklistAudioUnlock,
  countPendingPicklists,
  detectNewPicklistIds,
  enrichPicklistIssueStates,
  normalizeDetailItems,
  normalizePicklistList,
  type PicklistIssueState,
} from '../utils/picklistNotify';

const POLL_MS = 60_000;

export function usePicklistNotify(enabled: boolean) {
  const stateMapRef = useRef<Record<string, PicklistIssueState>>({});
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    return bindPicklistAudioUnlock();
  }, [enabled]);

  const query = useQuery({
    queryKey: ['picklist-notify', 'open'],
    enabled,
    refetchInterval: POLL_MS,
    queryFn: async () => {
      const data = await cpkService.getOpenPicklists();
      const list = normalizePicklistList(data);
      await enrichPicklistIssueStates(list, stateMapRef.current, async (picklistId) => {
        const detail = await cpkService.getPicklistDetail({ picklistId });
        return normalizeDetailItems(detail);
      });
      const pending = countPendingPicklists(list, stateMapRef.current);
      const newIds = detectNewPicklistIds(list, stateMapRef.current);
      if (newIds.length) {
        alertNewPicklists(newIds);
      }
      return { list, pending };
    },
  });

  useEffect(() => {
    if (query.data?.pending != null) setPendingCount(query.data.pending);
  }, [query.data?.pending]);

  return {
    pendingCount: query.data?.pending ?? pendingCount,
    isLoading: query.isLoading,
  };
}
