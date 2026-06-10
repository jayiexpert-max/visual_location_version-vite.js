import { lazy, Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { MainLayout } from '../layouts/MainLayout';
import { TvLayout } from '../layouts/TvLayout';
import { LoginPage } from '../pages/LoginPage';
import { ProtectedRoute } from './ProtectedRoute';

const DashboardPage = lazy(() =>
  import('../pages/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const SearchPage = lazy(() =>
  import('../pages/search/SearchPage').then((m) => ({ default: m.SearchPage })),
);
const ReceiveReservationPage = lazy(() =>
  import('../pages/receive/ReceiveReservationPage').then((m) => ({
    default: m.ReceiveReservationPage,
  })),
);
const ReceiveReturnPage = lazy(() =>
  import('../pages/receive/ReceiveReturnPage').then((m) => ({ default: m.ReceiveReturnPage })),
);
const PicklistPage = lazy(() =>
  import('../pages/picklist/PicklistPage').then((m) => ({ default: m.PicklistPage })),
);
const RackOverviewPage = lazy(() =>
  import('../pages/rack/RackOverviewPage').then((m) => ({ default: m.RackOverviewPage })),
);
const ExpiryCheckPage = lazy(() =>
  import('../pages/expiry/ExpiryCheckPage').then((m) => ({ default: m.ExpiryCheckPage })),
);
const ReportsPage = lazy(() =>
  import('../pages/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })),
);
const UsersPage = lazy(() =>
  import('../pages/users/UsersPage').then((m) => ({ default: m.UsersPage })),
);
const SystemAdminPage = lazy(() =>
  import('../pages/admin/SystemAdminPage').then((m) => ({ default: m.SystemAdminPage })),
);
const IoMonitorPage = lazy(() =>
  import('../pages/admin/IoMonitorPage').then((m) => ({ default: m.IoMonitorPage })),
);
const SystemHealthPage = lazy(() =>
  import('../pages/admin/SystemHealthPage').then((m) => ({ default: m.SystemHealthPage })),
);
const Layout3dPage = lazy(() =>
  import('../pages/layout3d/Layout3dPage').then((m) => ({ default: m.Layout3dPage })),
);
const TvDisplayPage = lazy(() =>
  import('../pages/tv/TvDisplayPage').then((m) => ({ default: m.TvDisplayPage })),
);

function PageLoader() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
      <CircularProgress />
    </Box>
  );
}

export function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<AuthLayout />}>
          <Route index element={<LoginPage />} />
        </Route>

        <Route element={<ProtectedRoute menu="layout3d" />}>
          <Route path="/layout-3d" element={<Layout3dPage />} />
        </Route>

        <Route path="/tv" element={<TvLayout />}>
          <Route index element={<TvDisplayPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<MainLayout />}>
            <Route index element={<DashboardPage />} />
            <Route element={<ProtectedRoute menu="search" />}>
              <Route path="search" element={<SearchPage />} />
            </Route>
            <Route element={<ProtectedRoute menu="receiveReservation" roles={['admin', 'material_prep']} />}>
              <Route path="receive-reservation" element={<ReceiveReservationPage />} />
            </Route>
            <Route element={<ProtectedRoute menu="receiveReturn" roles={['admin', 'material_prep']} />}>
              <Route path="receive-return" element={<ReceiveReturnPage />} />
            </Route>
            <Route element={<ProtectedRoute menu="picklist" roles={['admin', 'material_prep']} />}>
              <Route path="picklist" element={<PicklistPage />} />
            </Route>
            <Route element={<ProtectedRoute menu="rackOverview" />}>
              <Route path="rack" element={<RackOverviewPage />} />
            </Route>
            <Route element={<ProtectedRoute menu="expiryCheck" />}>
              <Route path="expiry" element={<ExpiryCheckPage />} />
            </Route>
            <Route element={<ProtectedRoute menu="stockReports" />}>
              <Route path="reports" element={<ReportsPage />} />
            </Route>
            <Route element={<ProtectedRoute menu="userManagement" roles={['admin']} />}>
              <Route path="users" element={<UsersPage />} />
            </Route>
            <Route element={<ProtectedRoute menu="systemAdmin" roles={['admin']} />}>
              <Route path="admin" element={<SystemAdminPage />} />
              <Route path="admin/iot" element={<IoMonitorPage />} />
              <Route path="admin/health" element={<SystemHealthPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}
