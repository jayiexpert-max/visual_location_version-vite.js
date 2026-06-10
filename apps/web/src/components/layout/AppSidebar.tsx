import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { MENU_ITEMS } from '../../routes/menuConfig';
import { useUiStore } from '../../store/uiStore';

const DRAWER_WIDTH = 280;

export function AppSidebar() {
  const { t } = useTranslation(['menu', 'common']);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { canAccess } = useAuth();
  const { sidebarOpen, setSidebarOpen } = useUiStore();

  const items = MENU_ITEMS.filter((item) => canAccess(item.key));

  const drawer = (
    <>
      <Toolbar sx={{ px: 2 }}>
        <Typography variant="h6" fontWeight={700} color="primary">
          {t('common:appName')}
        </Typography>
      </Toolbar>
      <List sx={{ px: 1 }}>
        {items.map((item) => {
          const Icon = item.icon;
          const target = item.external ? item.path : item.path;
          return (
            <ListItemButton
              key={item.key}
              component={NavLink}
              to={target}
              target={item.external ? '_blank' : undefined}
              rel={item.external ? 'noopener noreferrer' : undefined}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                '&.active': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
                },
              }}
              onClick={() => isMobile && setSidebarOpen(false)}
            >
              <ListItemIcon>
                <Icon />
              </ListItemIcon>
              <ListItemText primary={t(`menu:${item.key}`)} />
            </ListItemButton>
          );
        })}
      </List>
    </>
  );

  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH },
        }}
      >
        {drawer}
      </Drawer>
    );
  }

  return (
    <Drawer
      variant="persistent"
      open={sidebarOpen}
      sx={{
        width: sidebarOpen ? DRAWER_WIDTH : 0,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
        },
      }}
    >
      {drawer}
    </Drawer>
  );
}

export const SIDEBAR_WIDTH = DRAWER_WIDTH;
