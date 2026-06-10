import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
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
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import SearchIcon from '@mui/icons-material/Search';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScanInput } from '../../components/common/ScanInput';
import { PageHeader } from '../../components/layout/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import * as cpkService from '../../services/cpkService';
import { getErrorMessage } from '../../services/apiClient';
import {
  type CpkPicklistLine,
  type CpkPicklistSummary,
  type CpkResponseBody,
  extractPicklistLines,
  extractPicklists,
  getLinePartNo,
  getLineQtyPicked,
  getLineQtyRequired,
  getPicklistId,
  isCpkSuccess,
} from '../../types/cpk';

const STEP_KEYS = ['picklistSearch', 'picklistTitle', 'pickComplete'] as const;

export function PicklistPage() {
  const { t } = useTranslation(['pages', 'common']);
  const { user } = useAuth();

  const [activeStep, setActiveStep] = useState(0);
  const [search, setSearch] = useState('');
  const [picklists, setPicklists] = useState<CpkPicklistSummary[]>([]);
  const [selectedPicklist, setSelectedPicklist] = useState<CpkPicklistSummary | null>(null);
  const [lines, setLines] = useState<CpkPicklistLine[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  const [listLoading, setListLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [issueLoading, setIssueLoading] = useState(false);
  const [closeLoading, setCloseLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [scannedPuid, setScannedPuid] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmQty, setConfirmQty] = useState('');

  const picklistId = selectedPicklist ? getPicklistId(selectedPicklist) : '';
  const operator = user?.username ?? '';

  const filteredPicklists = useMemo(() => {
    if (!search.trim()) return picklists;
    const term = search.trim().toLowerCase();
    return picklists.filter((pl) => {
      const id = getPicklistId(pl).toLowerCase();
      const station = String(pl.Station ?? pl.Machine ?? pl.MachineName ?? '').toLowerCase();
      return id.includes(term) || station.includes(term);
    });
  }, [picklists, search]);

  const pickProgress = useMemo(() => {
    if (!lines.length) return 0;
    const done = lines.filter((l) => getLineQtyPicked(l) >= getLineQtyRequired(l)).length;
    return Math.round((done / lines.length) * 100);
  }, [lines]);

  const allLinesComplete = useMemo(
    () => lines.length > 0 && lines.every((l) => getLineQtyPicked(l) >= getLineQtyRequired(l)),
    [lines],
  );

  const loadOpenPicklists = useCallback(async () => {
    setListLoading(true);
    setError(null);
    try {
      const data = (await cpkService.getOpenPicklists()) as CpkResponseBody;
      if (!isCpkSuccess(data) && data.Status) {
        throw new Error(data.Message ?? t('common:error'));
      }
      setPicklists(extractPicklists(data));
      if (Array.isArray(data.Warnings)) setWarnings(data.Warnings);
    } catch (err) {
      setError(getErrorMessage(err, t('common:error')));
      setPicklists([]);
    } finally {
      setListLoading(false);
    }
  }, [t]);

  const loadPicklistDetail = useCallback(
    async (picklist: CpkPicklistSummary) => {
      const id = getPicklistId(picklist);
      if (!id) return;

      setDetailLoading(true);
      setError(null);
      setSuccessMsg(null);
      try {
        const data = (await cpkService.getPicklistDetail({ picklistId: id })) as CpkResponseBody;
        if (!isCpkSuccess(data) && data.Status) {
          throw new Error(data.Message ?? t('common:error'));
        }
        setSelectedPicklist(picklist);
        setLines(extractPicklistLines(data));
        if (Array.isArray(data.Warnings)) setWarnings(data.Warnings);
        setActiveStep(1);
      } catch (err) {
        setError(getErrorMessage(err, t('common:error')));
      } finally {
        setDetailLoading(false);
      }
    },
    [t],
  );

  const refreshDetail = useCallback(async () => {
    if (!selectedPicklist) return;
    const id = getPicklistId(selectedPicklist);
    try {
      const data = (await cpkService.getPicklistDetail({ picklistId: id })) as CpkResponseBody;
      if (isCpkSuccess(data) || !data.Status) {
        setLines(extractPicklistLines(data));
        if (Array.isArray(data.Warnings)) setWarnings(data.Warnings);
      }
    } catch {
      /* keep current lines on refresh failure */
    }
  }, [selectedPicklist]);

  const handleScan = (puid: string) => {
    setScannedPuid(puid);
    setConfirmQty('');
    setConfirmOpen(true);
  };

  const handleIssueConfirm = async () => {
    if (!picklistId || !scannedPuid || !operator) return;

    setIssueLoading(true);
    setError(null);
    try {
      const data = (await cpkService.issuePuidToPicklist({
        picklistId,
        puid: scannedPuid,
        operator,
      })) as CpkResponseBody;

      if (!isCpkSuccess(data)) {
        throw new Error(data.Message ?? t('common:error'));
      }

      if (Array.isArray(data.Warnings) && data.Warnings.length) {
        setWarnings(data.Warnings);
      }

      setSuccessMsg(data.Message ?? t('common:success'));
      setConfirmOpen(false);
      setScannedPuid('');
      await refreshDetail();
    } catch (err) {
      setError(getErrorMessage(err, t('common:error')));
    } finally {
      setIssueLoading(false);
    }
  };

  const handleClosePicklist = async () => {
    if (!picklistId || !operator) return;

    setCloseLoading(true);
    setError(null);
    try {
      const data = (await cpkService.closePicklist({ picklistId, operator })) as CpkResponseBody;
      if (!isCpkSuccess(data)) {
        throw new Error(data.Message ?? t('common:error'));
      }
      if (Array.isArray(data.Warnings)) setWarnings(data.Warnings);
      setActiveStep(2);
      setSuccessMsg(data.Message ?? t('pickComplete'));
    } catch (err) {
      setError(getErrorMessage(err, t('common:error')));
    } finally {
      setCloseLoading(false);
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    setSelectedPicklist(null);
    setLines([]);
    setPicklists([]);
    setWarnings([]);
    setError(null);
    setSuccessMsg(null);
    setSearch('');
  };

  return (
    <>
      <PageHeader title={t('picklistTitle')} />

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {STEP_KEYS.map((key) => (
          <Step key={key}>
            <StepLabel>{t(key)}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {warnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {warnings.join(' · ')}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {successMsg && activeStep < 2 && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}

      {activeStep === 0 && (
        <Stack spacing={3}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label={t('picklistSearch')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  fullWidth
                  InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                />
                <Button
                  variant="contained"
                  onClick={() => void loadOpenPicklists()}
                  disabled={listLoading}
                  startIcon={listLoading ? <CircularProgress size={20} /> : <PlaylistAddCheckIcon />}
                  sx={{ minWidth: 180, flexShrink: 0 }}
                >
                  {listLoading ? t('common:loading') : t('common:search')}
                </Button>
              </Stack>
            </CardContent>
          </Card>

          {listLoading ? (
            <LinearProgress />
          ) : (
            <TableContainer component={Card} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Picklist No.</TableCell>
                    <TableCell>Station</TableCell>
                    <TableCell>{t('common:status')}</TableCell>
                    <TableCell align="right">{t('common:actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPicklists.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography color="text.secondary" py={3}>
                          {t('common:noData')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPicklists.map((pl) => {
                      const id = getPicklistId(pl);
                      return (
                        <TableRow key={id} hover>
                          <TableCell>
                            <Typography fontWeight={600}>{id}</Typography>
                            {pl.PicklistDate && (
                              <Typography variant="caption" color="text.secondary">
                                {pl.PicklistDate}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {String(pl.Station ?? pl.Machine ?? pl.MachineName ?? '—')}
                          </TableCell>
                          <TableCell>
                            <Chip label={String(pl.Status ?? 'Open')} size="small" color="primary" />
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              variant="outlined"
                              size="medium"
                              disabled={detailLoading}
                              onClick={() => void loadPicklistDetail(pl)}
                            >
                              {t('common:next')}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Stack>
      )}

      {activeStep === 1 && selectedPicklist && (
        <Stack spacing={3}>
          <Card variant="outlined">
            <CardContent>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', md: 'center' }}
                spacing={2}
              >
                <Stack spacing={0.5}>
                  <Typography variant="h5" fontWeight={700}>
                    {picklistId}
                  </Typography>
                  <Typography color="text.secondary">
                    {String(selectedPicklist.Station ?? selectedPicklist.MachineName ?? '')}
                  </Typography>
                </Stack>
                <Stack spacing={1} sx={{ width: { xs: '100%', md: 280 } }}>
                  <Typography variant="body2" color="text.secondary">
                    {pickProgress}% {t('common:finish').toLowerCase()}
                  </Typography>
                  <LinearProgress variant="determinate" value={pickProgress} sx={{ height: 8, borderRadius: 4 }} />
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <QrCodeScannerIcon color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  {t('common:scanBarcode')}
                </Typography>
              </Stack>
              <ScanInput
                label="PUID"
                placeholder={t('common:barcode')}
                onScan={handleScan}
                disabled={issueLoading}
              />
            </CardContent>
          </Card>

          <TableContainer component={Card} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('common:partNumber')}</TableCell>
                  <TableCell>{t('common:description')}</TableCell>
                  <TableCell align="right">{t('common:quantity')}</TableCell>
                  <TableCell align="right">Picked</TableCell>
                  <TableCell>{t('common:status')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography color="text.secondary" py={3}>
                        {t('common:noData')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  lines.map((line, idx) => {
                    const required = getLineQtyRequired(line);
                    const picked = getLineQtyPicked(line);
                    const complete = picked >= required && required > 0;
                    return (
                      <TableRow
                        key={`${line.LineNo ?? idx}-${getLinePartNo(line)}`}
                        sx={{ bgcolor: complete ? 'success.light' : undefined }}
                      >
                        <TableCell>
                          <Typography fontWeight={600}>{getLinePartNo(line)}</Typography>
                        </TableCell>
                        <TableCell>{line.Description ?? line.IM ?? '—'}</TableCell>
                        <TableCell align="right">{required}</TableCell>
                        <TableCell align="right">{picked}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={complete ? t('common:yes') : t('common:no')}
                            color={complete ? 'success' : 'warning'}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Stack direction="row" spacing={2} justifyContent="space-between">
            <Button variant="outlined" onClick={() => setActiveStep(0)}>
              {t('common:back')}
            </Button>
            <Button
              variant="contained"
              color="secondary"
              disabled={closeLoading || !allLinesComplete}
              onClick={() => void handleClosePicklist()}
            >
              {closeLoading ? t('common:loading') : t('common:finish')}
            </Button>
          </Stack>
        </Stack>
      )}

      {activeStep === 2 && (
        <Card variant="outlined" sx={{ textAlign: 'center', py: 6 }}>
          <CardContent>
            <CheckCircleIcon sx={{ fontSize: 72, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" fontWeight={700} gutterBottom>
              {t('pickComplete')}
            </Typography>
            <Typography color="text.secondary" mb={4}>
              {picklistId} — {successMsg ?? t('common:success')}
            </Typography>
            <Button variant="contained" size="large" onClick={handleReset}>
              {t('picklistSearch')}
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('confirmReceive')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography>
              {t('common:barcode')}: <strong>{scannedPuid}</strong>
            </Typography>
            <TextField
              label={t('common:quantity')}
              type="number"
              value={confirmQty}
              onChange={(e) => setConfirmQty(e.target.value)}
              inputProps={{ min: 1 }}
              fullWidth
              autoFocus
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => {
              setConfirmOpen(false);
              setScannedPuid('');
            }}
            disabled={issueLoading}
          >
            {t('common:cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleIssueConfirm()}
            disabled={issueLoading || !confirmQty}
          >
            {issueLoading ? t('common:loading') : t('common:confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
