import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';

const SCROLL_THRESHOLD = 280;

export function AppFactoryFooter() {
  const { t } = useTranslation(['pages', 'common']);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SCROLL_THRESHOLD);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  return (
    <>
      <footer className="fx-footer">
        {t('pages:appCopyright')} &copy; {new Date().getFullYear()}
      </footer>
      <button
        type="button"
        className={`fx-back-to-top${visible ? ' is-visible' : ''}`}
        aria-label={t('backToTop')}
        title={t('backToTop')}
        onClick={scrollToTop}
      >
        <ArrowUpwardIcon aria-hidden="true" />
      </button>
    </>
  );
}
