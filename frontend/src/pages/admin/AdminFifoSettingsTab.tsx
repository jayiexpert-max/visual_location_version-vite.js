import SaveIcon from '@mui/icons-material/Save';
import {
  Alert,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getErrorMessage } from '../../services/apiClient';
import * as warehouseService from '../../services/warehouseService';
import type { FifoSettings } from '../../types/adminProducts';

interface AdminFifoSettingsTabProps {
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function AdminFifoSettingsTab({ onSuccess, onError }: AdminFifoSettingsTabProps) {
  const { t } = useTranslation(['pages', 'common']);

  const [settings, setSettings] = useState<FifoSettings | null>(null);
  const [fifoIssueMode, setFifoIssueMode] = useState('expiration_date');
  const [fifoDummyIm, setFifoDummyIm] = useState('DUMMYBATCH');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const data = await warehouseService.adminGetFifoSettings();
      setSettings(data);
      setFifoIssueMode(data.fifoIssueMode);
      setFifoDummyIm(data.fifoDummyIm);
    } catch (err) {
      onError(getErrorMessage(err, t('common:error'), t));
    }
  }, [onError, t]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const saveSettings = async () => {
    if (!confirmPassword.trim()) {
      onError(t('pages:fifoSettingsPasswordRequired'));
      return;
    }

    setSaving(true);
    try {
      const data = await warehouseService.adminUpdateFifoSettings({
        fifoIssueMode,
        fifoDummyIm: fifoDummyIm.trim().toUpperCase(),
        confirmPassword,
      });
      setSettings(data);
      setConfirmPassword('');
      onSuccess(t('common:success'));
    } catch (err) {
      onError(getErrorMessage(err, t('common:error'), t));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {t('pages:fifoSettingsTitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t('pages:fifoSettingsDesc')}
        </Typography>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'flex-end' }}>
          <FormControl size="small" sx={{ minWidth: 240 }}>
            <InputLabel>{t('pages:fifoSettingsMode')}</InputLabel>
            <Select
              label={t('pages:fifoSettingsMode')}
              value={fifoIssueMode}
              onChange={(e) => setFifoIssueMode(e.target.value)}
            >
              <MenuItem value="expiration_date">{t('pages:fifoSettingsModeExpiration')}</MenuItem>
              <MenuItem value="im_batch">{t('pages:fifoSettingsModeImBatch')}</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label={t('pages:fifoSettingsDummyIm')}
            value={fifoDummyIm}
            onChange={(e) => setFifoDummyIm(e.target.value.toUpperCase())}
            size="small"
            sx={{ minWidth: 200 }}
            inputProps={{ style: { textTransform: 'uppercase' } }}
          />

          <TextField
            label={t('pages:fifoSettingsConfirmPassword')}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
            autoComplete="new-password"
          />

          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={() => void saveSettings()}
            disabled={saving}
          >
            {t('pages:fifoSettingsSave')}
          </Button>
        </Stack>

        {settings && (
          <Alert severity="info" sx={{ mt: 3 }}>
            {t('pages:fifoSettingsCurrent')}: <strong>{settings.fifoIssueModeLabel}</strong>
            {' · '}
            Dummy: <strong>{settings.fifoDummyIm}</strong>
            {settings.updatedAt && (
              <>
                {' · '}
                {t('pages:fifoSettingsUpdated')} {new Date(settings.updatedAt).toLocaleString()}
                {settings.updatedByUsername ? ` (${settings.updatedByUsername})` : ''}
              </>
            )}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
