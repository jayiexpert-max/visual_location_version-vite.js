import { CssBaseline, ThemeProvider } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { tvTheme } from '../theme';

export function TvLayout() {
  return (
    <ThemeProvider theme={tvTheme}>
      <CssBaseline />
      <Outlet />
    </ThemeProvider>
  );
}
