import CircleIcon from '@mui/icons-material/Circle';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Grid2 as Grid,
  Stack,
  Typography,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import * as healthService from '../../services/healthService';
import * as reportsService from '../../services/reportsService';
import { getSocket } from '../../services/socketService';
import * as warehouseService from '../../services/warehouseService';
import { MENU_ITEMS } from '../../routes/menuConfig';
import type { WarehouseHierarchy } from '../../types/warehouse';

interface StockMovementRow {
  id: number;
  productName: string | null;
  action: string;
  actionType: string;
  quantity: number;
  username: string | null;
  createdAt: string;
}

function countUniqueMaterials(hierarchy: WarehouseHierarchy): number {
  const names = new Set<string>();
  for (const rack of hierarchy.racks) {
    for (const level of rack.levels) {
      for (const box of level.boxes) {
        for (const slot of box.slots) {
          if (slot.product?.name) {
            names.add(slot.product.name);
          }
        }
      }
    }
  }
  return names.size;
}

function countOccupiedSlots(hierarchy: WarehouseHierarchy): number {
  let count = 0;
  for (const rack of hierarchy.racks) {
    for (const level of rack.levels) {
      for (const box of level.boxes) {
        for (const slot of box.slots) {
          if (slot.product) count += 1;
        }
      }
    }
  }
  return count;
}

function countNearExpiry(items: Array<{ daysLeft: number }>, days: number): number {
  return items.filter((item) => item.daysLeft >= 0 && item.daysLeft <= days).length;
}

function StatCard({
  title,
  value,
  loading,
  footer,
}: {
  title: string;
  value: string | number;
  loading?: boolean;
  footer?: React.ReactNode;
}) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {title}
        </Typography>
        {loading ? (
          <CircularProgress size={28} sx={{ my: 1 }} />
        ) : (
          <Typography variant="h4" fontWeight={700}>
            {value}
          </Typography>
        )}
        {footer}
      </CardContent>
    </Card>
  );
}

function StatusCard({
  title,
  online,
  loading,
}: {
  title: string;
  online: boolean | null;
  loading?: boolean;
}) {
  const { t } = useTranslation('common');

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {title}
        </Typography>
        {loading ? (
          <CircularProgress size={28} sx={{ my: 1 }} />
        ) : (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
            <CircleIcon
              sx={{
                fontSize: 14,
                color: online === null ? 'text.disabled' : online ? 'success.main' : 'error.main',
              }}
            />
            <Typography variant="h6" fontWeight={600}>
              {online === null ? t('unknown') : online ? t('online') : t('offline')}
            </Typography>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { t } = useTranslation(['pages', 'menu', 'common']);
  const { canAccess } = useAuth();
  const [mqttConnected, setMqttConnected] = useState<boolean | null>(null);

  const updateSocketStatus = useCallback(() => {
    const socket = getSocket();
    setMqttConnected(socket.connected);
  }, []);

  useEffect(() => {
    const socket = getSocket();
    updateSocketStatus();
    socket.on('connect', updateSocketStatus);
    socket.on('disconnect', updateSocketStatus);
    return () => {
      socket.off('connect', updateSocketStatus);
      socket.off('disconnect', updateSocketStatus);
    };
  }, [updateSocketStatus]);

  const hierarchyQuery = useQuery({
    queryKey: ['dashboard', 'hierarchy'],
    queryFn: () => warehouseService.getHierarchy(),
  });

  const nearExpiryQuery = useQuery({
    queryKey: ['dashboard', 'near-expiry', 30],
    queryFn: async () => {
      const result = await reportsService.getExpirationReport({
        status: 'all_stock',
        limit: 500,
        page: 1,
      });
      return countNearExpiry(
        result.items as Array<{ daysLeft: number }>,
        30,
      );
    },
  });

  const raspberryQuery = useQuery({
    queryKey: ['dashboard', 'raspberry-health'],
    queryFn: healthService.getPdserviceHealth,
    refetchInterval: 60_000,
  });

  const movementsQuery = useQuery({
    queryKey: ['dashboard', 'stock-movements'],
    queryFn: async () => {
      const result = await reportsService.getStockMovements({ limit: 10, page: 1 });
      return result.items as StockMovementRow[];
    },
  });

  const menuItems = useMemo(
    () => MENU_ITEMS.filter((item) => canAccess(item.key) && item.key !== 'dashboard'),
    [canAccess],
  );

  const movementColumns = useMemo<GridColDef<StockMovementRow>[]>(
    () => [
      {
        field: 'createdAt',
        headerName: 'Date',
        flex: 1,
        minWidth: 150,
        valueFormatter: (value) =>
          value ? format(new Date(String(value)), 'yyyy-MM-dd HH:mm') : '—',
      },
      {
        field: 'productName',
        headerName: t('common:partName'),
        flex: 1.2,
        minWidth: 160,
      },
      {
        field: 'actionType',
        headerName: t('common:actions'),
        flex: 0.8,
        minWidth: 120,
      },
      {
        field: 'quantity',
        headerName: t('common:quantity'),
        flex: 0.6,
        minWidth: 100,
        type: 'number',
      },
      {
        field: 'username',
        headerName: t('common:username'),
        flex: 0.8,
        minWidth: 120,
      },
    ],
    [t],
  );

  const hierarchy = hierarchyQuery.data;

  return (
    <Box>
      <PageHeader title={t('pages:dashboardTitle')} />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <StatCard
            title={t('pages:totalMaterials')}
            value={hierarchy ? countUniqueMaterials(hierarchy) : 0}
            loading={hierarchyQuery.isLoading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <StatCard
            title={t('pages:totalLocations')}
            value={hierarchy ? countOccupiedSlots(hierarchy) : 0}
            loading={hierarchyQuery.isLoading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <StatCard
            title={t('pages:nearExpiry')}
            value={nearExpiryQuery.data ?? 0}
            loading={nearExpiryQuery.isLoading}
            footer={
              <Chip
                size="small"
                label="30 days"
                sx={{ mt: 1 }}
                color="warning"
                variant="outlined"
              />
            }
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <StatusCard
            title={t('pages:raspberryStatus')}
            online={raspberryQuery.data ? raspberryQuery.data.status === 'ok' : null}
            loading={raspberryQuery.isLoading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <StatusCard
            title={t('pages:mqttStatus')}
            online={mqttConnected}
            loading={mqttConnected === null}
          />
        </Grid>
      </Grid>

      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
        {t('menu:dashboard')}
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Grid key={item.key} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <Card sx={{ height: '100%' }}>
                <CardActionArea
                  component={RouterLink}
                  to={item.path}
                  target={item.external ? '_blank' : undefined}
                  rel={item.external ? 'noopener noreferrer' : undefined}
                  sx={{ height: '100%', p: 2 }}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon />
                    </Box>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {t(`menu:${item.key}`)}
                    </Typography>
                  </Stack>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
        {t('pages:recentTransactions')}
      </Typography>
      <Card>
        <Box sx={{ height: 420, width: '100%' }}>
          <DataGrid
            rows={movementsQuery.data ?? []}
            columns={movementColumns}
            loading={movementsQuery.isLoading}
            disableRowSelectionOnClick
            pageSizeOptions={[10]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            localeText={{ noRowsLabel: t('common:noData') }}
          />
        </Box>
      </Card>
    </Box>
  );
}
