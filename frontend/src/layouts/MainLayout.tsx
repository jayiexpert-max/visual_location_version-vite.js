import { Outlet, useLocation } from 'react-router-dom';
import { useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AppFactoryBar } from '../components/layout/AppFactoryBar';
import { AppFactoryFooter } from '../components/layout/AppFactoryFooter';
import { FactoryStatusBar } from '../components/layout/FactoryStatusBar';
import { useShiftLogout } from '../hooks/useShiftLogout';
import { MENU_ITEMS } from '../routes/menuConfig';

const SCAN_PAGE_PATHS = [
  '/app/search',
  '/app/receive-reservation',
  '/app/receive-return',
  '/app/picklist',
  '/app/booking-out',
  '/app/wo-material-calc',
];

const STATUS_BAR_PATHS = SCAN_PAGE_PATHS;

export function MainLayout() {
  const { t } = useTranslation('menu');
  const location = useLocation();
  useShiftLogout();

  const isDashboard = location.pathname === '/app' || location.pathname === '/app/';
  const isReservation = location.pathname.startsWith('/app/receive-reservation');
  const isPicklist = location.pathname.startsWith('/app/picklist');
  const isAbdulChat = location.pathname.startsWith('/app/abdul-chat');
  const isScanPage = SCAN_PAGE_PATHS.some((p) => location.pathname.startsWith(p));
  const showStatusBar = STATUS_BAR_PATHS.some((p) => location.pathname.startsWith(p));

  useLayoutEffect(() => {
    document.body.classList.remove('login-route');
    document.body.classList.add('factory-app');
    if (isDashboard) {
      document.body.classList.add('factory-dashboard');
    } else {
      document.body.classList.remove('factory-dashboard');
    }
    if (isReservation) {
      document.body.classList.add('factory-reservation');
    } else {
      document.body.classList.remove('factory-reservation');
    }
    if (isPicklist) {
      document.body.classList.add('factory-picklist');
    } else {
      document.body.classList.remove('factory-picklist');
    }
    if (isScanPage) {
      document.body.classList.add('factory-scan-page');
    } else {
      document.body.classList.remove('factory-scan-page');
    }
    if (isAbdulChat) {
      document.body.classList.add('factory-abdul-chat');
    } else {
      document.body.classList.remove('factory-abdul-chat');
    }
    return () => {
      document.body.classList.remove(
        'factory-app',
        'factory-dashboard',
        'factory-reservation',
        'factory-picklist',
        'factory-scan-page',
        'factory-abdul-chat',
      );
    };
  }, [isDashboard, isReservation, isPicklist, isScanPage, isAbdulChat]);

  const currentMenu = MENU_ITEMS.find(
    (item) =>
      !item.external &&
      (location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)),
  );

  return (
    <div className={`factory-app${isDashboard ? ' factory-dashboard' : ''}${isPicklist ? ' factory-picklist-shell' : ''}`}>
      <AppFactoryBar
        title={currentMenu ? t(currentMenu.key) : undefined}
        isDashboard={isDashboard}
        showHome={!isDashboard}
      />
      {showStatusBar && <FactoryStatusBar />}
      <main className={`fx-main${isDashboard ? ' fx-main--dashboard' : ''}${isReservation || isPicklist ? ' fx-main--flush' : ''}`}>
        <Outlet />
      </main>
      <AppFactoryFooter />
    </div>
  );
}
