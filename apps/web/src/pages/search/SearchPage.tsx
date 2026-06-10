import LightbulbIcon from '@mui/icons-material/Lightbulb';
import PlaceIcon from '@mui/icons-material/Place';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  DataGrid,
  type GridColDef,
  type GridRenderCellParams,
} from '@mui/x-data-grid';
import { useMutation, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ScanInput } from '../../components/common/ScanInput';
import { PageHeader } from '../../components/layout/PageHeader';
import * as inventoryService from '../../services/inventoryService';
import * as ioService from '../../services/ioService';
import { getErrorMessage } from '../../services/apiClient';
import type { InventoryLocation, InventoryReceive } from '../../types/inventory';
import { formatLocationLabel } from '../shared/locationOptions';

type SearchTab = 'part' | 'name' | 'barcode' | 'location';

interface SearchRow {
  id: string;
  partNumber: string;
  description: string;
  qty: number;
  lot: string;
  expiry: string;
  location: string;
  rackId?: number;
  boxId?: number;
  slotId?: number;
  slotNo?: number;
  rackName?: string;
  levelNo?: number;
  boxCode?: string;
  productName?: string;
}

function readRecordField(record: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return '';
}

function readRecordNumber(record: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && value !== '') {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) return parsed;
    }
  }
  return 0;
}

function receiveToRow(record: InventoryReceive, index: number): SearchRow {
  const raw = record as InventoryReceive & Record<string, unknown>;
  const partNumber = readRecordField(raw, 'hanaPart', 'HanaPart');
  const description = readRecordField(raw, 'description', 'Description');
  const qty = readRecordNumber(raw, 'qtyRemain', 'QtyRemain');
  const lot = readRecordField(raw, 'lotNo', 'LotNo');
  const expiryRaw = readRecordField(raw, 'expirationDate', 'ExpirationDate');
  const locShelf = readRecordField(raw, 'locShelf', 'LocShelf');
  const locLevel = readRecordField(raw, 'locLevel', 'LocLevel');
  const locBox = readRecordField(raw, 'locBox', 'LocBox');
  const puid = readRecordField(raw, 'puid', 'PUID');

  return {
    id: `recv-${raw.id ?? index}-${puid || index}`,
    partNumber,
    description,
    qty,
    lot: lot || '—',
    expiry: expiryRaw ? format(new Date(expiryRaw), 'yyyy-MM-dd') : '—',
    location: [locShelf, locLevel, locBox].filter(Boolean).join(' / ') || '—',
    productName: partNumber,
  };
}

function locationToRow(record: InventoryLocation, index: number): SearchRow {
  return {
    id: `loc-${record.slot_id}-${index}`,
    partNumber: record.part_name,
    description: record.product_remark ?? record.part_name,
    qty: record.current_qty,
    lot: '—',
    expiry: record.earliest_expiration
      ? format(new Date(record.earliest_expiration), 'yyyy-MM-dd')
      : '—',
    location: formatLocationLabel(
      record.rack_name,
      record.level_no,
      record.box_code,
      record.slot_no,
    ),
    rackId: record.rack_id,
    boxId: record.box_id,
    slotId: record.slot_id,
    slotNo: record.slot_no,
    rackName: record.rack_name,
    levelNo: record.level_no,
    boxCode: record.box_code,
    productName: record.part_name,
  };
}

function buildRows(
  tab: SearchTab,
  data: Awaited<ReturnType<typeof inventoryService.searchInventory>> | undefined,
): SearchRow[] {
  if (!data) return [];

  if (tab === 'barcode') {
    return data.puidMatches.map(receiveToRow);
  }

  if (tab === 'part') {
    const rows = [
      ...data.hanaPartMatches.map(receiveToRow),
      ...data.locations.map(locationToRow),
    ];
    return rows.filter(
      (row, index, array) => array.findIndex((item) => item.id === row.id) === index,
    );
  }

  if (tab === 'name') {
    return data.locations
      .filter(
        (loc) =>
          loc.part_name.toLowerCase().includes(data.query.toLowerCase()) ||
          (loc.product_remark ?? '').toLowerCase().includes(data.query.toLowerCase()),
      )
      .map(locationToRow);
  }

  const query = data.query.toLowerCase();
  return data.locations
    .filter((loc) => {
      const locationText = formatLocationLabel(
        loc.rack_name,
        loc.level_no,
        loc.box_code,
        loc.slot_no,
      ).toLowerCase();
      return (
        locationText.includes(query) ||
        loc.rack_name.toLowerCase().includes(query) ||
        loc.box_code.toLowerCase().includes(query)
      );
    })
    .map(locationToRow);
}

export function SearchPage() {
  const { t } = useTranslation(['pages', 'common']);
  const navigate = useNavigate();
  const [tab, setTab] = useState<SearchTab>('part');
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const searchQuery = useQuery({
    queryKey: ['inventory-search', submittedQuery],
    queryFn: () => inventoryService.searchInventory(submittedQuery),
    enabled: submittedQuery.length > 0,
  });

  const highlightMutation = useMutation({
    mutationFn: async (row: SearchRow) => {
      if (!row.boxId || !row.slotId) {
        throw new Error(t('common:noData'));
      }
      await ioService.ioHighlight({ boxId: row.boxId, slotNo: row.slotNo });
      await inventoryService.highlightLocation({
        productName: row.productName,
        boxId: row.boxId,
        slotId: row.slotId,
        slotNo: row.slotNo,
        rackName: row.rackName,
        levelNo: row.levelNo,
        boxCode: row.boxCode,
        qty: row.qty,
      });
    },
    onSuccess: () => {
      setActionError(null);
      setActionSuccess(t('common:success'));
    },
    onError: (error) => {
      setActionSuccess(null);
      setActionError(getErrorMessage(error, t('common:error')));
    },
  });

  const rows = useMemo(() => buildRows(tab, searchQuery.data), [tab, searchQuery.data]);

  const handleSearch = () => {
    const trimmed = query.trim();
    setSubmittedQuery(trimmed);
    setActionError(null);
    setActionSuccess(null);
  };

  const handleOpenLocation = useCallback(
    (row: SearchRow) => {
      navigate('/app/rack', {
        state: {
          rackId: row.rackId,
          boxId: row.boxId,
          slotId: row.slotId,
          highlightSlotId: row.slotId,
        },
      });
    },
    [navigate],
  );

  const columns = useMemo<GridColDef<SearchRow>[]>(
    () => [
      { field: 'partNumber', headerName: t('common:partNumber'), flex: 1, minWidth: 140 },
      { field: 'description', headerName: t('common:description'), flex: 1.2, minWidth: 180 },
      { field: 'qty', headerName: t('common:quantity'), width: 100, type: 'number' },
      { field: 'lot', headerName: t('common:lotNumber'), width: 120 },
      { field: 'expiry', headerName: t('common:expiryDate'), width: 130 },
      { field: 'location', headerName: t('common:location'), flex: 1.2, minWidth: 200 },
      {
        field: 'actions',
        headerName: t('common:actions'),
        width: 130,
        sortable: false,
        filterable: false,
        renderCell: (params: GridRenderCellParams<SearchRow>) => (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title={t('common:openLocation')}>
              <span>
                <IconButton
                  size="small"
                  disabled={!params.row.slotId}
                  onClick={() => handleOpenLocation(params.row)}
                >
                  <PlaceIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={t('common:triggerLight')}>
              <span>
                <IconButton
                  size="small"
                  disabled={!params.row.boxId || highlightMutation.isPending}
                  onClick={() => highlightMutation.mutate(params.row)}
                >
                  <LightbulbIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    [t, highlightMutation.isPending, handleOpenLocation],
  );

  const tabLabels: Record<SearchTab, string> = {
    part: t('pages:searchByPart'),
    name: t('pages:searchByName'),
    barcode: t('pages:searchByBarcode'),
    location: t('pages:searchByLocation'),
  };

  return (
    <Box>
      <PageHeader title={t('pages:searchTitle')} />

      <Tabs
        value={tab}
        onChange={(_, value: SearchTab) => setTab(value)}
        sx={{ mb: 2 }}
        variant="scrollable"
        scrollButtons="auto"
      >
        {(Object.keys(tabLabels) as SearchTab[]).map((key) => (
          <Tab key={key} value={key} label={tabLabels[key]} />
        ))}
      </Tabs>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
        {tab === 'barcode' ? (
          <ScanInput
            label={t('pages:searchByBarcode')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onScan={(value) => {
              setQuery(value);
              setSubmittedQuery(value);
              setActionError(null);
              setActionSuccess(null);
            }}
          />
        ) : (
          <TextField
            label={tabLabels[tab]}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
            fullWidth
          />
        )}
        <Button
          variant="contained"
          onClick={handleSearch}
          disabled={!query.trim() || searchQuery.isFetching}
          sx={{ minWidth: 140, alignSelf: { xs: 'stretch', md: 'center' } }}
        >
          {searchQuery.isFetching ? <CircularProgress size={22} color="inherit" /> : t('common:search')}
        </Button>
      </Stack>

      {searchQuery.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {getErrorMessage(searchQuery.error, t('common:error'))}
        </Alert>
      )}
      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}
      {actionSuccess && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setActionSuccess(null)}>
          {actionSuccess}
        </Alert>
      )}

      <Box sx={{ height: 560, width: '100%' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={searchQuery.isLoading}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          localeText={{ noRowsLabel: t('common:noData') }}
        />
      </Box>

      {searchQuery.isLoading && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {t('common:loading')}
        </Typography>
      )}
    </Box>
  );
}
