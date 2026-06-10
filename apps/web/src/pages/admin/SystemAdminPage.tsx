import AddIcon from '@mui/icons-material/Add';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import SettingsInputComponentIcon from '@mui/icons-material/SettingsInputComponent';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import type { SupportedLanguage } from '@visual-location/shared';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { PageHeader } from '../../components/layout/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { getErrorMessage } from '../../services/apiClient';
import * as healthService from '../../services/healthService';
import * as ioService from '../../services/ioService';
import * as warehouseService from '../../services/warehouseService';
import type { EthernetIoDevice, WarehouseHierarchy } from '../../types/warehouse';

type AdminTab =
  | 'locationMapping'
  | 'rackConfig'
  | 'mqttSettings'
  | 'raspberrySettings'
  | 'outputMapping'
  | 'languageSettings'
  | 'systemSettings';

type RackEntity = 'racks' | 'levels' | 'boxes' | 'slots';

interface AdminRecord {
  id: number;
  [key: string]: unknown;
}

interface EntityFormState {
  name: string;
  locationDesc: string;
  remark: string;
  rackId: string;
  levelNo: string;
  levelId: string;
  boxCode: string;
  positionInLevel: string;
  layout: string;
  boxId: string;
  slotNo: string;
  ioDeviceId: string;
  ioRedPin: string;
  ioYellowPin: string;
  ioGreenPin: string;
  ioBuzzerPin: string;
  ioOutputPin: string;
}

const emptyEntityForm = (): EntityFormState => ({
  name: '',
  locationDesc: '',
  remark: '',
  rackId: '',
  levelNo: '',
  levelId: '',
  boxCode: '',
  positionInLevel: '',
  layout: '2x5',
  boxId: '',
  slotNo: '',
  ioDeviceId: '',
  ioRedPin: '',
  ioYellowPin: '',
  ioGreenPin: '',
  ioBuzzerPin: '',
  ioOutputPin: '',
});

interface IoFormState {
  name: string;
  ipAddress: string;
  port: string;
  controllerType: string;
  urlFormat: string;
  remark: string;
}

const emptyIoForm = (): IoFormState => ({
  name: '',
  ipAddress: '',
  port: '80',
  controllerType: 'http',
  urlFormat: 'http://{IP}:{PORT}/relay.cgi?relay={PIN}&state={STATE}',
  remark: '',
});

function parseOptionalInt(value: string): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function HierarchyTree({
  hierarchy,
  onSelectBox,
}: {
  hierarchy: WarehouseHierarchy;
  onSelectBox: (boxId: number, label: string) => void;
}) {
  return (
    <Box>
      {hierarchy.racks.map((rack) => (
        <Accordion key={rack.id} disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={600}>{rack.name}</Typography>
            {rack.locationDesc && (
              <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                — {rack.locationDesc}
              </Typography>
            )}
          </AccordionSummary>
          <AccordionDetails sx={{ pl: 1 }}>
            {rack.levels.map((level) => (
              <Accordion key={level.id} disableGutters sx={{ boxShadow: 'none' }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>
                    Level {level.levelNo} ({level.boxes.length} boxes)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ pl: 0 }}>
                  <List dense disablePadding>
                    {level.boxes.map((box) => (
                      <ListItemButton
                        key={box.id}
                        onClick={() => onSelectBox(box.id, `${rack.name} / L${level.levelNo} / ${box.boxCode}`)}
                      >
                        <ListItemText
                          primary={box.boxCode}
                          secondary={`${box.layout} · ${box.slots.filter((s) => s.product).length}/${box.slots.length} occupied`}
                        />
                        <ChevronRightIcon fontSize="small" color="action" />
                      </ListItemButton>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            ))}
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}

export function SystemAdminPage() {
  const { t } = useTranslation(['pages', 'common']);
  const { hasRole, user, changeLanguage } = useAuth();

  const [tab, setTab] = useState<AdminTab>('locationMapping');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [hierarchy, setHierarchy] = useState<WarehouseHierarchy | null>(null);
  const [selectedBoxLabel, setSelectedBoxLabel] = useState<string | null>(null);

  const [rackEntity, setRackEntity] = useState<RackEntity>('racks');
  const [entityRows, setEntityRows] = useState<AdminRecord[]>([]);
  const [entityLoading, setEntityLoading] = useState(false);
  const [entityDialogOpen, setEntityDialogOpen] = useState(false);
  const [entityForm, setEntityForm] = useState<EntityFormState>(emptyEntityForm());
  const [editingEntity, setEditingEntity] = useState<AdminRecord | null>(null);
  const [entitySaving, setEntitySaving] = useState(false);
  const [entityDeleteTarget, setEntityDeleteTarget] = useState<AdminRecord | null>(null);

  const [ioDevices, setIoDevices] = useState<EthernetIoDevice[]>([]);
  const [ioLoading, setIoLoading] = useState(false);
  const [ioDialogOpen, setIoDialogOpen] = useState(false);
  const [ioForm, setIoForm] = useState<IoFormState>(emptyIoForm());
  const [editingIo, setEditingIo] = useState<EthernetIoDevice | null>(null);
  const [ioSaving, setIoSaving] = useState(false);
  const [ioDeleteTarget, setIoDeleteTarget] = useState<EthernetIoDevice | null>(null);

  const [healthLoading, setHealthLoading] = useState(false);
  const [appHealth, setAppHealth] = useState<{ status: string; timestamp?: string; mqttConnected?: boolean } | null>(null);
  const [cpkHealth, setCpkHealth] = useState<{ status: string; version?: string; latencyMs?: number; message?: string; data?: unknown } | null>(null);
  const [pdsHealth, setPdsHealth] = useState<{ status: string; latencyMs?: number; httpCode?: number; message?: string } | null>(null);
  const [ioResetLoading, setIoResetLoading] = useState(false);
  const [language, setLanguage] = useState<SupportedLanguage>(user?.lang ?? 'th');
  const [languageSaving, setLanguageSaving] = useState(false);

  const loadHierarchy = useCallback(async () => {
    try {
      const data = await warehouseService.getHierarchy();
      setHierarchy(data);
    } catch (err) {
      setError(getErrorMessage(err, t('common:error')));
    }
  }, [t]);

  const loadEntityRows = useCallback(async () => {
    setEntityLoading(true);
    setError(null);
    try {
      let rows: unknown[];
      switch (rackEntity) {
        case 'racks':
          rows = await warehouseService.adminListRacks();
          break;
        case 'levels':
          rows = await warehouseService.adminListLevels();
          break;
        case 'boxes':
          rows = await warehouseService.adminListBoxes();
          break;
        case 'slots':
          rows = await warehouseService.adminListSlots();
          break;
      }
      setEntityRows((rows as AdminRecord[]).map((row) => ({ ...row, id: row.id })));
    } catch (err) {
      setError(getErrorMessage(err, t('common:error')));
      setEntityRows([]);
    } finally {
      setEntityLoading(false);
    }
  }, [rackEntity, t]);

  const loadIoDevices = useCallback(async () => {
    setIoLoading(true);
    setError(null);
    try {
      const devices = await warehouseService.listIoDevices();
      setIoDevices(devices);
    } catch (err) {
      setError(getErrorMessage(err, t('common:error')));
      setIoDevices([]);
    } finally {
      setIoLoading(false);
    }
  }, [t]);

  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    setError(null);
    try {
      const [app, cpk, pds] = await Promise.all([
        healthService.getHealth(),
        healthService.getCpkHealth(),
        healthService.getPdserviceHealth(),
      ]);
      setAppHealth(app as typeof appHealth);
      setCpkHealth(cpk as typeof cpkHealth);
      setPdsHealth(pds as typeof pdsHealth);
    } catch (err) {
      setError(getErrorMessage(err, t('common:error')));
    } finally {
      setHealthLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadHierarchy();
  }, [loadHierarchy]);

  useEffect(() => {
    if (tab === 'rackConfig') {
      void loadEntityRows();
    }
  }, [tab, rackEntity, loadEntityRows]);

  useEffect(() => {
    if (tab === 'outputMapping') {
      void loadIoDevices();
    }
  }, [tab, loadIoDevices]);

  useEffect(() => {
    if (tab === 'raspberrySettings' || tab === 'systemSettings') {
      void loadHealth();
    }
  }, [tab, loadHealth]);

  useEffect(() => {
    if (user?.lang) setLanguage(user.lang);
  }, [user?.lang]);

  const entityColumns = useMemo((): GridColDef[] => {
    switch (rackEntity) {
      case 'racks':
        return [
          { field: 'id', headerName: 'ID', width: 70 },
          { field: 'name', headerName: 'Name', flex: 1, minWidth: 120 },
          { field: 'locationDesc', headerName: 'Location', flex: 1, minWidth: 160 },
          { field: 'ioDeviceId', headerName: 'IO Device', width: 100 },
        ];
      case 'levels':
        return [
          { field: 'id', headerName: 'ID', width: 70 },
          { field: 'rackId', headerName: 'Rack ID', width: 100 },
          { field: 'levelNo', headerName: 'Level No', width: 100 },
          { field: 'remark', headerName: 'Remark', flex: 1, minWidth: 160 },
        ];
      case 'boxes':
        return [
          { field: 'id', headerName: 'ID', width: 70 },
          { field: 'levelId', headerName: 'Level ID', width: 100 },
          { field: 'boxCode', headerName: 'Box Code', width: 120 },
          { field: 'layout', headerName: 'Layout', width: 90 },
          { field: 'positionInLevel', headerName: 'Position', width: 100 },
          { field: 'ioOutputPin', headerName: 'IO Pin', width: 90 },
        ];
      case 'slots':
        return [
          { field: 'id', headerName: 'ID', width: 70 },
          { field: 'boxId', headerName: 'Box ID', width: 100 },
          { field: 'slotNo', headerName: 'Slot No', width: 100 },
          { field: 'remark', headerName: 'Remark', flex: 1, minWidth: 160 },
        ];
    }
  }, [rackEntity]);

  const entityActionColumn: GridColDef = {
    field: 'actions',
    headerName: t('common:actions'),
    width: 120,
    sortable: false,
    filterable: false,
    renderCell: ({ row }) => (
      <Stack direction="row" spacing={0.5}>
        <IconButton size="small" onClick={() => openEntityEdit(row as AdminRecord)}>
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" color="error" onClick={() => setEntityDeleteTarget(row as AdminRecord)}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Stack>
    ),
  };

  const openEntityCreate = () => {
    setEditingEntity(null);
    setEntityForm(emptyEntityForm());
    setEntityDialogOpen(true);
  };

  const openEntityEdit = (row: AdminRecord) => {
    setEditingEntity(row);
    setEntityForm({
      ...emptyEntityForm(),
      name: String(row.name ?? ''),
      locationDesc: String(row.locationDesc ?? ''),
      remark: String(row.remark ?? ''),
      rackId: String(row.rackId ?? ''),
      levelNo: String(row.levelNo ?? ''),
      levelId: String(row.levelId ?? ''),
      boxCode: String(row.boxCode ?? ''),
      positionInLevel: String(row.positionInLevel ?? ''),
      layout: String(row.layout ?? '2x5'),
      boxId: String(row.boxId ?? ''),
      slotNo: String(row.slotNo ?? ''),
      ioDeviceId: String(row.ioDeviceId ?? ''),
      ioRedPin: String(row.ioRedPin ?? ''),
      ioYellowPin: String(row.ioYellowPin ?? ''),
      ioGreenPin: String(row.ioGreenPin ?? ''),
      ioBuzzerPin: String(row.ioBuzzerPin ?? ''),
      ioOutputPin: String(row.ioOutputPin ?? ''),
    });
    setEntityDialogOpen(true);
  };

  const saveEntity = async () => {
    setEntitySaving(true);
    setError(null);
    try {
      let payload: Record<string, unknown> = {};
      switch (rackEntity) {
        case 'racks':
          payload = {
            name: entityForm.name.trim() || undefined,
            locationDesc: entityForm.locationDesc.trim() || undefined,
            remark: entityForm.remark.trim() || undefined,
            ioDeviceId: parseOptionalInt(entityForm.ioDeviceId),
            ioRedPin: parseOptionalInt(entityForm.ioRedPin),
            ioYellowPin: parseOptionalInt(entityForm.ioYellowPin),
            ioGreenPin: parseOptionalInt(entityForm.ioGreenPin),
            ioBuzzerPin: parseOptionalInt(entityForm.ioBuzzerPin),
          };
          break;
        case 'levels':
          payload = {
            rackId: parseOptionalInt(entityForm.rackId),
            levelNo: parseOptionalInt(entityForm.levelNo),
            remark: entityForm.remark.trim() || undefined,
          };
          break;
        case 'boxes':
          payload = {
            levelId: parseOptionalInt(entityForm.levelId),
            boxCode: entityForm.boxCode.trim() || undefined,
            positionInLevel: parseOptionalInt(entityForm.positionInLevel),
            layout: entityForm.layout.trim() || undefined,
            remark: entityForm.remark.trim() || undefined,
            ioDeviceId: parseOptionalInt(entityForm.ioDeviceId),
            ioOutputPin: parseOptionalInt(entityForm.ioOutputPin),
          };
          break;
        case 'slots':
          payload = {
            boxId: parseOptionalInt(entityForm.boxId),
            slotNo: parseOptionalInt(entityForm.slotNo),
            remark: entityForm.remark.trim() || undefined,
          };
          break;
      }

      if (editingEntity) {
        switch (rackEntity) {
          case 'racks':
            await warehouseService.adminUpdateRack(editingEntity.id, payload);
            break;
          case 'levels':
            await warehouseService.adminUpdateLevel(editingEntity.id, payload);
            break;
          case 'boxes':
            await warehouseService.adminUpdateBox(editingEntity.id, payload);
            break;
          case 'slots':
            await warehouseService.adminUpdateSlot(editingEntity.id, payload);
            break;
        }
      } else {
        switch (rackEntity) {
          case 'racks':
            await warehouseService.adminCreateRack(payload);
            break;
          case 'levels':
            await warehouseService.adminCreateLevel(payload);
            break;
          case 'boxes':
            await warehouseService.adminCreateBox(payload);
            break;
          case 'slots':
            await warehouseService.adminCreateSlot(payload);
            break;
        }
      }

      setEntityDialogOpen(false);
      setSuccess(t('common:success'));
      await loadEntityRows();
      await loadHierarchy();
    } catch (err) {
      setError(getErrorMessage(err, t('common:error')));
    } finally {
      setEntitySaving(false);
    }
  };

  const deleteEntity = async () => {
    if (!entityDeleteTarget) return;
    setEntitySaving(true);
    try {
      switch (rackEntity) {
        case 'racks':
          await warehouseService.adminDeleteRack(entityDeleteTarget.id);
          break;
        case 'levels':
          await warehouseService.adminDeleteLevel(entityDeleteTarget.id);
          break;
        case 'boxes':
          await warehouseService.adminDeleteBox(entityDeleteTarget.id);
          break;
        case 'slots':
          await warehouseService.adminDeleteSlot(entityDeleteTarget.id);
          break;
      }
      setEntityDeleteTarget(null);
      setSuccess(t('common:success'));
      await loadEntityRows();
      await loadHierarchy();
    } catch (err) {
      setError(getErrorMessage(err, t('common:error')));
    } finally {
      setEntitySaving(false);
    }
  };

  const openIoCreate = () => {
    setEditingIo(null);
    setIoForm(emptyIoForm());
    setIoDialogOpen(true);
  };

  const openIoEdit = (device: EthernetIoDevice) => {
    setEditingIo(device);
    setIoForm({
      name: device.name,
      ipAddress: device.ipAddress,
      port: String(device.port),
      controllerType: device.controllerType,
      urlFormat: device.urlFormat,
      remark: device.remark ?? '',
    });
    setIoDialogOpen(true);
  };

  const saveIo = async () => {
    setIoSaving(true);
    setError(null);
    try {
      const payload = {
        name: ioForm.name.trim(),
        ipAddress: ioForm.ipAddress.trim(),
        port: parseOptionalInt(ioForm.port) ?? 80,
        controllerType: ioForm.controllerType.trim() || 'http',
        urlFormat: ioForm.urlFormat.trim(),
        remark: ioForm.remark.trim() || undefined,
      };

      if (editingIo) {
        await warehouseService.updateIoDevice(editingIo.id, payload);
      } else {
        await warehouseService.createIoDevice(payload);
      }

      setIoDialogOpen(false);
      setSuccess(t('common:success'));
      await loadIoDevices();
    } catch (err) {
      setError(getErrorMessage(err, t('common:error')));
    } finally {
      setIoSaving(false);
    }
  };

  const deleteIo = async () => {
    if (!ioDeleteTarget) return;
    setIoSaving(true);
    try {
      await warehouseService.deleteIoDevice(ioDeleteTarget.id);
      setIoDeleteTarget(null);
      setSuccess(t('common:success'));
      await loadIoDevices();
    } catch (err) {
      setError(getErrorMessage(err, t('common:error')));
    } finally {
      setIoSaving(false);
    }
  };

  const handleIoReset = async () => {
    setIoResetLoading(true);
    setError(null);
    try {
      await ioService.ioReset();
      setSuccess(t('common:success'));
    } catch (err) {
      setError(getErrorMessage(err, t('common:error')));
    } finally {
      setIoResetLoading(false);
    }
  };

  const handleLanguageSave = async () => {
    setLanguageSaving(true);
    setError(null);
    try {
      await changeLanguage(language);
      setSuccess(t('common:success'));
    } catch (err) {
      setError(getErrorMessage(err, t('common:error')));
    } finally {
      setLanguageSaving(false);
    }
  };

  const ioColumns: GridColDef<EthernetIoDevice>[] = [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 140 },
    { field: 'ipAddress', headerName: 'IP Address', width: 140 },
    { field: 'port', headerName: 'Port', width: 90 },
    { field: 'controllerType', headerName: 'Controller', width: 120 },
    { field: 'urlFormat', headerName: 'URL Format', flex: 1.5, minWidth: 220 },
    {
      field: 'actions',
      headerName: t('common:actions'),
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5}>
          <IconButton size="small" onClick={() => openIoEdit(row)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" color="error" onClick={() => setIoDeleteTarget(row)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      ),
    },
  ];

  const tabLabels: Record<AdminTab, string> = {
    locationMapping: t('pages:locationMapping'),
    rackConfig: t('pages:rackConfig'),
    mqttSettings: t('pages:mqttSettings'),
    raspberrySettings: t('pages:raspberrySettings'),
    outputMapping: t('pages:outputMapping'),
    languageSettings: t('pages:languageSettings'),
    systemSettings: t('pages:systemSettings'),
  };

  const mqttEnvItems = [
    { label: 'API Base URL', value: import.meta.env.VITE_API_BASE_URL ?? '/api/v1' },
    { label: 'Socket URL', value: import.meta.env.VITE_SOCKET_URL ?? '(same origin)' },
    { label: 'App Name', value: import.meta.env.VITE_APP_NAME ?? 'Visual Location Management' },
    { label: 'MQTT Broker (server-side)', value: 'Configured via MQTT_BROKER_URL on API server' },
    { label: 'MQTT Client ID (server-side)', value: 'Configured via MQTT_CLIENT_ID on API server' },
    { label: 'MQTT Topic Prefix (server-side)', value: 'Configured via MQTT_IO_TOPIC_PREFIX on API server' },
  ];

  const renderEntityFields = () => {
    switch (rackEntity) {
      case 'racks':
        return (
          <>
            <TextField label="Name" value={entityForm.name} onChange={(e) => setEntityForm((p) => ({ ...p, name: e.target.value }))} fullWidth />
            <TextField label="Location Description" value={entityForm.locationDesc} onChange={(e) => setEntityForm((p) => ({ ...p, locationDesc: e.target.value }))} fullWidth />
            <TextField label="Remark" value={entityForm.remark} onChange={(e) => setEntityForm((p) => ({ ...p, remark: e.target.value }))} fullWidth />
            <Stack direction="row" spacing={2}>
              <TextField label="IO Device ID" value={entityForm.ioDeviceId} onChange={(e) => setEntityForm((p) => ({ ...p, ioDeviceId: e.target.value }))} fullWidth />
              <TextField label="Red Pin" value={entityForm.ioRedPin} onChange={(e) => setEntityForm((p) => ({ ...p, ioRedPin: e.target.value }))} fullWidth />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="Yellow Pin" value={entityForm.ioYellowPin} onChange={(e) => setEntityForm((p) => ({ ...p, ioYellowPin: e.target.value }))} fullWidth />
              <TextField label="Green Pin" value={entityForm.ioGreenPin} onChange={(e) => setEntityForm((p) => ({ ...p, ioGreenPin: e.target.value }))} fullWidth />
              <TextField label="Buzzer Pin" value={entityForm.ioBuzzerPin} onChange={(e) => setEntityForm((p) => ({ ...p, ioBuzzerPin: e.target.value }))} fullWidth />
            </Stack>
          </>
        );
      case 'levels':
        return (
          <>
            <TextField label="Rack ID" value={entityForm.rackId} onChange={(e) => setEntityForm((p) => ({ ...p, rackId: e.target.value }))} required fullWidth />
            <TextField label="Level No" value={entityForm.levelNo} onChange={(e) => setEntityForm((p) => ({ ...p, levelNo: e.target.value }))} required fullWidth />
            <TextField label="Remark" value={entityForm.remark} onChange={(e) => setEntityForm((p) => ({ ...p, remark: e.target.value }))} fullWidth />
          </>
        );
      case 'boxes':
        return (
          <>
            <TextField label="Level ID" value={entityForm.levelId} onChange={(e) => setEntityForm((p) => ({ ...p, levelId: e.target.value }))} required fullWidth />
            <Stack direction="row" spacing={2}>
              <TextField label="Box Code" value={entityForm.boxCode} onChange={(e) => setEntityForm((p) => ({ ...p, boxCode: e.target.value }))} fullWidth />
              <TextField label="Layout (NxM)" value={entityForm.layout} onChange={(e) => setEntityForm((p) => ({ ...p, layout: e.target.value }))} fullWidth />
              <TextField label="Position" value={entityForm.positionInLevel} onChange={(e) => setEntityForm((p) => ({ ...p, positionInLevel: e.target.value }))} fullWidth />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="IO Device ID" value={entityForm.ioDeviceId} onChange={(e) => setEntityForm((p) => ({ ...p, ioDeviceId: e.target.value }))} fullWidth />
              <TextField label="IO Output Pin" value={entityForm.ioOutputPin} onChange={(e) => setEntityForm((p) => ({ ...p, ioOutputPin: e.target.value }))} fullWidth />
            </Stack>
            <TextField label="Remark" value={entityForm.remark} onChange={(e) => setEntityForm((p) => ({ ...p, remark: e.target.value }))} fullWidth />
          </>
        );
      case 'slots':
        return (
          <>
            <TextField label="Box ID" value={entityForm.boxId} onChange={(e) => setEntityForm((p) => ({ ...p, boxId: e.target.value }))} required fullWidth />
            <TextField label="Slot No" value={entityForm.slotNo} onChange={(e) => setEntityForm((p) => ({ ...p, slotNo: e.target.value }))} required fullWidth />
            <TextField label="Remark" value={entityForm.remark} onChange={(e) => setEntityForm((p) => ({ ...p, remark: e.target.value }))} fullWidth />
          </>
        );
    }
  };

  if (!hasRole('admin')) {
    return <Navigate to="/app" replace />;
  }

  return (
    <Box>
      <PageHeader title={t('pages:adminTitle')} />

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

      <Tabs
        value={tab}
        onChange={(_, value: AdminTab) => setTab(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        {(Object.keys(tabLabels) as AdminTab[]).map((key) => (
          <Tab key={key} label={tabLabels[key]} value={key} />
        ))}
      </Tabs>

      {tab === 'locationMapping' && (
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              Browse warehouse hierarchy. Select a box to jump to rack configuration.
            </Typography>
            <Button variant="outlined" onClick={() => setTab('rackConfig')}>
              {t('pages:rackConfig')}
            </Button>
            <Button startIcon={<RefreshIcon />} onClick={() => void loadHierarchy()}>
              {t('common:refresh')}
            </Button>
          </Stack>
          {selectedBoxLabel && (
            <Alert severity="info">
              Selected: {selectedBoxLabel}. Open Rack Configuration to edit boxes and slots.
            </Alert>
          )}
          {hierarchy ? (
            <HierarchyTree
              hierarchy={hierarchy}
              onSelectBox={(_boxId, label) => {
                setSelectedBoxLabel(label);
                setTab('rackConfig');
                setRackEntity('boxes');
              }}
            />
          ) : (
            <Typography color="text.secondary">{t('common:loading')}</Typography>
          )}
        </Stack>
      )}

      {tab === 'rackConfig' && (
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Entity</InputLabel>
              <Select label="Entity" value={rackEntity} onChange={(e) => setRackEntity(e.target.value as RackEntity)}>
                <MenuItem value="racks">Racks</MenuItem>
                <MenuItem value="levels">Levels</MenuItem>
                <MenuItem value="boxes">Boxes</MenuItem>
                <MenuItem value="slots">Slots</MenuItem>
              </Select>
            </FormControl>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openEntityCreate}>
              {t('common:create')}
            </Button>
            <Button startIcon={<RefreshIcon />} onClick={() => void loadEntityRows()}>
              {t('common:refresh')}
            </Button>
          </Stack>
          <DataGrid
            autoHeight
            rows={entityRows}
            columns={[...entityColumns, entityActionColumn]}
            loading={entityLoading}
            disableRowSelectionOnClick
            pageSizeOptions={[10, 20, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 20 } } }}
            sx={{ bgcolor: 'background.paper', borderRadius: 2 }}
          />
        </Stack>
      )}

      {tab === 'mqttSettings' && (
        <Stack spacing={2}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('pages:mqttSettings')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                MQTT broker credentials are configured on the API server environment. The web app connects through REST and Socket.IO.
              </Typography>
              <Stack spacing={1.5}>
                {mqttEnvItems.map((item) => (
                  <Stack key={item.label} direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <Typography sx={{ minWidth: 240 }} fontWeight={600}>
                      {item.label}
                    </Typography>
                    <Typography color="text.secondary">{item.value}</Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
          <Box>
            <Button
              variant="contained"
              startIcon={<SettingsInputComponentIcon />}
              onClick={() => void handleIoReset()}
              disabled={ioResetLoading}
            >
              Test IO Reset (MQTT)
            </Button>
          </Box>
        </Stack>
      )}

      {tab === 'raspberrySettings' && (
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h6">{t('pages:raspberrySettings')}</Typography>
            <Button size="small" startIcon={<RefreshIcon />} onClick={() => void loadHealth()} disabled={healthLoading}>
              {t('common:refresh')}
            </Button>
          </Stack>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography fontWeight={600}>{t('pages:mqttStatus')}</Typography>
                  <Chip
                    size="small"
                    color={appHealth?.mqttConnected ? 'success' : 'error'}
                    label={appHealth?.mqttConnected ? t('common:online') : t('common:offline')}
                  />
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography fontWeight={600}>{t('pages:raspberryStatus')}</Typography>
                  <Chip
                    size="small"
                    color={appHealth?.status === 'ok' ? 'success' : 'warning'}
                    label={appHealth?.status === 'ok' ? t('common:online') : t('common:unknown')}
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  API health timestamp: {appHealth?.timestamp ?? '—'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Raspberry Pi IO bridge health is inferred from API connectivity and MQTT broker status reported by the backend.
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      )}

      {tab === 'outputMapping' && (
        <Stack spacing={2}>
          <Stack direction="row" spacing={2}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openIoCreate}>
              {t('common:create')}
            </Button>
            <Button startIcon={<RefreshIcon />} onClick={() => void loadIoDevices()}>
              {t('common:refresh')}
            </Button>
          </Stack>
          <DataGrid
            autoHeight
            rows={ioDevices}
            columns={ioColumns}
            loading={ioLoading}
            disableRowSelectionOnClick
            pageSizeOptions={[10, 20, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 20 } } }}
            sx={{ bgcolor: 'background.paper', borderRadius: 2 }}
          />
        </Stack>
      )}

      {tab === 'languageSettings' && (
        <Card sx={{ maxWidth: 480 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t('pages:languageSettings')}
            </Typography>
            <FormControl component="fieldset">
              <RadioGroup value={language} onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}>
                <FormControlLabel value="th" control={<Radio />} label={t('common:thai')} />
                <FormControlLabel value="en" control={<Radio />} label={t('common:english')} />
              </RadioGroup>
            </FormControl>
            <Box sx={{ mt: 2 }}>
              <Button variant="contained" onClick={() => void handleLanguageSave()} disabled={languageSaving}>
                {languageSaving ? t('common:loading') : t('common:save')}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {tab === 'systemSettings' && (
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h6">{t('pages:systemSettings')}</Typography>
            <Button size="small" startIcon={<RefreshIcon />} onClick={() => void loadHealth()} disabled={healthLoading}>
              {t('common:refresh')}
            </Button>
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Typography fontWeight={700}>CPK Service</Typography>
                  <Chip size="small" color={cpkHealth?.status === 'ok' ? 'success' : 'error'} label={cpkHealth?.status ?? '—'} />
                </Stack>
                <Typography variant="body2">Latency: {cpkHealth?.latencyMs ?? '—'} ms</Typography>
                <Typography variant="body2">
                  Version:{' '}
                  {typeof cpkHealth?.data === 'object' && cpkHealth?.data && 'Version' in (cpkHealth.data as object)
                    ? String((cpkHealth.data as { Version?: string }).Version)
                    : cpkHealth?.version ?? '—'}
                </Typography>
                {cpkHealth?.message && (
                  <Typography variant="body2" color="error">
                    {cpkHealth.message}
                  </Typography>
                )}
              </CardContent>
            </Card>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Typography fontWeight={700}>PDService</Typography>
                  <Chip size="small" color={pdsHealth?.status === 'ok' ? 'success' : 'error'} label={pdsHealth?.status ?? '—'} />
                </Stack>
                <Typography variant="body2">Latency: {pdsHealth?.latencyMs ?? '—'} ms</Typography>
                <Typography variant="body2">HTTP Code: {pdsHealth?.httpCode ?? '—'}</Typography>
                {pdsHealth?.message && (
                  <Typography variant="body2" color="error">
                    {pdsHealth.message}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Stack>
        </Stack>
      )}

      <Dialog open={entityDialogOpen} onClose={() => setEntityDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingEntity ? t('common:edit') : t('common:create')} {rackEntity}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {renderEntityFields()}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEntityDialogOpen(false)} disabled={entitySaving}>
            {t('common:cancel')}
          </Button>
          <Button variant="contained" onClick={() => void saveEntity()} disabled={entitySaving}>
            {entitySaving ? t('common:loading') : t('common:save')}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(entityDeleteTarget)}
        title={t('common:delete')}
        message={`Delete ${rackEntity} #${entityDeleteTarget?.id ?? ''}?`}
        confirmLabel={t('common:delete')}
        loading={entitySaving}
        onConfirm={() => void deleteEntity()}
        onCancel={() => setEntityDeleteTarget(null)}
      />

      <Dialog open={ioDialogOpen} onClose={() => setIoDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingIo ? t('common:edit') : t('common:create')} IO Device</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Name" value={ioForm.name} onChange={(e) => setIoForm((p) => ({ ...p, name: e.target.value }))} required fullWidth />
            <TextField label="IP Address" value={ioForm.ipAddress} onChange={(e) => setIoForm((p) => ({ ...p, ipAddress: e.target.value }))} required fullWidth />
            <Stack direction="row" spacing={2}>
              <TextField label="Port" value={ioForm.port} onChange={(e) => setIoForm((p) => ({ ...p, port: e.target.value }))} fullWidth />
              <TextField label="Controller Type" value={ioForm.controllerType} onChange={(e) => setIoForm((p) => ({ ...p, controllerType: e.target.value }))} fullWidth />
            </Stack>
            <TextField label="URL Format" value={ioForm.urlFormat} onChange={(e) => setIoForm((p) => ({ ...p, urlFormat: e.target.value }))} fullWidth />
            <TextField label="Remark" value={ioForm.remark} onChange={(e) => setIoForm((p) => ({ ...p, remark: e.target.value }))} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIoDialogOpen(false)} disabled={ioSaving}>
            {t('common:cancel')}
          </Button>
          <Button variant="contained" onClick={() => void saveIo()} disabled={ioSaving || !ioForm.name.trim() || !ioForm.ipAddress.trim()}>
            {ioSaving ? t('common:loading') : t('common:save')}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(ioDeleteTarget)}
        title={t('common:delete')}
        message={`Delete IO device "${ioDeleteTarget?.name ?? ''}"?`}
        confirmLabel={t('common:delete')}
        loading={ioSaving}
        onConfirm={() => void deleteIo()}
        onCancel={() => setIoDeleteTarget(null)}
      />
    </Box>
  );
}
