import { Box, Toolbar } from '@mui/material';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppSidebar, SIDEBAR_WIDTH } from '../components/layout/AppSidebar';
import { AppTopBar } from '../components/layout/AppTopBar';
import { useShiftLogout } from '../hooks/useShiftLogout';
import { useUiStore } from '../store/uiStore';
import { MENU_ITEMS } from '../routes/menuConfig';

export function MainLayout() {
  const { t } = useTranslation('menu');
  const location = useLocation();
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  useShiftLogout();

  const currentMenu = MENU_ITEMS.find((item) =>
    item.external ? false : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`),
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppTopBar title={currentMenu ? t(currentMenu.key) : undefined} />
      <AppSidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          width: { md: sidebarOpen ? `calc(100% - ${SIDEBAR_WIDTH}px)` : '100%' },
          transition: (theme) =>
            theme.transitions.create(['width', 'margin'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
        }}
      >
        <Toolbar />
        <Box sx={{ maxWidth: 1600, mx: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
