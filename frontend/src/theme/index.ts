import { createTheme, type PaletteMode } from '@mui/material/styles';

const industrialTokens = {
  primary: '#059669',
  secondary: '#2563eb',
  warning: '#d97706',
  error: '#dc2626',
  info: '#2563eb',
  surfaceDark: '#1e293b',
  backgroundDark: '#0f172a',
  surfaceLight: '#ffffff',
  backgroundLight: '#ffffff',
};

export function createAppTheme(mode: PaletteMode) {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: { main: industrialTokens.primary },
      secondary: { main: industrialTokens.secondary },
      warning: { main: industrialTokens.warning },
      error: { main: industrialTokens.error },
      info: { main: industrialTokens.info },
      background: {
        default: isDark ? industrialTokens.backgroundDark : industrialTokens.backgroundLight,
        paper: isDark ? industrialTokens.surfaceDark : '#ffffff',
      },
    },
    typography: {
      fontFamily: '"Outfit", "Sarabun", "Roboto", "Helvetica", "Arial", sans-serif',
      h4: { fontWeight: 700 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600, fontSize: '1rem' },
    },
    shape: { borderRadius: 8 },
    components: {
      MuiButton: {
        defaultProps: { size: 'large' },
        styleOverrides: {
          root: { minHeight: 48, paddingLeft: 20, paddingRight: 20 },
        },
      },
      MuiIconButton: {
        styleOverrides: { root: { width: 48, height: 48 } },
      },
      MuiTextField: {
        defaultProps: { size: 'medium' },
      },
      MuiListItemButton: {
        styleOverrides: { root: { minHeight: 52 } },
      },
      MuiCard: {
        styleOverrides: {
          root: { borderRadius: 12 },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { padding: '14px 16px', fontSize: '0.95rem' },
          head: { fontWeight: 700 },
        },
      },
    },
  });
}

export const tvTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#4f46e5' },
    secondary: { main: '#10b981' },
    background: { default: '#0f172a', paper: '#1e293b' },
  },
  typography: {
    fontFamily: '"Outfit", "Sarabun", sans-serif',
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
  },
});
