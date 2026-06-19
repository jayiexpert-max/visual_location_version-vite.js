import { useQuery } from '@tanstack/react-query';
import * as healthService from '../services/healthService';

export function useServiceReadiness() {
  const query = useQuery({
    queryKey: ['service-readiness'],
    queryFn: () => healthService.getHealthDashboard(),
    refetchInterval: 15000,
    staleTime: 10000,
    retry: 1,
  });

  const snapshot = query.data;
  const cpkOk = snapshot?.cpk?.status === 'ok';

  return {
    loading: query.isLoading || query.isFetching,
    cpkOk,
    snapshot,
  };
}
