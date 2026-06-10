import {
  AppBar,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import LanguageIcon from '@mui/icons-material/Language';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useUiStore } from '../../store/uiStore';
import { SIDEBAR_WIDTH } from './AppSidebar';

interface AppTopBarProps {
  title?: string;
}

export function AppTopBar({ title }: AppTopBarProps) {
  const { t, i18n } = useTranslation(['common', 'pages']);
  const { user, logout, changeLanguage } = useAuth();
  const { sidebarOpen, toggleSidebar, themeMode, toggleThemeMode } = useUiStore();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [langAnchor, setLangAnchor] = useState<null | HTMLElement>(null);

  return (
    <AppBar
      position="fixed"
      color="default"
      elevation={1}
      sx={{
        width: { md: sidebarOpen ? `calc(100% - ${SIDEBAR_WIDTH}px)` : '100%' },
        ml: { md: sidebarOpen ? `${SIDEBAR_WIDTH}px` : 0 },
        transition: (theme) =>
          theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
      }}
    >
      <Toolbar sx={{ gap: 1 }}>
        <IconButton edge="start" onClick={toggleSidebar} aria-label="menu">
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
          {title ?? t('pages:dashboardTitle')}
        </Typography>

        <Tooltip title={t('common:notifications')}>
          <IconButton>
            <NotificationsNoneIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title={t('common:language')}>
          <IconButton onClick={(e) => setLangAnchor(e.currentTarget)}>
            <LanguageIcon />
          </IconButton>
        </Tooltip>
        <Menu anchorEl={langAnchor} open={Boolean(langAnchor)} onClose={() => setLangAnchor(null)}>
          <MenuItem
            selected={i18n.language === 'th'}
            onClick={() => {
              void changeLanguage('th');
              setLangAnchor(null);
            }}
          >
            {t('common:thai')}
          </MenuItem>
          <MenuItem
            selected={i18n.language === 'en'}
            onClick={() => {
              void changeLanguage('en');
              setLangAnchor(null);
            }}
          >
            {t('common:english')}
          </MenuItem>
        </Menu>

        <Tooltip title={themeMode === 'dark' ? t('common:lightMode') : t('common:darkMode')}>
          <IconButton onClick={toggleThemeMode}>
            {themeMode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Tooltip>

        <Tooltip title={t('common:profile')}>
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <AccountCircleIcon />
          </IconButton>
        </Tooltip>
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          <MenuItem disabled>
            <Box>
              <Typography variant="subtitle2">{user?.username}</Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.role}
              </Typography>
            </Box>
          </MenuItem>
          <MenuItem
            onClick={() => {
              void logout();
              setAnchorEl(null);
            }}
          >
            <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
            {t('common:logout')}
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
