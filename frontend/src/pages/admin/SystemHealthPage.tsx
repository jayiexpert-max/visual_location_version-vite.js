import CircleIcon from '@mui/icons-material/Circle';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid2 as Grid,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../components/layout/PageHeader';
import { getErrorMessage } from '../../services/apiClient';
import * as healthService from '../../services/healthService';
import type { HealthSnapshot } from '../../services/healthService';

function StatusChip({ ok }: { ok: boolean | null }) {
  if (ok === null) {
    return <Chip size="small" label="Unknown" />;
  }
  return (
    <Chip
      size="small"
      label={ok ? 'OK' : 'Degraded'}
      color={ok ? 'success' : 'error'}
      icon={
        <CircleIcon sx={{ fontSize: '10px !important', color: ok ? 'success.main' : 'error.main' }} />
      }
    />
  );
}

function HealthCard({
  title,
  ok,
  loading,
  children,
}: {
  title: string;
  ok: boolean | null;
  loading?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {title}
          </Typography>
          <StatusChip ok={ok} />
        </Stack>
        {loading ? <CircularProgress size={24} /> : children}
      </CardContent>
    </Card>
  );
}

function isComponentOk(value: unknown): boolean | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (typeof record.connected === 'boolean') return record.connected;
  if (typeof record.status === 'string') return record.status === 'ok';
  return null;
}

export function SystemHealthPage() {
  const { t } = useTranslation(['pages', 'common']);
  const [snapshot, setSnapshot] = useState<HealthSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await healthService.getHealthDashboard();
      setSnapshot(data);
    } catch (err) {
      setError(getErrorMessage(err, t('common:error')));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const system = snapshot?.system;

  return (
    <Box>
      <PageHeader
        title="System Health"
        action={
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={() => void load()}
            disabled={loading}
          >
            {t('common:refresh')}
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading && !snapshot && <LinearProgress sx={{ mb: 2 }} />}

      {snapshot && (
        <>
          <Alert
            severity={snapshot.status === 'ok' ? 'success' : 'warning'}
            sx={{ mb: 3 }}
          >
            Overall status: <strong>{snapshot.status}</strong> — updated{' '}
            {new Date(snapshot.timestamp).toLocaleString()}
          </Alert>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <HealthCard title="Database" ok={isComponentOk(snapshot.database)} loading={loading}>
                <Typography variant="body2" color="text.secondary">
                  Latency: {snapshot.database?.latencyMs ?? '—'} ms
                </Typography>
              </HealthCard>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <HealthCard title="NestJS API" ok={snapshot.nestjs?.status === 'ok'} loading={loading}>
                <Typography variant="body2" color="text.secondary">
                  Uptime: {snapshot.nestjs?.uptimeSec ?? '—'} s
                </Typography>
              </HealthCard>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <HealthCard title="MQTT Broker" ok={isComponentOk(snapshot.mqtt)} loading={loading}>
                <Typography variant="body2" color="text.secondary">
                  {snapshot.mqtt?.connected ? 'Connected' : 'Disconnected'}
                </Typography>
              </HealthCard>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <HealthCard title="Raspberry Pi" ok={isComponentOk(snapshot.raspi)} loading={loading}>
                <Typography variant="body2" color="text.secondary">
                  Online: {snapshot.raspi?.onlineDevices ?? 0} / {snapshot.raspi?.totalDevices ?? 0}
                </Typography>
              </HealthCard>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <HealthCard title="Ethernet IO" ok={isComponentOk(snapshot.io)} loading={loading}>
                <Typography variant="body2" color="text.secondary">
                  Devices: {snapshot.io?.deviceCount ?? '—'}
                </Typography>
              </HealthCard>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <HealthCard title="Socket.IO" ok={isComponentOk(snapshot.socketio)} loading={loading}>
                <Typography variant="body2" color="text.secondary">
                  Connections: {snapshot.socketio?.activeConnections ?? 0}
                </Typography>
              </HealthCard>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <HealthCard title="CPK Service" ok={isComponentOk(snapshot.cpk)} loading={loading}>
                <Typography variant="body2" color="text.secondary">
                  Latency: {snapshot.cpk?.latencyMs ?? '—'} ms
                </Typography>
              </HealthCard>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <HealthCard title="PD Service" ok={isComponentOk(snapshot.pdservice)} loading={loading}>
                <Typography variant="body2" color="text.secondary">
                  Latency: {snapshot.pdservice?.latencyMs ?? '—'} ms
                </Typography>
              </HealthCard>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <HealthCard
                title="Host Resources"
                ok={
                  system?.memory?.usedPercent != null
                    ? system.memory.usedPercent < 90
                    : null
                }
                loading={loading}
              >
                <Typography variant="body2" color="text.secondary">
                  Memory: {system?.memory?.usedPercent ?? '—'}% used
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  CPU load (1m): {system?.cpu?.loadAverage1m?.toFixed(2) ?? '—'} /{' '}
                  {system?.cpu?.cores ?? '—'} cores
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Host uptime: {system?.uptimeSec ?? '—'} s
                </Typography>
              </HealthCard>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}
