import { useCallback } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAuthHydrated } from '../hooks/useAuthHydrated';
import { useHandheldIdle } from '../hooks/useHandheldIdle';
import { RouteErrorBoundary } from '../components/common/RouteErrorBoundary';
import { RouteSuspense } from '../components/common/RouteSuspense';
import '../styles/handheld.css';

export function HandheldLayout() {
  const hydrated = useAuthHydrated();
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleIdle = useCallback(() => {
    void logout().finally(() => {
      navigate('/handheld/login?timeout=1&reason=idle', { replace: true });
    });
  }, [logout, navigate]);

  useHandheldIdle(handleIdle);

  if (!hydrated) {
    return (
      <div className="handheld-app">
        <main className="handheld-main">
          <p className="fx-alert fx-alert-info">Loading…</p>
        </main>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/handheld/login" replace />;
  }

  return (
    <div className="handheld-app">
      <main className="handheld-main">
        <RouteErrorBoundary variant="handheld">
          <RouteSuspense variant="handheld">
            <Outlet />
          </RouteSuspense>
        </RouteErrorBoundary>
      </main>
    </div>
  );
}
