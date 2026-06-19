import { PageHeader } from '../../components/layout/PageHeader';
import { useTranslation } from 'react-i18next';
import { RackOverviewSection } from './RackOverviewSection';

export function RackOverviewPage() {
  const { t } = useTranslation(['pages', 'common']);

  return (
    <>
      <PageHeader title={t('rackTitle')} />
      <RackOverviewSection showTitle={false} />
    </>
  );
}
