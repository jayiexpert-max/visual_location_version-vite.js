import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid2 as Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScanInput } from '../../components/common/ScanInput';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { PageHeader } from '../../components/layout/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import * as cpkService from '../../services/cpkService';
import * as inventoryService from '../../services/inventoryService';
import * as warehouseService from '../../services/warehouseService';
import { getErrorMessage } from '../../services/apiClient';
import {
  flattenWarehouseLocations,
  formatLocationLabel,
  type LocationOption,
} from '../shared/locationOptions';

function readField(record: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return '';
}

function readNumber(record: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && value !== '') {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) return parsed;
    }
  }
  return 0;
}

export function ReceiveReturnPage() {
  const { t } = useTranslation(['pages', 'common']);
  const { user } = useAuth();

  const [puid, setPuid] = useState('');
  const [submittedPuid, setSubmittedPuid] = useState('');
  const [qty, setQty] = useState(1);
  const [selectedLocation, setSelectedLocation] = useState<LocationOption | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const hierarchyQuery = useQuery({
    queryKey: ['warehouse-hierarchy'],
    queryFn: () => warehouseService.getHierarchy(),
  });

  const locationOptions = useMemo(
    () => (hierarchyQuery.data ? flattenWarehouseLocations(hierarchyQuery.data) : []),
    [hierarchyQuery.data],
  );

  const puidQuery = useQuery({
    queryKey: ['inventory-puid', submittedPuid],
    queryFn: () => inventoryService.getPuid(submittedPuid),
    enabled: submittedPuid.length > 0,
  });

  const puidRecord = (puidQuery.data ?? {}) as Record<string, unknown>;

  const returnMutation = useMutation({
    mutationFn: async () => {
      if (!user || !selectedLocation || !submittedPuid) {
        throw new Error('Missing required return data');
      }

      const currentQty = readNumber(puidRecord, 'qtyRemain', 'QtyRemain');
      const newQty = currentQty + qty;
      const locationLabel = formatLocationLabel(
        selectedLocation.rackName,
        selectedLocation.levelNo,
        selectedLocation.boxCode,
        selectedLocation.slotNo,
      );

      await cpkService.returnPuid({
        puid: submittedPuid,
        operator: user.username,
        newQty: String(newQty),
        location: locationLabel,
      });

      await inventoryService.receiveReturn({
        puid: submittedPuid,
        slotId: selectedLocation.slotId,
        qty,
      });
    },
    onSuccess: () => {
      setConfirmOpen(false);
      setSuccess(t('common:success'));
      setError(null);
      setPuid('');
      setSubmittedPuid('');
      setQty(1);
      setSelectedLocation(null);
    },
    onError: (err) => {
      setConfirmOpen(false);
      setError(getErrorMessage(err, t('common:error')));
    },
  });

  const handleScan = (value: string) => {
    const trimmed = value.trim();
    setPuid(trimmed);
    setSubmittedPuid(trimmed);
    setSuccess(null);
    setError(null);
  };

  const canSubmit =
    Boolean(submittedPuid) &&
    Boolean(puidQuery.data) &&
    Boolean(selectedLocation) &&
    qty > 0 &&
    !puidQuery.isLoading;

  const partNumber = readField(puidRecord, 'hanaPart', 'HanaPart');
  const description = readField(puidRecord, 'description', 'Description');
  const lotNo = readField(puidRecord, 'lotNo', 'LotNo');
  const expiryRaw = readField(puidRecord, 'expirationDate', 'ExpirationDate');
  const qtyRemain = readNumber(puidRecord, 'qtyRemain', 'QtyRemain');

  return (
    <Box>
      <PageHeader title={t('pages:returnTitle')} />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <ScanInput
            label={t('pages:scanBarcode')}
            value={puid}
            onChange={(e) => setPuid(e.target.value)}
            onScan={handleScan}
          />
        </CardContent>
      </Card>

      {puidQuery.isLoading && submittedPuid && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            {t('common:loading')}
          </Typography>
        </Stack>
      )}

      {puidQuery.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {getErrorMessage(puidQuery.error, t('common:error'))}
        </Alert>
      )}

      {puidQuery.data && (
        <Stack spacing={3}>
          <Card>
            <CardContent>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('common:partNumber')}
                  </Typography>
                  <Typography variant="h6">{partNumber || '—'}</Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('common:description')}
                  </Typography>
                  <Typography variant="h6">{description || '—'}</Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('common:lotNumber')}
                  </Typography>
                  <Typography variant="body1">{lotNo || '—'}</Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('common:expiryDate')}
                  </Typography>
                  <Typography variant="body1">
                    {expiryRaw ? format(new Date(expiryRaw), 'yyyy-MM-dd') : '—'}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('common:quantity')}
                  </Typography>
                  <Typography variant="body1">{qtyRemain}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Autocomplete
                  options={locationOptions}
                  value={selectedLocation}
                  onChange={(_, value) => setSelectedLocation(value)}
                  getOptionLabel={(option) => option.label}
                  isOptionEqualToValue={(a, b) => a.slotId === b.slotId}
                  loading={hierarchyQuery.isLoading}
                  renderInput={(params) => (
                    <TextField {...params} label={t('pages:returnLocation')} fullWidth />
                  )}
                />
                <TextField
                  label={t('common:quantity')}
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                  inputProps={{ min: 1 }}
                  fullWidth
                />
                <Button
                  variant="contained"
                  disabled={!canSubmit}
                  onClick={() => setConfirmOpen(true)}
                >
                  {t('common:confirm')}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={t('pages:returnTitle')}
        message={`${t('common:confirm')} ${submittedPuid} +${qty} → ${selectedLocation?.label ?? ''}`}
        confirmLabel={t('common:confirm')}
        loading={returnMutation.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => returnMutation.mutate()}
      />
    </Box>
  );
}
