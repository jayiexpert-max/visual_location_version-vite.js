import { CssBaseline, ThemeProvider } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { RouteErrorBoundary } from '../components/common/RouteErrorBoundary';
import { RouteSuspense } from '../components/common/RouteSuspense';
import { tvTheme } from '../theme';

export function TvLayout() {
  return (
    <ThemeProvider theme={tvTheme}>
      <CssBaseline />
      <RouteErrorBoundary variant="factory">
        <RouteSuspense variant="minimal">
          <Outlet />
        </RouteSuspense>
      </RouteErrorBoundary>
    </ThemeProvider>
  );
}
