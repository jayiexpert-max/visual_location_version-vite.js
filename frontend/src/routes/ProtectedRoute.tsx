import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { MenuKey } from '@visual-location/shared';

interface ProtectedRouteProps {
  menu?: MenuKey;
  roles?: Array<'admin' | 'material_prep' | 'user'>;
}

export function ProtectedRoute({ menu, roles }: ProtectedRouteProps) {
  const { isAuthenticated, canAccess, hasRole } = useAuth();
  const location = useLocation();

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
