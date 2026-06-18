import { Box, CircularProgress } from '@mui/material';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAuthHydrated } from '../hooks/useAuthHydrated';
import type { MenuKey } from '@visual-location/shared';

interface ProtectedRouteProps {
  menu?: MenuKey;
  roles?: Array<'admin' | 'manage' | 'material_prep' | 'user'>;
}

function AuthBootLoader() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh' }}>
      <CircularProgress />
    </Box>
  );
}

export function ProtectedRoute({ menu, roles }: ProtectedRouteProps) {
  const hydrated = useAuthHydrated();
  const { isAuthenticated, canAccess, hasRole } = useAuth();
  const location = useLocation();

  if (!hydrated) {
    return <AuthBootLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (menu && !canAccess(menu)) {
    return <Navigate to="/app" replace />;
  }

  if (roles && !roles.some((r) => hasRole(r))) {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}
