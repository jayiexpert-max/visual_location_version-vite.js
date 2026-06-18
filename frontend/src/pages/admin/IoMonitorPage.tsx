import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useSocketEvent } from '../../hooks/useSocket';
import { getErrorMessage } from '../../services/apiClient';
import * as iotMonitor from '../../services/iotMonitorService';
import { SocketEvents } from '../../services/socketService';
import { useAuthStore } from '../../store/authStore';
import type { MqttLogEntry, RaspberryDevice } from '../../services/iotMonitorService';

type MonitorTab = 'mqtt' | 'raspi' | 'health' | 'events';

export function IoMonitorPage() {
  const { t } = useTranslation(['pages', 'common']);
  const { user } = useAuth();
  const accessToken = useAuthStore((s) => s.accessToken);
  const canAccessIoMonitor = user?.role === 'manage';
  const socketAuth = useMemo(
    () => (accessToken ? { token: accessToken } : undefined),
    [accessToken],
  );
  const [tab, setTab] = useState<MonitorTab>('mqtt');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mqttLogs, setMqttLogs] = useState<MqttLogEntry[]>([]);
  const [devices, setDevices] = useState<RaspberryDevice[]>([]);
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [events, setEvents] = useState<Array<{ event: string; timestamp: string }>>([]);

  if (!canAccessIoMonitor) {
    return <Navigate to="/app" replace />;
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [logs, raspi, monitorHealth, realtimeEvents] = await Promise.all([
        iotMonitor.getMqttLogs(100),
        iotMonitor.getRaspberryDevices(),
        iotMonitor.getMonitorHealth(),
        iotMonitor.getRealtimeEvents(50),
      ]);
      setMqttLogs(logs);
      setDevices(raspi);
      setHealth(monitorHealth as Record<string, unknown>);
      setEvents(
        (realtimeEvents as Array<{ event: string; timestamp: string }>) ?? [],
      );
    } catch (err) {
      setError(getErrorMessage(err, t('pages:ioMonitorLoadError'), t));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useSocketEvent(SocketEvents.ioStatus, () => {
    void load();
  }, true, socketAuth);

  useSocketEvent(SocketEvents.deviceOnline, () => {
    void load();
  }, true, socketAuth);

  useSocketEvent(SocketEvents.deviceOffline, () => {
    void load();
  }, true, socketAuth);

  const mqttColumns = useMemo<GridColDef[]>(
    () => [
      { field: 'createdAt', headerName: t('pages:ioMonitorColTime'), flex: 1, minWidth: 160 },
      { field: 'direction', headerName: t('pages:ioMonitorColDir'), width: 100 },
      { field: 'topic', headerName: t('pages:ioMonitorColTopic'), flex: 1.2, minWidth: 200 },
      { field: 'deviceId', headerName: t('pages:ioMonitorColDevice'), width: 90 },
      { field: 'status', headerName: t('pages:ioMonitorColStatus'), width: 110 },
    ],
    [t],
  );

  const raspiColumns = useMemo<GridColDef[]>(
    () => [
      { field: 'deviceId', headerName: t('pages:ioMonitorColDeviceId'), width: 100 },
      { field: 'name', headerName: 'Name', flex: 1, minWidth: 150 },
      { field: 'ipAddress', headerName: t('pages:ioMonitorColIp'), flex: 1, minWidth: 140 },
      { field: 'port', headerName: 'Port', width: 90 },
      { field: 'status', headerName: t('pages:ioMonitorColStatus'), width: 110 },
      { field: 'outputCount', headerName: t('pages:ioMonitorColOutputs'), width: 100 },
      { field: 'message', headerName: 'Gateway', flex: 1, minWidth: 180 },
      { field: 'lastHeartbeatAt', headerName: t('pages:ioMonitorColLastHeartbeat'), flex: 1, minWidth: 180 },
    ],
    [t],
  );

  const eventColumns = useMemo<GridColDef[]>(
    () => [
      { field: 'timestamp', headerName: t('pages:ioMonitorColTime'), flex: 1, minWidth: 180 },
      { field: 'event', headerName: t('pages:ioMonitorColEvent'), flex: 1, minWidth: 180 },
    ],
    [t],
  );

  return (
    <Box>
      <PageHeader
        title={t('pages:ioMonitorTitle')}
        action={
          <Button startIcon={<RefreshIcon />} onClick={() => void load()} disabled={loading}>
            {t('common:refresh')}
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Tabs value={tab} onChange={(_, value: MonitorTab) => setTab(value)} sx={{ mb: 2 }}>
        <Tab value="mqtt" label={t('pages:ioMonitorTabMqttFull')} />
        <Tab value="raspi" label={t('pages:ioMonitorTabRaspiFull')} />
        <Tab value="health" label={t('pages:ioMonitorTabHealthFull')} />
        <Tab value="events" label={t('pages:ioMonitorTabEvents')} />
      </Tabs>

      {tab === 'mqtt' && (
        <Card>
          <CardContent>
            <DataGrid
              autoHeight
              rows={mqttLogs}
              columns={mqttColumns}
              getRowId={(row) => row.id}
              loading={loading}
              pageSizeOptions={[25, 50, 100]}
              initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
            />
          </CardContent>
        </Card>
      )}

      {tab === 'raspi' && (
        <Card>
          <CardContent>
            <DataGrid
              autoHeight
              rows={devices}
              columns={raspiColumns}
              getRowId={(row) => row.id}
              loading={loading}
              pageSizeOptions={[10, 25]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            />
          </CardContent>
        </Card>
      )}

      {tab === 'health' && (
        <Stack spacing={2}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('pages:ioMonitorCombinedHealth')}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  label={`MQTT: ${(health?.mqtt as { connected?: boolean })?.connected ? t('pages:healthConnected') : t('pages:healthDisconnected')}`}
                  color={(health?.mqtt as { connected?: boolean })?.connected ? 'success' : 'error'}
                />
                <Chip
                  label={`${t('pages:healthRaspi')} ${t('pages:healthOnlineCount')}: ${(health?.raspiGateways as RaspberryDevice[] | undefined)?.filter((d) => d.status === 'online').length ?? 0}`}
                  color="primary"
                />
                <Chip
                  label={`${t('pages:healthEthernetIo')}: ${(health?.io as { registeredDevices?: number })?.registeredDevices ?? 0}`}
                />
              </Stack>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography component="pre" variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(health, null, 2)}
              </Typography>
            </CardContent>
          </Card>
        </Stack>
      )}

      {tab === 'events' && (
        <Card>
          <CardContent>
            <DataGrid
              autoHeight
              rows={events.map((event, index) => ({ id: index, ...event }))}
              columns={eventColumns}
              loading={loading}
              pageSizeOptions={[25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
            />
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
