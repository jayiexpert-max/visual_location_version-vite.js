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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../components/layout/PageHeader';
import { getErrorMessage } from '../../services/apiClient';
import * as healthService from '../../services/healthService';
import type { CpkEndpointHealthResult, HealthSnapshot } from '../../services/healthService';

function StatusChip({ ok, t }: { ok: boolean | null; t: (key: string) => string }) {
  if (ok === null) {
    return <Chip size="small" label={t('common:unknown')} />;
  }
  return (
    <Chip
      size="small"
      label={ok ? t('pages:healthOk') : t('pages:healthDegraded')}
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
  t,
}: {
  title: string;
  ok: boolean | null;
  loading?: boolean;
  children?: React.ReactNode;
  t: (key: string) => string;
}) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {title}
          </Typography>
          <StatusChip ok={ok} t={t} />
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
  const [cpkEndpoints, setCpkEndpoints] = useState<CpkEndpointHealthResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [endpointLoading, setEndpointLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [endpointError, setEndpointError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await healthService.getHealthDashboard();
      setSnapshot(data);
    } catch (err) {
      setError(getErrorMessage(err, t('common:error'), t));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const loadCpkEndpoints = useCallback(async () => {
    setEndpointLoading(true);
    setEndpointError(null);
    try {
      const data = await healthService.getCpkEndpointHealth();
      setCpkEndpoints(data);
    } catch (err) {
      setEndpointError(getErrorMessage(err, t('common:error'), t));
    } finally {
      setEndpointLoading(false);
    }
  }, [t]);

  const system = snapshot?.system;

  return (
    <Box>
      <PageHeader
        title={t('pages:systemHealthTitle')}
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
            {t('pages:healthOverall')}: <strong>{snapshot.status}</strong> — {t('pages:healthUpdated')}{' '}
            {new Date(snapshot.timestamp).toLocaleString()}
          </Alert>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <HealthCard title={t('pages:healthDatabase')} ok={isComponentOk(snapshot.database)} loading={loading} t={t}>
                <Typography variant="body2" color="text.secondary">
                  {t('pages:healthLatency')}: {snapshot.database?.latencyMs ?? '—'} ms
                </Typography>
              </HealthCard>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <HealthCard title={t('pages:healthNestApi')} ok={snapshot.nestjs?.status === 'ok'} loading={loading} t={t}>
                <Typography variant="body2" color="text.secondary">
                  {t('pages:healthUptime')}: {snapshot.nestjs?.uptimeSec ?? '—'} s
                </Typography>
              </HealthCard>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <HealthCard title={t('pages:healthMqtt')} ok={isComponentOk(snapshot.mqtt)} loading={loading} t={t}>
                <Typography variant="body2" color="text.secondary">
                  {snapshot.mqtt?.connected ? t('pages:healthConnected') : t('pages:healthDisconnected')}
                </Typography>
              </HealthCard>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <HealthCard title={t('pages:healthRaspi')} ok={isComponentOk(snapshot.raspi)} loading={loading} t={t}>
                <Typography variant="body2" color="text.secondary">
                  {t('pages:healthOnlineCount')}: {snapshot.raspi?.onlineDevices ?? 0} / {snapshot.raspi?.totalDevices ?? 0}
                </Typography>
              </HealthCard>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <HealthCard title={t('pages:healthEthernetIo')} ok={isComponentOk(snapshot.io)} loading={loading} t={t}>
                <Typography variant="body2" color="text.secondary">
                  {t('pages:healthDevices')}: {snapshot.io?.deviceCount ?? '—'}
                </Typography>
              </HealthCard>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <HealthCard title={t('pages:healthSocketIo')} ok={isComponentOk(snapshot.socketio)} loading={loading} t={t}>
                <Typography variant="body2" color="text.secondary">
                  {t('pages:healthConnections')}: {snapshot.socketio?.activeConnections ?? 0}
                </Typography>
              </HealthCard>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <HealthCard title={t('pages:healthCpk')} ok={isComponentOk(snapshot.cpk)} loading={loading} t={t}>
                <Typography variant="body2" color="text.secondary">
                  {t('pages:healthLatency')}: {snapshot.cpk?.latencyMs ?? '—'} ms
                </Typography>
              </HealthCard>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <HealthCard title={t('pages:healthPdService')} ok={isComponentOk(snapshot.pdservice)} loading={loading} t={t}>
                <Typography variant="body2" color="text.secondary">
                  {t('pages:healthLatency')}: {snapshot.pdservice?.latencyMs ?? '—'} ms
                </Typography>
              </HealthCard>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <HealthCard
                title={t('pages:healthHostResources')}
                ok={
                  system?.memory?.usedPercent != null
                    ? system.memory.usedPercent < 90
                    : null
                }
                loading={loading}
                t={t}
              >
                <Typography variant="body2" color="text.secondary">
                  {t('pages:healthMemoryUsed')}: {t('pages:healthMemoryPct', { pct: system?.memory?.usedPercent ?? '—' })}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('pages:healthCpuLoad')}: {system?.cpu?.loadAverage1m?.toFixed(2) ?? '—'} /{' '}
                  {system?.cpu?.cores ?? '—'} {t('pages:healthCores')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('pages:healthHostUptime')}: {system?.uptimeSec ?? '—'} s
                </Typography>
              </HealthCard>
            </Grid>
          </Grid>

          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                spacing={1.5}
                sx={{ mb: 2 }}
              >
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {t('pages:cpkEndpointLatencyTitle')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {cpkEndpoints
                      ? `${t('pages:healthUpdated')} ${new Date(cpkEndpoints.timestamp).toLocaleString()}`
                      : t('pages:cpkEndpointLatencyHint')}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  startIcon={endpointLoading ? <CircularProgress size={16} /> : <RefreshIcon />}
                  onClick={() => void loadCpkEndpoints()}
                  disabled={endpointLoading}
                >
                  {t('pages:cpkEndpointCheck')}
                </Button>
              </Stack>

              {endpointError && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setEndpointError(null)}>
                  {endpointError}
                </Alert>
              )}

              {endpointLoading && !cpkEndpoints && <LinearProgress sx={{ mb: 2 }} />}

              {cpkEndpoints && (
                <TableContainer sx={{ overflowX: 'auto' }}>
                  <Table size="small" aria-label={t('pages:cpkEndpointLatencyTitle')}>
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('pages:cpkEndpointColumnEndpoint')}</TableCell>
                        <TableCell>{t('pages:cpkEndpointColumnMethod')}</TableCell>
                        <TableCell>{t('pages:healthLatency')}</TableCell>
                        <TableCell>{t('pages:cpkEndpointColumnHttp')}</TableCell>
                        <TableCell>{t('pages:cpkEndpointColumnCpk')}</TableCell>
                        <TableCell>{t('pages:cpkEndpointColumnStatus')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {cpkEndpoints.endpoints.map((endpoint) => (
                        <TableRow key={`${endpoint.method}-${endpoint.name}`} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {endpoint.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ wordBreak: 'break-all' }}
                            >
                              {endpoint.url}
                            </Typography>
                          </TableCell>
                          <TableCell>{endpoint.method}</TableCell>
                          <TableCell>{endpoint.latencyMs} ms</TableCell>
                          <TableCell>{endpoint.httpCode || '—'}</TableCell>
                          <TableCell>{endpoint.cpkStatus ?? '—'}</TableCell>
                          <TableCell>
                            <Stack spacing={0.5} alignItems="flex-start">
                              <Chip
                                size="small"
                                label={
                                  endpoint.status === 'reachable'
                                    ? t('pages:cpkEndpointReachable')
                                    : t('pages:cpkEndpointError')
                                }
                                color={endpoint.status === 'reachable' ? 'success' : 'error'}
                              />
                              {endpoint.message && (
                                <Typography variant="caption" color="text.secondary">
                                  {endpoint.message}
                                </Typography>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
}
