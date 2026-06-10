import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScanInput } from '../../components/common/ScanInput';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { PageHeader } from '../../components/layout/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import * as cpkService from '../../services/cpkService';
import * as inventoryService from '../../services/inventoryService';
import * as reservationsService from '../../services/reservationsService';
import * as warehouseService from '../../services/warehouseService';
import { getErrorMessage } from '../../services/apiClient';
import {
  isCpkError,
  parseCpkReservationInfo,
  type CpkReservationInfo,
  type CpkReservationMaterial,
} from '../shared/cpkUtils';
import {
  flattenWarehouseLocations,
  formatLocationLabel,
  type LocationOption,
} from '../shared/locationOptions';

function readInventoryField(record: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return '';
}

export function ReceiveReservationPage() {
  const { t } = useTranslation(['pages', 'common']);
  const { user } = useAuth();

  const [activeStep, setActiveStep] = useState(0);
  const [reservationNo, setReservationNo] = useState('');
  const [submittedResNo, setSubmittedResNo] = useState('');
  const [reservationInfo, setReservationInfo] = useState<CpkReservationInfo | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<CpkReservationMaterial | null>(null);
  const [puid, setPuid] = useState('');
  const [qty, setQty] = useState<number>(1);
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

  const searchMutation = useMutation({
    mutationFn: async (keyword: string) => {
      const [cpkData, localReservation] = await Promise.all([
        cpkService.getReservationInfo(keyword) as Promise<Record<string, unknown>>,
        reservationsService.getReservation(keyword).catch(() => null),
      ]);

      if (isCpkError(cpkData)) {
        throw new Error(String(cpkData.Message ?? cpkData.message ?? 'Reservation not found'));
      }

      const parsed = parseCpkReservationInfo(
        keyword,
        cpkData,
        localReservation as Record<string, unknown> | null,
      );

      if (parsed.materials.length === 0) {
        throw new Error('No materials found for this reservation');
      }

      return parsed;
    },
    onSuccess: (data) => {
      setReservationInfo(data);
      setSelectedMaterial(data.materials[0] ?? null);
      setActiveStep(1);
      setError(null);
    },
    onError: (err) => {
      setError(getErrorMessage(err, t('common:error')));
      setReservationInfo(null);
    },
  });

  const receiveMutation = useMutation({
    mutationFn: async () => {
      if (!reservationInfo || !selectedMaterial || !selectedLocation || !user) {
        throw new Error('Missing required receive data');
      }

      const operator = user.username;
      const locationLabel = formatLocationLabel(
        selectedLocation.rackName,
        selectedLocation.levelNo,
        selectedLocation.boxCode,
        selectedLocation.slotNo,
      );

      await cpkService.receiveReservation({
        resNo: reservationInfo.resNo,
        puid: puid.trim(),
        operator,
        location: locationLabel,
      });

      let puidDetails: Record<string, unknown> = {};
      try {
        puidDetails = (await inventoryService.getPuid(puid.trim())) as unknown as Record<string, unknown>;
      } catch {
        puidDetails = {};
      }

      await inventoryService.receiveItem({
        puid: puid.trim(),
        hanaPart: selectedMaterial.hanaPart,
        slotId: selectedLocation.slotId,
        qty,
        reservationNo: reservationInfo.resNo,
        im: selectedMaterial.im ?? (readInventoryField(puidDetails, 'im', 'IM') || undefined),
        description:
          selectedMaterial.description ||
          readInventoryField(puidDetails, 'description', 'Description') ||
          undefined,
        lotNo:
          selectedMaterial.lotNo ||
          readInventoryField(puidDetails, 'lotNo', 'LotNo') ||
          undefined,
        expirationDate:
          readInventoryField(puidDetails, 'expirationDate', 'ExpirationDate') || undefined,
        locShelf: selectedLocation.rackName,
        locLevel: String(selectedLocation.levelNo),
        locBox: selectedLocation.boxCode,
      });
    },
    onSuccess: () => {
      setConfirmOpen(false);
      setSuccess(t('common:success'));
      setError(null);
      setPuid('');
      setQty(1);
      setSelectedLocation(null);
      setActiveStep(0);
      setSubmittedResNo('');
      setReservationNo('');
      setReservationInfo(null);
      setSelectedMaterial(null);
    },
    onError: (err) => {
      setConfirmOpen(false);
      setError(getErrorMessage(err, t('common:error')));
    },
  });

  const handleSearch = () => {
    const trimmed = reservationNo.trim();
    if (!trimmed) return;
    setSubmittedResNo(trimmed);
    setSuccess(null);
    searchMutation.mutate(trimmed);
  };

  const canProceedToConfirm =
    Boolean(selectedMaterial) &&
    Boolean(selectedLocation) &&
    puid.trim().length > 0 &&
    qty > 0;

  const stepLabels = [
    t('pages:reservationSearch'),
    t('pages:reservationDetail'),
    t('pages:confirmReceive'),
  ];

  return (
    <Box>
      <PageHeader title={t('pages:receiveTitle')} />

      <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
        {stepLabels.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

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

      {activeStep === 0 && (
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <TextField
                label={t('pages:reservationSearch')}
                value={reservationNo}
                onChange={(e) => setReservationNo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
                fullWidth
              />
              <Button
                variant="contained"
                onClick={handleSearch}
                disabled={!reservationNo.trim() || searchMutation.isPending}
              >
                {searchMutation.isPending ? (
                  <CircularProgress size={22} color="inherit" />
                ) : (
                  t('common:search')
                )}
              </Button>
              {submittedResNo && searchMutation.isPending && (
                <Typography variant="body2" color="text.secondary">
                  {t('common:loading')}
                </Typography>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      {activeStep >= 1 && reservationInfo && (
        <Stack spacing={3}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="h6" fontWeight={700}>
                  {reservationInfo.resNo}
                </Typography>
                {reservationInfo.status && (
                  <Typography variant="body2" color="text.secondary">
                    {t('common:status')}: {reservationInfo.status}
                  </Typography>
                )}
                {reservationInfo.store && (
                  <Typography variant="body2" color="text.secondary">
                    Store: {reservationInfo.store}
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>

          <TableContainer component={Card}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('common:partNumber')}</TableCell>
                  <TableCell>{t('common:description')}</TableCell>
                  <TableCell align="right">{t('common:quantity')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reservationInfo.materials.map((material) => (
                  <TableRow
                    key={material.hanaPart}
                    hover
                    selected={selectedMaterial?.hanaPart === material.hanaPart}
                    onClick={() => setSelectedMaterial(material)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>{material.hanaPart}</TableCell>
                    <TableCell>{material.description || '—'}</TableCell>
                    <TableCell align="right">{material.qty}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Card>
            <CardContent>
              <Stack spacing={2}>
                <ScanInput
                  label={t('common:barcode')}
                  value={puid}
                  onChange={(e) => setPuid(e.target.value)}
                  onScan={setPuid}
                />
                <TextField
                  label={t('common:quantity')}
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                  inputProps={{ min: 1 }}
                  fullWidth
                />
                <Autocomplete
                  options={locationOptions}
                  value={selectedLocation}
                  onChange={(_, value) => setSelectedLocation(value)}
                  getOptionLabel={(option) => option.label}
                  isOptionEqualToValue={(a, b) => a.slotId === b.slotId}
                  loading={hierarchyQuery.isLoading}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t('common:location')}
                      placeholder={t('common:location')}
                    />
                  )}
                />
              </Stack>
            </CardContent>
          </Card>

          <Stack direction="row" spacing={2} justifyContent="space-between">
            <Button
              variant="outlined"
              onClick={() => {
                setActiveStep(0);
                setReservationInfo(null);
                setSelectedMaterial(null);
              }}
            >
              {t('common:back')}
            </Button>
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                onClick={() => setActiveStep(1)}
                disabled={activeStep === 1}
              >
                {t('pages:reservationDetail')}
              </Button>
              <Button
                variant="contained"
                disabled={!canProceedToConfirm}
                onClick={() => {
                  setActiveStep(2);
                  setConfirmOpen(true);
                }}
              >
                {t('pages:confirmReceive')}
              </Button>
            </Stack>
          </Stack>
        </Stack>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={t('pages:confirmReceive')}
        message={`${t('common:confirm')} ${reservationInfo?.resNo ?? ''} — ${selectedMaterial?.hanaPart ?? ''} (${qty})`}
        confirmLabel={t('common:confirm')}
        loading={receiveMutation.isPending}
        onCancel={() => {
          setConfirmOpen(false);
          setActiveStep(1);
        }}
        onConfirm={() => receiveMutation.mutate()}
      />
    </Box>
  );
}
