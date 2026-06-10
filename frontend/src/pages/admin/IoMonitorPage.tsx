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
import { Navigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useSocketEvent } from '../../hooks/useSocket';
import { getErrorMessage } from '../../services/apiClient';
import * as iotMonitor from '../../services/iotMonitorService';
import { SocketEvents } from '../../services/socketService';
import type { MqttLogEntry, RaspberryDevice } from '../../services/iotMonitorService';

type MonitorTab = 'mqtt' | 'raspi' | 'health' | 'events';

export function IoMonitorPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<MonitorTab>('mqtt');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mqttLogs, setMqttLogs] = useState<MqttLogEntry[]>([]);
  const [devices, setDevices] = useState<RaspberryDevice[]>([]);
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [events, setEvents] = useState<Array<{ event: string; timestamp: string }>>([]);

  if (user?.role !== 'admin') {
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
      setError(getErrorMessage(err, 'Failed to load IoT monitor data'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useSocketEvent(SocketEvents.ioStatus, () => {
    void load();
  }, true);

  useSocketEvent(SocketEvents.deviceOnline, () => {
    void load();
  }, true);

  useSocketEvent(SocketEvents.deviceOffline, () => {
    void load();
  }, true);

  const mqttColumns = useMemo<GridColDef[]>(
    () => [
      { field: 'createdAt', headerName: 'Time', flex: 1, minWidth: 160 },
      { field: 'direction', headerName: 'Dir', width: 100 },
      { field: 'topic', headerName: 'Topic', flex: 1.2, minWidth: 200 },
      { field: 'deviceId', headerName: 'Device', width: 90 },
      { field: 'status', headerName: 'Status', width: 110 },
    ],
    [],
  );

  const raspiColumns = useMemo<GridColDef[]>(
    () => [
      { field: 'deviceId', headerName: 'Device ID', width: 100 },
      { field: 'ipAddress', headerName: 'IP', flex: 1, minWidth: 140 },
      { field: 'status', headerName: 'Status', width: 110 },
      { field: 'outputCount', headerName: 'Outputs', width: 100 },
      { field: 'lastHeartbeatAt', headerName: 'Last Heartbeat', flex: 1, minWidth: 180 },
    ],
    [],
  );

  const eventColumns = useMemo<GridColDef[]>(
    () => [
      { field: 'timestamp', headerName: 'Time', flex: 1, minWidth: 180 },
      { field: 'event', headerName: 'Event', flex: 1, minWidth: 180 },
    ],
    [],
  );

  return (
    <Box>
      <PageHeader
        title="IoT Monitor"
        action={
          <Button startIcon={<RefreshIcon />} onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Tabs value={tab} onChange={(_, value: MonitorTab) => setTab(value)} sx={{ mb: 2 }}>
        <Tab value="mqtt" label="MQTT Monitor" />
        <Tab value="raspi" label="Raspberry Devices" />
        <Tab value="health" label="Device Health" />
        <Tab value="events" label="Realtime Events" />
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
                Combined Health
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  label={`MQTT: ${(health?.mqtt as { connected?: boolean })?.connected ? 'connected' : 'disconnected'}`}
                  color={(health?.mqtt as { connected?: boolean })?.connected ? 'success' : 'error'}
                />
                <Chip
                  label={`Raspi online: ${(health?.raspi as { onlineDevices?: number })?.onlineDevices ?? 0}`}
                  color="primary"
                />
                <Chip
                  label={`IO devices: ${(health?.io as { registeredDevices?: number })?.registeredDevices ?? 0}`}
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
