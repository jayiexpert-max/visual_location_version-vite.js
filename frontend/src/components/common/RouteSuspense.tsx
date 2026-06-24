import { CircularProgress } from '@mui/material';
import { Suspense, type ReactNode } from 'react';

interface RouteSuspenseProps {
  children: ReactNode;
  variant?: 'factory' | 'handheld' | 'minimal';
}

function RouteFallback({ variant }: { variant: RouteSuspenseProps['variant'] }) {
  if (variant === 'handheld') {
    return (
      <div className="hh-page-loader" role="status" aria-live="polite">
        <CircularProgress size={32} sx={{ color: '#60a5fa' }} />
        <span>Loading…</span>
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
        <CircularProgress size={28} />
      </div>
    );
  }

  return (
    <div className="fx-route-loader" role="status" aria-live="polite">
      <CircularProgress />
    </div>
  );
}

export function RouteSuspense({ children, variant = 'factory' }: RouteSuspenseProps) {
  return <Suspense fallback={<RouteFallback variant={variant} />}>{children}</Suspense>;
}
