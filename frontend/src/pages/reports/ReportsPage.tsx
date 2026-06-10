import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SearchIcon from '@mui/icons-material/Search';
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
} from '@mui/material';
import { DataGrid, type GridColDef, type GridPaginationModel } from '@mui/x-data-grid';
import { format } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../components/layout/PageHeader';
import { useExport } from '../../hooks/useExport';
import * as reportsService from '../../services/reportsService';
import * as warehouseService from '../../services/warehouseService';
import { getErrorMessage } from '../../services/apiClient';
import type { PaginatedResult } from '../../types/api';
import type { WarehouseHierarchy } from '../../types/warehouse';

type ReportTab = 'currentStock' | 'stockMovement' | 'receiveHistory' | 'pickHistory' | 'expiryReport';

interface FlatStockRow {
  id: string;
  rackName: string;
  levelNo: number;
  boxCode: string;
  slotNo: number;
  productName: string;
  qty: number;
}

interface StockMovementRow {
  id: number;
  productId: number;
  productName: string | null;
  action: string;
  actionType: string;
  quantity: number;
  userId: number;
  username: string | null;
  createdAt: string;
}

interface ReceiveRow {
  id: number;
  receiveDate: string | null;
  puid: string | null;
  im: string | null;
  hanaPart: string | null;
  description: string | null;
  qty: number | null;
  qtyRemain: number | null;
  expirationDate: string | null;
  locShelf: string | null;
  locLevel: string | null;
  locBox: string | null;
}

interface ExpiryRow {
  id: number;
  hanaPart: string | null;
  im: string | null;
  puid: string | null;
  qtyRemain: number | null;
  expirationDate: string | null;
  locShelf: string | null;
  locLevel: string | null;
  locBox: string | null;
  statusText: string;
  daysLeft: number;
}

const PAGE_SIZE = 20;

function flattenHierarchy(hierarchy: WarehouseHierarchy): FlatStockRow[] {
  const rows: FlatStockRow[] = [];

  for (const rack of hierarchy.racks) {
    for (const level of rack.levels) {
      for (const box of level.boxes) {
        for (const slot of box.slots) {
          if (!slot.product) continue;
          rows.push({
            id: `${rack.id}-${level.id}-${box.id}-${slot.id}`,
            rackName: rack.name,
            levelNo: level.levelNo,
            boxCode: box.boxCode,
            slotNo: slot.slotNo,
            productName: slot.product.name,
            qty: slot.product.qty,
          });
        }
      }
    }
  }

  return rows;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return format(new Date(value), 'yyyy-MM-dd HH:mm');
  } catch {
    return value;
  }
}

function formatDateOnly(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return format(new Date(value), 'yyyy-MM-dd');
  } catch {
    return value;
  }
}

function locationLabel(row: { locShelf?: string | null; locLevel?: string | null; locBox?: string | null }): string {
  return [row.locShelf, row.locLevel, row.locBox].filter(Boolean).join(' / ') || '—';
}

export function ReportsPage() {
  const { t } = useTranslation(['pages', 'common']);
  const { exportExcel, exportPdf, exportCsv } = useExport();

  const [tab, setTab] = useState<ReportTab>('currentStock');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: PAGE_SIZE,
  });
  const [rowCount, setRowCount] = useState(0);

  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<'all' | 'add' | 'withdraw'>('all');
  const [expiryStatus, setExpiryStatus] = useState<'all' | 'expired' | 'soon' | 'normal' | 'all_stock'>('all');

  const [receivePuid, setReceivePuid] = useState('');
  const [receiveIm, setReceiveIm] = useState('');
  const [receiveHanaPart, setReceiveHanaPart] = useState('');
  const [receiveDateCode, setReceiveDateCode] = useState('');
  const [receiveExpDate, setReceiveExpDate] = useState('');

  const [currentStockRows, setCurrentStockRows] = useState<FlatStockRow[]>([]);
  const [gridRows, setGridRows] = useState<Record<string, unknown>[]>([]);

  const filteredCurrentStock = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return currentStockRows;
    return currentStockRows.filter(
      (row) =>
        row.rackName.toLowerCase().includes(term) ||
        row.boxCode.toLowerCase().includes(term) ||
        row.productName.toLowerCase().includes(term) ||
        String(row.levelNo).includes(term) ||
        String(row.slotNo).includes(term),
    );
  }, [currentStockRows, search]);

  const paginatedCurrentStock = useMemo(() => {
    const start = paginationModel.page * paginationModel.pageSize;
    return filteredCurrentStock.slice(start, start + paginationModel.pageSize);
  }, [filteredCurrentStock, paginationModel]);

  const loadCurrentStock = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const hierarchy = await warehouseService.getHierarchy();
      setCurrentStockRows(flattenHierarchy(hierarchy));
      setRowCount(0);
      setGridRows([]);
    } catch (err) {
      setError(getErrorMessage(err, t('common:error')));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadPaginatedReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = paginationModel.page + 1;
      const limit = paginationModel.pageSize;
      let result: PaginatedResult<unknown>;

      if (tab === 'stockMovement') {
        result = await reportsService.getStockMovements({
          page,
          limit,
          search: search.trim() || undefined,
          actionFilter: actionFilter === 'all' ? undefined : actionFilter,
        });
        setGridRows((result.items as StockMovementRow[]).map((row) => ({ ...row, id: row.id })));
      } else if (tab === 'pickHistory') {
        result = await reportsService.getStockMovements({
          page,
          limit,
          search: search.trim() || undefined,
          action_type: 'pick',
        });
        const items = (result.items as StockMovementRow[]).filter(
          (row) => row.actionType === 'pick' || row.action.startsWith('pick'),
        );
        setGridRows(items.map((row) => ({ ...row, id: row.id })));
      } else if (tab === 'receiveHistory') {
        result = await reportsService.getInventoryReceiveReport({
          page,
          limit,
          puid: receivePuid.trim() || undefined,
          im: receiveIm.trim() || undefined,
          hanaPart: receiveHanaPart.trim() || undefined,
          dateCode: receiveDateCode.trim() || undefined,
          expDate: receiveExpDate || undefined,
        });
        setGridRows((result.items as ReceiveRow[]).map((row) => ({ ...row, id: row.id })));
      } else {
        result = await reportsService.getExpirationReport({
          page,
          limit,
          search: search.trim() || undefined,
          status: expiryStatus,
        });
        setGridRows((result.items as ExpiryRow[]).map((row) => ({ ...row, id: row.id })));
      }

      setRowCount(result.total);
    } catch (err) {
      setError(getErrorMessage(err, t('common:error')));
      setGridRows([]);
      setRowCount(0);
    } finally {
      setLoading(false);
    }
  }, [
    tab,
    paginationModel,
    search,
    actionFilter,
    expiryStatus,
    receivePuid,
    receiveIm,
    receiveHanaPart,
    receiveDateCode,
    receiveExpDate,
    t,
  ]);

  useEffect(() => {
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  }, [tab, search, actionFilter, expiryStatus, receivePuid, receiveIm, receiveHanaPart, receiveDateCode, receiveExpDate]);

  useEffect(() => {
    if (tab === 'currentStock') {
      void loadCurrentStock();
      return;
    }
    void loadPaginatedReport();
  }, [tab, loadCurrentStock, loadPaginatedReport]);

  useEffect(() => {
    if (tab === 'currentStock') {
      setRowCount(filteredCurrentStock.length);
    }
  }, [tab, filteredCurrentStock.length]);

  const currentStockColumns: GridColDef<FlatStockRow>[] = [
    { field: 'rackName', headerName: t('pages:rackView'), flex: 1, minWidth: 120 },
    { field: 'levelNo', headerName: t('pages:locationView'), width: 90 },
    { field: 'boxCode', headerName: 'Box', width: 100 },
    { field: 'slotNo', headerName: 'Slot', width: 80 },
    { field: 'productName', headerName: t('common:partName'), flex: 1.5, minWidth: 160 },
    { field: 'qty', headerName: t('common:quantity'), width: 100, type: 'number' },
  ];

  const movementColumns: GridColDef[] = [
    { field: 'createdAt', headerName: 'Date/Time', flex: 1, minWidth: 150, valueFormatter: (v) => formatDate(v as string) },
    { field: 'productName', headerName: t('common:partName'), flex: 1.2, minWidth: 140 },
    { field: 'actionType', headerName: 'Type', width: 100 },
    { field: 'action', headerName: t('common:description'), flex: 1.5, minWidth: 180 },
    { field: 'quantity', headerName: t('common:quantity'), width: 100, type: 'number' },
    { field: 'username', headerName: t('common:username'), width: 120 },
  ];

  const receiveColumns: GridColDef[] = [
    { field: 'receiveDate', headerName: 'Receive Date', flex: 1, minWidth: 150, valueFormatter: (v) => formatDate(v as string) },
    { field: 'puid', headerName: t('common:barcode'), flex: 1, minWidth: 130 },
    { field: 'im', headerName: 'IM', width: 110 },
    { field: 'hanaPart', headerName: t('common:partNumber'), flex: 1, minWidth: 120 },
    { field: 'description', headerName: t('common:description'), flex: 1.2, minWidth: 160 },
    { field: 'qty', headerName: 'Qty', width: 80, type: 'number' },
    { field: 'qtyRemain', headerName: 'Remain', width: 90, type: 'number' },
    {
      field: 'location',
      headerName: t('common:location'),
      flex: 1,
      minWidth: 140,
      valueGetter: (_v, row) => locationLabel(row as ReceiveRow),
    },
    { field: 'expirationDate', headerName: t('common:expiryDate'), width: 120, valueFormatter: (v) => formatDateOnly(v as string) },
  ];

  const expiryColumns: GridColDef[] = [
    { field: 'hanaPart', headerName: t('common:partNumber'), flex: 1, minWidth: 120 },
    { field: 'im', headerName: 'IM', width: 110 },
    { field: 'puid', headerName: t('common:barcode'), flex: 1, minWidth: 130 },
    { field: 'qtyRemain', headerName: t('common:quantity'), width: 90, type: 'number' },
    { field: 'expirationDate', headerName: t('common:expiryDate'), width: 120, valueFormatter: (v) => formatDateOnly(v as string) },
    { field: 'daysLeft', headerName: 'Days Left', width: 100, type: 'number' },
    { field: 'statusText', headerName: t('common:status'), width: 130 },
    {
      field: 'location',
      headerName: t('common:location'),
      flex: 1,
      minWidth: 140,
      valueGetter: (_v, row) => locationLabel(row as ExpiryRow),
    },
  ];

  const activeColumns =
    tab === 'currentStock'
      ? currentStockColumns
      : tab === 'receiveHistory'
        ? receiveColumns
        : tab === 'expiryReport'
          ? expiryColumns
          : movementColumns;

  const activeRows =
    tab === 'currentStock'
      ? paginatedCurrentStock
      : gridRows;

  const fetchExportRows = async (): Promise<Record<string, unknown>[]> => {
    if (tab === 'currentStock') {
      return filteredCurrentStock as unknown as Record<string, unknown>[];
    }

    const exportLimit = Math.max(rowCount, PAGE_SIZE);
    const page = 1;

    if (tab === 'stockMovement') {
      const result = await reportsService.getStockMovements({
        page,
        limit: exportLimit,
        search: search.trim() || undefined,
        actionFilter: actionFilter === 'all' ? undefined : actionFilter,
      });
      return result.items as Record<string, unknown>[];
    }

    if (tab === 'pickHistory') {
      const result = await reportsService.getStockMovements({
        page,
        limit: exportLimit,
        search: search.trim() || undefined,
        action_type: 'pick',
      });
      return (result.items as StockMovementRow[])
        .filter((row) => row.actionType === 'pick' || row.action.startsWith('pick'))
        .map((row) => ({ ...row }));
    }

    if (tab === 'receiveHistory') {
      const result = await reportsService.getInventoryReceiveReport({
        page,
        limit: exportLimit,
        puid: receivePuid.trim() || undefined,
        im: receiveIm.trim() || undefined,
        hanaPart: receiveHanaPart.trim() || undefined,
        dateCode: receiveDateCode.trim() || undefined,
        expDate: receiveExpDate || undefined,
      });
      return result.items as Record<string, unknown>[];
    }

    const result = await reportsService.getExpirationReport({
      page,
      limit: exportLimit,
      search: search.trim() || undefined,
      status: expiryStatus,
    });
    return result.items as Record<string, unknown>[];
  };

  const handleExportExcel = async () => {
    try {
      const rows = await fetchExportRows();
      const filename = `visual-location-${tab}-${format(new Date(), 'yyyyMMdd-HHmm')}`;
      exportExcel(rows, filename, t(`pages:${tab === 'currentStock' ? 'currentStock' : tab === 'stockMovement' ? 'stockMovement' : tab === 'receiveHistory' ? 'receiveHistory' : tab === 'pickHistory' ? 'pickHistory' : 'expiryReport'}`));
    } catch (err) {
      setError(getErrorMessage(err, t('common:error')));
    }
  };

  const handleExportCsv = async () => {
    try {
      const rows = await fetchExportRows();
      const filename = `visual-location-${tab}-${format(new Date(), 'yyyyMMdd-HHmm')}`;
      exportCsv(rows, filename);
    } catch (err) {
      setError(getErrorMessage(err, t('common:error')));
    }
  };

  const handleExportPdf = async () => {
    try {
      const rows = await fetchExportRows();
      const columns = activeColumns
        .filter((col) => col.field !== 'location' || tab !== 'currentStock')
        .map((col) => col.headerName ?? col.field);

      const body = rows.map((row) =>
        activeColumns.map((col) => {
          if (col.valueGetter) {
            const value = col.valueGetter(undefined as never, row as never, col, {} as never);
            return value == null ? '' : String(value);
          }
          if (col.valueFormatter) {
            return String(col.valueFormatter(row[col.field as keyof typeof row] as never, row as never, col, {} as never));
          }
          const value = row[col.field as keyof typeof row];
          return value == null ? '' : String(value);
        }),
      );

      const title = t('pages:reportsTitle');
      const filename = `visual-location-${tab}-${format(new Date(), 'yyyyMMdd-HHmm')}`;
      exportPdf(title, columns, body, filename);
    } catch (err) {
      setError(getErrorMessage(err, t('common:error')));
    }
  };

  const tabLabels: Record<ReportTab, string> = {
    currentStock: t('pages:currentStock'),
    stockMovement: t('pages:stockMovement'),
    receiveHistory: t('pages:receiveHistory'),
    pickHistory: t('pages:pickHistory'),
    expiryReport: t('pages:expiryReport'),
  };

  return (
    <Box>
      <PageHeader
        title={t('pages:reportsTitle')}
        action={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => void handleExportExcel()}>
              {t('common:exportExcel')}
            </Button>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => void handleExportCsv()}>
              {t('common:exportCsv')}
            </Button>
            <Button variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={() => void handleExportPdf()}>
              {t('common:exportPdf')}
            </Button>
          </Stack>
        }
      />

      <Tabs
        value={tab}
        onChange={(_, value: ReportTab) => setTab(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        {(Object.keys(tabLabels) as ReportTab[]).map((key) => (
          <Tab key={key} label={tabLabels[key]} value={key} />
        ))}
      </Tabs>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Stack spacing={2} sx={{ mb: 2 }}>
        {tab === 'currentStock' && (
          <TextField
            size="small"
            label={t('common:search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ maxWidth: 360 }}
          />
        )}

        {(tab === 'stockMovement' || tab === 'pickHistory') && (
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              size="small"
              label={t('common:search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{ maxWidth: 360 }}
            />
            {tab === 'stockMovement' && (
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>{t('common:filter')}</InputLabel>
                <Select
                  label={t('common:filter')}
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value as typeof actionFilter)}
                >
                  <MenuItem value="all">{t('common:all')}</MenuItem>
                  <MenuItem value="add">Add</MenuItem>
                  <MenuItem value="withdraw">Withdraw</MenuItem>
                </Select>
              </FormControl>
            )}
          </Stack>
        )}

        {tab === 'expiryReport' && (
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              size="small"
              label={t('common:search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ maxWidth: 360 }}
            />
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>{t('common:status')}</InputLabel>
              <Select
                label={t('common:status')}
                value={expiryStatus}
                onChange={(e) => setExpiryStatus(e.target.value as typeof expiryStatus)}
              >
                <MenuItem value="all">{t('pages:nearExpiryList')}</MenuItem>
                <MenuItem value="expired">{t('pages:expired')}</MenuItem>
                <MenuItem value="soon">{t('pages:days7')}</MenuItem>
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="all_stock">{t('common:all')}</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        )}

        {tab === 'receiveHistory' && (
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} flexWrap="wrap">
            <TextField size="small" label={t('common:barcode')} value={receivePuid} onChange={(e) => setReceivePuid(e.target.value)} />
            <TextField size="small" label="IM" value={receiveIm} onChange={(e) => setReceiveIm(e.target.value)} />
            <TextField size="small" label={t('common:partNumber')} value={receiveHanaPart} onChange={(e) => setReceiveHanaPart(e.target.value)} />
            <TextField size="small" label="Date Code" value={receiveDateCode} onChange={(e) => setReceiveDateCode(e.target.value)} />
            <TextField
              size="small"
              label={t('common:expiryDate')}
              type="date"
              value={receiveExpDate}
              onChange={(e) => setReceiveExpDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        )}
      </Stack>

      <DataGrid
        autoHeight
        rows={activeRows}
        columns={activeColumns}
        loading={loading}
        paginationMode={tab === 'currentStock' ? 'client' : 'server'}
        rowCount={tab === 'currentStock' ? filteredCurrentStock.length : rowCount}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        pageSizeOptions={[10, 20, 50, 100]}
        disableRowSelectionOnClick
        sx={{ bgcolor: 'background.paper', borderRadius: 2 }}
      />
    </Box>
  );
}
