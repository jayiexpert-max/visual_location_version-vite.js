import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Tab,
  Tabs,
  TextField,
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { DataGrid, type GridColDef, type GridPaginationModel } from '@mui/x-data-grid';
import { format, isValid, parseISO } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../components/layout/PageHeader';
import { useExport } from '../../hooks/useExport';
import * as reportsService from '../../services/reportsService';
import { getErrorMessage } from '../../services/apiClient';
import type { PaginatedResult } from '../../types/api';
import {
  type ExpirationReportItem,
  type ExpirationReportParams,
  formatInventoryLocation,
} from '../../types/reports';

type ExpiryTab = 'expired' | 'near';

const DAY_PRESETS = [7, 30, 60] as const;

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = parseISO(value);
  return isValid(d) ? format(d, 'yyyy-MM-dd') : value;
}

function matchesDayFilter(item: ExpirationReportItem, days: number | null): boolean {
  if (days == null) return true;
  if (item.daysLeft == null) return false;
  return item.daysLeft >= 0 && item.daysLeft <= days;
}

function matchesDateRange(
  item: ExpirationReportItem,
  from: string,
  to: string,
): boolean {
  if (!from && !to) return true;
  if (!item.expirationDate) return false;
  const exp = parseISO(item.expirationDate);
  if (!isValid(exp)) return false;
  const expStr = format(exp, 'yyyy-MM-dd');
  if (from && expStr < from) return false;
  if (to && expStr > to) return false;
  return true;
}

export function ExpiryCheckPage() {
  const { t } = useTranslation(['pages', 'common']);
  const { exportExcel, exportPdf } = useExport();

  const [tab, setTab] = useState<ExpiryTab>('expired');
  const [dayPreset, setDayPreset] = useState<number | null>(7);
  const [customRange, setCustomRange] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [rows, setRows] = useState<ExpirationReportItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pagination, setPagination] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 25,
  });

  const apiStatus = tab === 'expired' ? 'expired' : 'all_stock';

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: ExpirationReportParams = {
        status: apiStatus,
        page: pagination.page + 1,
        limit: pagination.pageSize,
      };

      if (tab === 'near' && !customRange && dayPreset) {
        params.days = dayPreset;
      }
      if (customRange) {
        if (fromDate) params.from = fromDate;
        if (toDate) params.to = toDate;
      }

      const result = (await reportsService.getExpirationReport(
        params as Record<string, unknown>,
      )) as PaginatedResult<ExpirationReportItem>;

      let items = result.items ?? [];

      if (tab === 'near') {
        items = items.filter((item) => {
          const notExpired = (item.daysLeft ?? -1) >= 0;
          const dayOk = customRange || matchesDayFilter(item, dayPreset);
          const rangeOk = customRange
            ? matchesDateRange(item, fromDate, toDate)
            : true;
          return notExpired && dayOk && rangeOk;
        });
      }

      setRows(items);
      setTotal(customRange || (tab === 'near' && dayPreset !== 7) ? items.length : result.total);
    } catch (err) {
      setError(getErrorMessage(err, t('common:error')));
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    apiStatus,
    tab,
    customRange,
    dayPreset,
    fromDate,
    toDate,
    pagination.page,
    pagination.pageSize,
    t,
  ]);

  useEffect(() => {
    void fetchReport();
  }, [fetchReport]);

  const columns: GridColDef<ExpirationReportItem>[] = useMemo(
    () => [
      {
        field: 'hanaPart',
        headerName: 'HanaPart',
        flex: 1,
        minWidth: 120,
        valueGetter: (_, row) => row.hanaPart ?? '—',
      },
      {
        field: 'description',
        headerName: t('common:description'),
        flex: 1.5,
        minWidth: 180,
        valueGetter: (_, row) => row.description ?? row.im ?? '—',
      },
      {
        field: 'puid',
        headerName: 'PUID',
        flex: 1,
        minWidth: 140,
        valueGetter: (_, row) => row.puid ?? '—',
      },
      {
        field: 'qtyRemain',
        headerName: t('common:quantity'),
        width: 90,
        type: 'number',
        valueGetter: (_, row) => row.qtyRemain ?? 0,
      },
      {
        field: 'expirationDate',
        headerName: t('common:expiryDate'),
        width: 130,
        valueGetter: (_, row) => formatDate(row.expirationDate),
      },
      {
        field: 'location',
        headerName: t('common:location'),
        flex: 1.2,
        minWidth: 160,
        valueGetter: (_, row) => formatInventoryLocation(row),
      },
    ],
    [t],
  );

  const exportRows = useMemo(
    () =>
      rows.map((row) => ({
        HanaPart: row.hanaPart ?? '',
        Description: row.description ?? row.im ?? '',
        PUID: row.puid ?? '',
        Qty: row.qtyRemain ?? 0,
        ExpirationDate: formatDate(row.expirationDate),
        Location: formatInventoryLocation(row),
      })),
    [rows],
  );

  const handleExportExcel = () => {
    exportExcel(exportRows, `expiry-report-${tab}-${format(new Date(), 'yyyyMMdd')}`);
  };

  const handleExportPdf = () => {
    const title = tab === 'expired' ? t('expired') : t('nearExpiryList');
    exportPdf(
      title,
      ['HanaPart', 'Description', 'PUID', 'Qty', 'ExpirationDate', 'Location'],
      exportRows.map((r) => [
        String(r.HanaPart),
        String(r.Description),
        String(r.PUID),
        Number(r.Qty),
        String(r.ExpirationDate),
        String(r.Location),
      ]),
      `expiry-report-${tab}-${format(new Date(), 'yyyyMMdd')}`,
    );
  };

  const handleTabChange = (_: React.SyntheticEvent, value: ExpiryTab) => {
    setTab(value);
    setPagination((p) => ({ ...p, page: 0 }));
    if (value === 'expired') {
      setCustomRange(false);
      setDayPreset(null);
    } else {
      setDayPreset(7);
    }
  };

  return (
    <>
      <PageHeader
        title={t('expiryTitle')}
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={handleExportExcel}
              disabled={!rows.length}
            >
              {t('common:exportExcel')}
            </Button>
            <Button
              variant="outlined"
              startIcon={<PictureAsPdfIcon />}
              onClick={handleExportPdf}
              disabled={!rows.length}
            >
              {t('common:exportPdf')}
            </Button>
          </Stack>
        }
      />

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Tabs value={tab} onChange={handleTabChange} sx={{ mb: 2 }}>
            <Tab value="expired" label={t('expired')} />
            <Tab value="near" label={t('nearExpiryList')} />
          </Tabs>

          {tab === 'near' && (
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {DAY_PRESETS.map((days) => (
                  <Chip
                    key={days}
                    label={t(days === 7 ? 'days7' : days === 30 ? 'days30' : 'days60')}
                    clickable
                    color={!customRange && dayPreset === days ? 'primary' : 'default'}
                    variant={!customRange && dayPreset === days ? 'filled' : 'outlined'}
                    onClick={() => {
                      setCustomRange(false);
                      setDayPreset(days);
                      setPagination((p) => ({ ...p, page: 0 }));
                    }}
                  />
                ))}
                <Chip
                  label={t('customRange')}
                  clickable
                  color={customRange ? 'primary' : 'default'}
                  variant={customRange ? 'filled' : 'outlined'}
                  onClick={() => {
                    setCustomRange(true);
                    setDayPreset(null);
                    setPagination((p) => ({ ...p, page: 0 }));
                  }}
                />
              </Stack>

              {customRange && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="From"
                    type="date"
                    value={fromDate}
                    onChange={(e) => {
                      setFromDate(e.target.value);
                      setPagination((p) => ({ ...p, page: 0 }));
                    }}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                  <TextField
                    label="To"
                    type="date"
                    value={toDate}
                    onChange={(e) => {
                      setToDate(e.target.value);
                      setPagination((p) => ({ ...p, page: 0 }));
                    }}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                </Stack>
              )}
            </Stack>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card variant="outlined">
        <Box sx={{ height: 560, width: '100%', position: 'relative' }}>
          {loading && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'rgba(255,255,255,0.6)',
                zIndex: 1,
              }}
            >
              <CircularProgress />
            </Box>
          )}
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={(row) => row.id}
            rowCount={total}
            paginationMode="server"
            paginationModel={pagination}
            onPaginationModelChange={setPagination}
            pageSizeOptions={[25, 50, 100]}
            disableRowSelectionOnClick
            sx={{
              border: 0,
              '& .MuiDataGrid-row': { minHeight: 56 },
            }}
            localeText={{
              noRowsLabel: t('common:noData'),
            }}
          />
        </Box>
      </Card>
    </>
  );
}
