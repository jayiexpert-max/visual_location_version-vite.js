import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { getErrorMessage } from '../../services/apiClient';
import * as warehouseService from '../../services/warehouseService';
import type {
  ProductAdminRow,
  ProductBoxOption,
  ProductSlotOption,
} from '../../types/adminProducts';

interface AdminProductsTabProps {
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

function slotLabel(slot: ProductSlotOption): string {
  return `${slot.rackName} L${slot.levelNo} Box ${slot.boxCode} · Slot ${slot.slotNo}`;
}

function locationLabel(row: ProductAdminRow): string {
  if (!row.rackName) return '-';
  return `${row.rackName} L${row.levelNo ?? '-'} Box ${row.boxCode ?? '-'} · Slot ${row.slotNo ?? '-'}`;
}

function downloadProductsCsv(rows: ProductAdminRow[]): void {
  const header = ['id', 'name', 'rack', 'level', 'box', 'slot', 'qty', 'remark'];
  const lines = rows.map((r) =>
    [
      r.id,
      r.name ?? '',
      r.rackName ?? '',
      r.levelNo ?? '',
      r.boxCode ?? '',
      r.slotNo ?? '',
      r.qty,
      r.remark ?? '',
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(','),
  );
  const blob = new Blob([[header.join(','), ...lines].join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `products_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AdminProductsTab({ onSuccess, onError }: AdminProductsTabProps) {
  const { t } = useTranslation(['pages', 'common']);

  const [boxFilter, setBoxFilter] = useState(0);
  const [boxOptions, setBoxOptions] = useState<ProductBoxOption[]>([]);
  const [products, setProducts] = useState<ProductAdminRow[]>([]);
  const [emptySlots, setEmptySlots] = useState<ProductSlotOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [slotId, setSlotId] = useState<number | ''>('');
  const [partName, setPartName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ProductAdminRow | null>(null);
  const [showNextSlotHint, setShowNextSlotHint] = useState(false);

  const loadBoxOptions = useCallback(async () => {
    try {
      setBoxOptions(await warehouseService.adminListProductBoxOptions());
    } catch (err) {
      onError(getErrorMessage(err, t('common:error'), t));
    }
  }, [onError, t]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      setProducts(
        await warehouseService.adminListProducts(boxFilter > 0 ? boxFilter : undefined),
      );
    } catch (err) {
      onError(getErrorMessage(err, t('common:error'), t));
    } finally {
      setLoading(false);
    }
  }, [boxFilter, onError, t]);

  const loadEmptySlots = useCallback(
    async (prefillSlotId?: number, isEdit = false) => {
      try {
        const slots = await warehouseService.adminListEmptyProductSlots(
          boxFilter > 0 ? boxFilter : undefined,
          prefillSlotId,
        );
        setEmptySlots(slots);

        if (!isEdit && prefillSlotId == null) {
          const next = await warehouseService.adminGetNextEmptyProductSlot(
            boxFilter > 0 ? boxFilter : undefined,
          );
          if (next.slotId) {
            setSlotId(next.slotId);
            setShowNextSlotHint(true);
          } else {
            setSlotId('');
            setShowNextSlotHint(false);
          }
        }
      } catch (err) {
        onError(getErrorMessage(err, t('common:error'), t));
      }
    },
    [boxFilter, onError, t],
  );

  useEffect(() => {
    void loadBoxOptions();
  }, [loadBoxOptions]);

  useEffect(() => {
    void loadProducts();
    void loadEmptySlots();
    if (!editingId) {
      setPartName('');
    }
  }, [boxFilter, loadProducts, loadEmptySlots, editingId]);

  const resetForm = () => {
    setEditingId(null);
    setPartName('');
    void loadEmptySlots();
  };

  const startEdit = (row: ProductAdminRow) => {
    setEditingId(row.id);
    setSlotId(row.slotId ?? '');
    setPartName(row.name ?? '');
    void loadEmptySlots(row.slotId ?? undefined, true);
  };

  const saveProduct = async () => {
    if (!slotId || !partName.trim()) {
      onError(t('pages:productMappingRequired'));
      return;
    }

    setSaving(true);
    try {
      const payload = { slotId: Number(slotId), name: partName.trim(), qty: 0 };
      if (editingId) {
        await warehouseService.adminUpdateProduct(editingId, payload);
      } else {
        await warehouseService.adminCreateProduct(payload);
      }
      onSuccess(t('common:success'));
      resetForm();
      await loadProducts();
      await loadEmptySlots();
    } catch (err) {
      onError(getErrorMessage(err, t('common:error'), t));
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await warehouseService.adminDeleteProduct(deleteTarget.id);
      setDeleteTarget(null);
      onSuccess(t('common:success'));
      if (editingId === deleteTarget.id) resetForm();
      await loadProducts();
      await loadEmptySlots();
    } catch (err) {
      onError(getErrorMessage(err, t('common:error'), t));
    } finally {
      setSaving(false);
    }
  };

  const columns: GridColDef<ProductAdminRow>[] = [
    { field: 'name', headerName: t('pages:productMappingPart'), flex: 1, minWidth: 140 },
    {
      field: 'location',
      headerName: t('pages:productMappingLocation'),
      flex: 1.5,
      minWidth: 220,
      valueGetter: (_v, row) => locationLabel(row),
    },
    { field: 'qty', headerName: 'Qty', width: 80 },
    {
      field: 'actions',
      headerName: t('common:actions'),
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5}>
          <IconButton size="small" onClick={() => startEdit(row)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" color="error" onClick={() => setDeleteTarget(row)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      ),
    },
  ];

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ flex: 1 }}>
              {t('pages:productMappingTitle')}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => downloadProductsCsv(products)}
              disabled={products.length === 0}
            >
              {t('pages:productMappingExport')}
            </Button>
          </Stack>

          <FormControl fullWidth size="small" sx={{ mb: 2, maxWidth: 480 }}>
            <InputLabel>{t('pages:productMappingBoxFilter')}</InputLabel>
            <Select
              label={t('pages:productMappingBoxFilter')}
              value={boxFilter}
              onChange={(e) => {
                setBoxFilter(Number(e.target.value));
                resetForm();
              }}
            >
              <MenuItem value={0}>{t('pages:productMappingAllBoxes')}</MenuItem>
              {boxOptions.map((bx) => (
                <MenuItem key={bx.id} value={bx.id}>
                  Rack {bx.rackName} L{bx.levelNo} Box {bx.boxCode} ({bx.mappedCount}/{bx.slotTotal} · {bx.layout ?? '-'})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {showNextSlotHint && !editingId && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {t('pages:productMappingNextSlotHint')}
            </Alert>
          )}

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'flex-end' }}>
            <FormControl fullWidth size="small" sx={{ flex: 2 }}>
              <InputLabel>{t('pages:productMappingSlot')}</InputLabel>
              <Select
                label={t('pages:productMappingSlot')}
                value={slotId}
                onChange={(e) => {
                  setSlotId(e.target.value === '' ? '' : Number(e.target.value));
                  setShowNextSlotHint(false);
                }}
              >
                <MenuItem value="">{t('pages:productMappingChooseSlot')}</MenuItem>
                {emptySlots.map((sl) => (
                  <MenuItem key={sl.id} value={sl.id}>
                    {slotLabel(sl)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label={t('pages:productMappingPart')}
              value={partName}
              onChange={(e) => setPartName(e.target.value)}
              size="small"
              sx={{ flex: 2 }}
              required
            />
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                startIcon={editingId ? undefined : <AddIcon />}
                onClick={() => void saveProduct()}
                disabled={saving}
              >
                {editingId ? t('common:save') : t('common:create')}
              </Button>
              {editingId && (
                <Button variant="outlined" onClick={resetForm} disabled={saving}>
                  {t('common:cancel')}
                </Button>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Box sx={{ height: 420 }}>
        <DataGrid
          rows={products}
          columns={columns}
          loading={loading}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        />
      </Box>

      <ConfirmDialog
        open={deleteTarget != null}
        title={t('common:confirmDelete')}
        message={t('pages:productMappingDeleteConfirm', { name: deleteTarget?.name ?? '' })}
        onConfirm={() => void deleteProduct()}
        onCancel={() => setDeleteTarget(null)}
        loading={saving}
      />
    </Stack>
  );
}
