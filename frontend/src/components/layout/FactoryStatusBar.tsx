import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import * as healthService from '../../services/healthService';

export function FactoryStatusBar() {
  const { t } = useTranslation(['pages', 'common']);
  const cpkQuery = useQuery({
    queryKey: ['status-bar', 'cpk'],
    queryFn: healthService.getCpkHealth,
    refetchInterval: 60_000,
  });
  const pdsQuery = useQuery({
    queryKey: ['status-bar', 'pdservice'],
    queryFn: healthService.getPdserviceHealth,
    refetchInterval: 60_000,
  });

  const cpkOk = cpkQuery.data?.status === 'ok';
  const pdsOk = pdsQuery.data?.status === 'ok';
  const cpkPending = cpkQuery.isLoading;
  const pdsPending = pdsQuery.isLoading;

  return (
    <div className="fx-statusbar" id="fxStatusBar">
      <div
        className={`fx-status ${pdsPending ? 'is-pending' : pdsOk ? 'is-online' : 'is-offline'}`}
      >
        <span className="fx-status__dot" />
        <span>
          {pdsPending
            ? t('pages:statusCheckingPdservice')
            : pdsOk
              ? 'PDService'
              : `${t('pdservice')} ${t('offline')}`}
        </span>
      </div>
      <div
        className={`fx-status ${cpkPending ? 'is-pending' : cpkOk ? 'is-online' : 'is-offline'}`}
      >
        <span className="fx-status__dot" />
        <span>
          {cpkPending
            ? t('pages:statusCheckingCpk')
            : cpkOk
              ? 'CPK'
              : `CPK ${t('offline')}`}
        </span>
      </div>
    </div>
  );
}
