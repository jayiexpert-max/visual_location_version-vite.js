import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, Navigate } from 'react-router-dom';
import type { SupportedLanguage } from '@visual-location/shared';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { PageHeader } from '../../components/layout/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { getErrorMessage } from '../../services/apiClient';
import * as healthService from '../../services/healthService';
import type { CpkEndpointHealthResult } from '../../services/healthService';
import * as ioService from '../../services/ioService';
import * as warehouseService from '../../services/warehouseService';
import type { EthernetIoDevice, WarehouseHierarchy } from '../../types/warehouse';
import { formatCpkReleaseDate, parseCpkVersionPayload } from '../../utils/cpkVersionInfo';
import '../../styles/admin-page.css';
import { AdminFifoSettingsTab } from './AdminFifoSettingsTab';
import { AdminProductsTab } from './AdminProductsTab';

type AdminTab =
  | 'locationMapping'
  | 'rackConfig'
  | 'products'
  | 'fifoSettings'
  | 'languageSettings'
  | 'outputMapping'
  | 'mqttSettings'
  | 'raspberrySettings'
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

const RASPI_IO_PORT = '8080';
const RASPI_IO_URL_FORMAT = 'http://{IP}:{PORT}/api/io/highlight';

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
  const { t, i18n } = useTranslation(['pages', 'common']);
  const { hasRole, user, changeLanguage } = useAuth();

  const [tab, setTab] = useState<AdminTab>('locationMapping');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [hierarchy, setHierarchy] = useState<WarehouseHierarchy | null>(null);
  const [selectedBoxLabel, setSelectedBoxLabel] = useState<string | null>(null);

  const [rackEntity, setRackEntity] = useState<RackEntity>('racks');
  const [entityRows, setEntityRows] = useState<AdminRecord[]>([]);
  const [entityLoading, setEntityLoading] = useState(false);
  const [entityForm, setEntityForm] = useState<EntityFormState>(emptyEntityForm());
  const [editingEntity, setEditingEntity] = useState<AdminRecord | null>(null);
  const [entitySaving, setEntitySaving] = useState(false);
  const [entityDeleteTarget, setEntityDeleteTarget] = useState<AdminRecord | null>(null);

  const [ioDevices, setIoDevices] = useState<EthernetIoDevice[]>([]);
  const [ioLoading, setIoLoading] = useState(false);
  const [ioForm, setIoForm] = useState<IoFormState>(emptyIoForm());
  const [editingIo, setEditingIo] = useState<EthernetIoDevice | null>(null);
  const [ioSaving, setIoSaving] = useState(false);
  const [ioDeleteTarget, setIoDeleteTarget] = useState<EthernetIoDevice | null>(null);

  const [healthLoading, setHealthLoading] = useState(false);
  const [appHealth, setAppHealth] = useState<{ status: string; timestamp?: string; mqttConnected?: boolean } | null>(null);
  const [cpkHealth, setCpkHealth] = useState<{ status: string; version?: string; latencyMs?: number; message?: string; data?: unknown } | null>(null);
  const [pdsHealth, setPdsHealth] = useState<{ status: string; latencyMs?: number; httpCode?: number; message?: string } | null>(null);
  const [cpkEndpointHealth, setCpkEndpointHealth] = useState<CpkEndpointHealthResult | null>(null);
  const [cpkEndpointLoading, setCpkEndpointLoading] = useState(false);
  const [ioResetLoading, setIoResetLoading] = useState(false);
  const [ioTestKey, setIoTestKey] = useState<string | null>(null);
  const [language, setLanguage] = useState<SupportedLanguage>(user?.lang ?? 'th');
  const [languageSaving, setLanguageSaving] = useState(false);

  const loadHierarchy = useCallback(async () => {
    try {
      const data = await warehouseService.getHierarchy();
      setHierarchy(data);
    } catch (err) {
      setError(getErrorMessage(err, t('common:error'), t));
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
      setError(getErrorMessage(err, t('common:error'), t));
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
      setError(getErrorMessage(err, t('common:error'), t));
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
      setError(getErrorMessage(err, t('common:error'), t));
    } finally {
      setHealthLoading(false);
    }
  }, [t]);

  const loadCpkEndpointHealth = useCallback(async () => {
    setCpkEndpointLoading(true);
    setError(null);
    try {
      const data = await healthService.getCpkEndpointHealth();
      setCpkEndpointHealth(data);
    } catch (err) {
      setError(getErrorMessage(err, t('common:error'), t));
    } finally {
      setCpkEndpointLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadHierarchy();
    void loadIoDevices();
  }, [loadHierarchy, loadIoDevices]);

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

  const cpkVersionInfo = useMemo(
    () => parseCpkVersionPayload(cpkHealth?.data),
    [cpkHealth?.data],
  );

  const cpkVersionText = useMemo(() => {
    if (!cpkVersionInfo.version) return '—';
    const formattedDate = cpkVersionInfo.releaseDate
      ? formatCpkReleaseDate(cpkVersionInfo.releaseDate, i18n.language)
      : null;
    if (formattedDate) {
      return t('pages:cpkVersionWithDate', {
        version: cpkVersionInfo.version,
        date: formattedDate,
      });
    }
    return t('pages:cpkVersionOnly', { version: cpkVersionInfo.version });
  }, [cpkVersionInfo, i18n.language, t]);

  const adminOverview = useMemo(() => {
    const rackCount = hierarchy?.racks.length ?? 0;
    const boxCount = hierarchy?.racks.reduce(
      (total, rack) => total + rack.levels.reduce((levelTotal, level) => levelTotal + level.boxes.length, 0),
      0,
    ) ?? 0;
    const slotCount = hierarchy?.racks.reduce(
      (total, rack) => total + rack.levels.reduce(
        (levelTotal, level) => levelTotal + level.boxes.reduce((boxTotal, box) => boxTotal + box.slots.length, 0),
        0,
      ),
      0,
    ) ?? 0;
    const raspiCount = ioDevices.filter((device) => device.controllerType === 'raspi').length;
    return { rackCount, boxCount, slotCount, ioCount: ioDevices.length, raspiCount };
  }, [hierarchy, ioDevices]);

  const rackOptions = useMemo(() => hierarchy?.racks ?? [], [hierarchy]);

  const levelOptions = useMemo(() => (
    hierarchy?.racks.flatMap((rack) => rack.levels.map((level) => ({
      id: level.id,
      rackId: rack.id,
      rackName: rack.name,
      levelNo: level.levelNo,
      label: `Rack ${rack.name} - Level ${level.levelNo}`,
    }))) ?? []
  ), [hierarchy]);

  const boxOptions = useMemo(() => (
    hierarchy?.racks.flatMap((rack) => rack.levels.flatMap((level) => level.boxes.map((box) => ({
      id: box.id,
      rackName: rack.name,
      levelNo: level.levelNo,
      boxCode: box.boxCode,
      layout: box.layout,
      occupied: box.slots.filter((slot) => slot.product).length,
      total: box.slots.length,
      label: `Rack ${rack.name} - L${level.levelNo} - Box ${box.boxCode}`,
    })))) ?? []
  ), [hierarchy]);

  const ioDeviceById = useMemo(() => {
    const map = new Map<number, EthernetIoDevice>();
    ioDevices.forEach((device) => map.set(device.id, device));
    return map;
  }, [ioDevices]);

  const rackById = useMemo(() => {
    const map = new Map<number, { name: string }>();
    rackOptions.forEach((rack) => map.set(rack.id, rack));
    return map;
  }, [rackOptions]);

  const levelById = useMemo(() => {
    const map = new Map<number, (typeof levelOptions)[number]>();
    levelOptions.forEach((level) => map.set(level.id, level));
    return map;
  }, [levelOptions]);

  const boxById = useMemo(() => {
    const map = new Map<number, (typeof boxOptions)[number]>();
    boxOptions.forEach((box) => map.set(box.id, box));
    return map;
  }, [boxOptions]);

  const entityColumns = useMemo(() => {
    switch (rackEntity) {
      case 'racks':
        return [
          { field: 'id', headerName: 'ID' },
          { field: 'name', headerName: 'Name' },
          { field: 'locationDesc', headerName: 'Location' },
          { field: 'ioConfig', headerName: 'IO Config' },
        ];
      case 'levels':
        return [
          { field: 'id', headerName: 'ID' },
          { field: 'rackId', headerName: 'Rack ID' },
          { field: 'levelNo', headerName: 'Level No' },
          { field: 'remark', headerName: 'Remark' },
        ];
      case 'boxes':
        return [
          { field: 'id', headerName: 'ID' },
          { field: 'levelId', headerName: 'Level ID' },
          { field: 'boxCode', headerName: 'Box Code' },
          { field: 'layout', headerName: 'Layout' },
          { field: 'positionInLevel', headerName: 'Position' },
          { field: 'ioOutputPin', headerName: 'IO Pin' },
        ];
      case 'slots':
        return [
          { field: 'id', headerName: 'ID' },
          { field: 'boxId', headerName: 'Box ID' },
          { field: 'slotNo', headerName: 'Slot No' },
          { field: 'remark', headerName: 'Remark' },
        ];
    }
  }, [rackEntity]);

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
  };

  const applyRaspiPreset = () => {
    setIoForm((current) => ({
      ...current,
      name: current.name || 'Raspi IO Gateway',
      port: RASPI_IO_PORT,
      controllerType: 'raspi',
      urlFormat: RASPI_IO_URL_FORMAT,
    }));
    setTab('outputMapping');
  };

  const renderEntityCell = (row: AdminRecord, field: string) => {
    if (field === 'rackId') {
      const rack = rackById.get(Number(row.rackId));
      return rack ? `Rack ${rack.name}` : String(row.rackId ?? '—');
    }
    if (field === 'levelId') {
      const level = levelById.get(Number(row.levelId));
      return level ? level.label : String(row.levelId ?? '—');
    }
    if (field === 'boxId') {
      const box = boxById.get(Number(row.boxId));
      return box ? box.label : String(row.boxId ?? '—');
    }
    if (field === 'ioDeviceId') {
      const device = ioDeviceById.get(Number(row.ioDeviceId));
      return device ? `${device.name} (#${device.id})` : String(row.ioDeviceId ?? '—');
    }
    if (field === 'ioConfig') {
      const deviceId = Number(row.ioDeviceId ?? 0);
      const device = ioDeviceById.get(deviceId);
      if (!device) return '—';
      const pins = [
        { label: 'Green', role: 'green', value: Number(row.ioGreenPin ?? 0) },
        { label: 'Red', role: 'red', value: Number(row.ioRedPin ?? 0) },
        { label: 'Buzzer', role: 'buzzer', value: Number(row.ioBuzzerPin ?? 0) },
      ].filter((pin) => pin.value > 0);
      return (
        <div className="admin-test-group">
          <span className="admin-soft-badge">{device.name}</span>
          {pins.length === 0 ? (
            <span style={{ color: '#94a3b8' }}>No pin</span>
          ) : pins.map((pin) => {
            const key = `${deviceId}:${pin.value}:${pin.role}`;
            return (
              <button
                key={key}
                type="button"
                className="admin-test-btn"
                disabled={ioTestKey === key}
                onClick={() => void handleIoTestOutput(deviceId, pin.value, pin.role)}
              >
                {ioTestKey === key ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-bolt"></i>}
                {pin.label} {pin.value}
              </button>
            );
          })}
        </div>
      );
    }
    if (field === 'ioOutputPin' && row.ioOutputPin) {
      const deviceId = Number(row.ioDeviceId ?? 0);
      const pin = Number(row.ioOutputPin ?? 0);
      const key = `${deviceId}:${pin}:box`;
      return (
        <div className="admin-test-group">
          <span className="admin-soft-badge admin-soft-badge-green">Pin {String(row.ioOutputPin)}</span>
          {deviceId > 0 && pin > 0 && (
            <button
              type="button"
              className="admin-test-btn"
              disabled={ioTestKey === key}
              onClick={() => void handleIoTestOutput(deviceId, pin, 'box')}
            >
              {ioTestKey === key ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-bolt"></i>}
              Test
            </button>
          )}
        </div>
      );
    }
    if (field === 'layout' && row.layout) {
      return <span className="admin-soft-badge">{String(row.layout)}</span>;
    }
    return String(row[field] ?? '—');
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

      setEditingEntity(null);
      setEntityForm(emptyEntityForm());
      setSuccess(t('common:success'));
      await loadEntityRows();
      await loadHierarchy();
    } catch (err) {
      setError(getErrorMessage(err, t('common:error'), t));
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
      setError(getErrorMessage(err, t('common:error'), t));
    } finally {
      setEntitySaving(false);
    }
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

      setEditingIo(null);
      setIoForm(emptyIoForm());
      setSuccess(t('common:success'));
      await loadIoDevices();
    } catch (err) {
      setError(getErrorMessage(err, t('common:error'), t));
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
      setError(getErrorMessage(err, t('common:error'), t));
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
      setError(getErrorMessage(err, t('common:error'), t));
    } finally {
      setIoResetLoading(false);
    }
  };

  const handleIoTestOutput = async (deviceId: number, pin: number, role: string) => {
    const key = `${deviceId}:${pin}:${role}`;
    setIoTestKey(key);
    setError(null);
    try {
      await ioService.ioTestOutput({ deviceId, pin, role });
      setSuccess(`Test output sent: device ${deviceId}, pin ${pin}`);
    } catch (err) {
      setError(getErrorMessage(err, t('common:error'), t));
    } finally {
      setIoTestKey(null);
    }
  };

  const handleLanguageSave = async () => {
    setLanguageSaving(true);
    setError(null);
    try {
      await changeLanguage(language);
      setSuccess(t('common:success'));
    } catch (err) {
      setError(getErrorMessage(err, t('common:error'), t));
    } finally {
      setLanguageSaving(false);
    }
  };

  const mqttEnvItems = [
    { label: 'API Base URL', value: import.meta.env.VITE_API_BASE_URL ?? '/api/v1' },
    { label: 'Socket URL', value: import.meta.env.VITE_SOCKET_URL ?? '(same origin)' },
    { label: 'App Name', value: import.meta.env.VITE_APP_NAME ?? 'Visual Location Management' },
    { label: 'MQTT Broker (server-side)', value: 'Configured via MQTT_BROKER_URL on API server' },
    { label: 'MQTT Client ID (server-side)', value: 'Configured via MQTT_CLIENT_ID on API server' },
    { label: 'MQTT Topic Prefix (server-side)', value: 'Configured via MQTT_IO_TOPIC_PREFIX on API server' },
  ];

  if (!hasRole('manage')) {
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

      <div className="admin-overview">
        <button type="button" className="admin-overview-item" onClick={() => setTab('outputMapping')}>
          <span className="admin-overview-icon"><i className="fas fa-network-wired"></i></span>
          <span>
            <strong>ตั้งค่า IO / Raspi</strong>
            <small>{adminOverview.raspiCount} Raspi gateway จาก {adminOverview.ioCount} IO device</small>
          </span>
        </button>
        <button type="button" className="admin-overview-item" onClick={() => setTab('rackConfig')}>
          <span className="admin-overview-icon"><i className="fas fa-layer-group"></i></span>
          <span>
            <strong>Rack และ Box</strong>
            <small>{adminOverview.rackCount} racks · {adminOverview.boxCount} boxes · {adminOverview.slotCount} slots</small>
          </span>
        </button>
        <button type="button" className="admin-overview-item" onClick={() => setTab('systemSettings')}>
          <span className="admin-overview-icon"><i className="fas fa-heartbeat"></i></span>
          <span>
            <strong>เช็ค Service</strong>
            <small>CPK และ latency แยก endpoint</small>
          </span>
        </button>
        <Button component={RouterLink} to="/app/admin/iot" variant="outlined" className="admin-overview-link">
          <i className="fas fa-chart-line"></i> IoT Monitor
        </Button>
      </div>

      <div className="admin-layout">
        {/* Sidebar */}
        <div className="admin-sidebar">
          <div className="admin-nav-group">
            <div className="admin-nav-title">{t('pages:adminNavWarehouse')}</div>
            <button className={`admin-nav-item ${tab === 'locationMapping' ? 'active' : ''}`} onClick={() => setTab('locationMapping')}>
              <i className="fas fa-sitemap"></i> {t('pages:locationMapping')}
            </button>
            <button className={`admin-nav-item ${tab === 'rackConfig' ? 'active' : ''}`} onClick={() => setTab('rackConfig')}>
              <i className="fas fa-layer-group"></i> {t('pages:rackConfig')}
            </button>
            <button className={`admin-nav-item ${tab === 'products' ? 'active' : ''}`} onClick={() => setTab('products')}>
              <i className="fas fa-box-open"></i> {t('pages:productMappingTitle')}
            </button>
          </div>

          <div className="admin-nav-group">
            <div className="admin-nav-title">{t('pages:adminNavSystem')}</div>
            <button className={`admin-nav-item ${tab === 'fifoSettings' ? 'active' : ''}`} onClick={() => setTab('fifoSettings')}>
              <i className="fas fa-sort-amount-down"></i> {t('pages:fifoSettingsTitle')}
            </button>
            <button className={`admin-nav-item ${tab === 'languageSettings' ? 'active' : ''}`} onClick={() => setTab('languageSettings')}>
              <i className="fas fa-language"></i> {t('pages:adminLanguageLocale')}
            </button>
          </div>

          <div className="admin-nav-group">
            <div className="admin-nav-title">{t('pages:adminNavIot')}</div>
            <button className={`admin-nav-item ${tab === 'outputMapping' ? 'active' : ''}`} onClick={() => setTab('outputMapping')}>
              <i className="fas fa-network-wired"></i> {t('pages:outputMapping')}
            </button>
            <button className={`admin-nav-item ${tab === 'mqttSettings' ? 'active' : ''}`} onClick={() => setTab('mqttSettings')}>
              <i className="fas fa-wifi"></i> {t('pages:mqttSettings')}
            </button>
          </div>

          <div className="admin-nav-group">
            <div className="admin-nav-title">{t('pages:adminNavMaintenance')}</div>
            <button className={`admin-nav-item ${tab === 'raspberrySettings' ? 'active' : ''}`} onClick={() => setTab('raspberrySettings')}>
              <i className="fab fa-raspberry-pi"></i> {t('pages:raspberrySettings')}
            </button>
            <button className={`admin-nav-item ${tab === 'systemSettings' ? 'active' : ''}`} onClick={() => setTab('systemSettings')}>
              <i className="fas fa-heartbeat"></i> {t('pages:systemSettings')}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="admin-content">

      {tab === 'locationMapping' && (
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title"><i className="fas fa-sitemap"></i> Location Mapping</h3>
            <button className="fx-btn fx-btn-secondary" onClick={() => void loadHierarchy()}>
              <i className="fas fa-sync-alt"></i>
            </button>
          </div>
          <div className="admin-card-body">
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Browse warehouse hierarchy. Select a box to jump to rack configuration.
            </Typography>
            {selectedBoxLabel && (
              <Alert severity="info" sx={{ mb: 2 }}>
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
          </div>
        </div>
      )}

      {tab === 'rackConfig' && (
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title"><i className="fas fa-layer-group"></i> Rack Configuration</h3>
            <div className="admin-actions">
              <button className="fx-btn fx-btn-secondary" onClick={() => void loadEntityRows()}>
                <i className="fas fa-sync-alt"></i>
              </button>
            </div>
          </div>
          <div className="admin-card-body">
            <div className="admin-entity-switcher">
              {([
                ['racks', 'Racks', 'โซน/ชั้นวางหลัก', 'fas fa-layer-group'],
                ['levels', 'Levels', 'ชั้นในแต่ละ Rack', 'fas fa-align-justify'],
                ['boxes', 'Boxes', 'กล่องและ output pin', 'fas fa-box'],
                ['slots', 'Slots', 'ช่องย่อยในกล่อง', 'fas fa-th'],
              ] as const).map(([value, title, desc, icon]) => (
                <button
                  key={value}
                  type="button"
                  className={`admin-entity-tab ${rackEntity === value ? 'active' : ''}`}
                  onClick={() => {
                    setRackEntity(value);
                    setEditingEntity(null);
                    setEntityForm(emptyEntityForm());
                  }}
                >
                  <i className={icon}></i>
                  <span>
                    <strong>{title}</strong>
                    <small>{desc}</small>
                  </span>
                </button>
              ))}
            </div>

            <div className="admin-helper-panel admin-helper-panel-neutral">
              <div>
                <div className="admin-helper-title">
                  <i className="fas fa-map-marked-alt"></i>
                  ตั้งค่าแบบ PHP: Rack → Level → Box → Slot
                </div>
                <ol className="admin-step-list">
                  <li>สร้าง Rack ก่อน แล้วเพิ่ม Level ใต้ Rack นั้น</li>
                  <li>สร้าง Box โดยเลือก Location เป็น Rack + Level ไม่ต้องจำเลข ID</li>
                  <li>ถ้า Box ต่อไฟ ให้เลือก IO Device และใส่ Output Pin ที่ต่อจริง</li>
                </ol>
              </div>
              <div className="admin-helper-actions">
                <button type="button" className="fx-btn fx-btn-secondary" onClick={() => setTab('outputMapping')}>
                  <i className="fas fa-network-wired"></i> ตั้งค่า IO Device
                </button>
              </div>
            </div>
            
            {/* Inline Form */}
            <form className="admin-form-inline" onSubmit={(e) => { e.preventDefault(); void saveEntity(); }}>
              <div className="admin-form-heading">
                <strong>{editingEntity ? `แก้ไข ${rackEntity}` : `เพิ่ม ${rackEntity}`}</strong>
                <small>เลือกจากชื่อ Rack/Level/Box ได้เลย เพื่อลดการกรอก ID ผิด</small>
              </div>
              {rackEntity === 'racks' && (
                <>
                  <div className="admin-field"><label>Name *</label><input required value={entityForm.name} onChange={e => setEntityForm(p => ({ ...p, name: e.target.value }))} /></div>
                  <div className="admin-field"><label>Location Desc</label><input value={entityForm.locationDesc} onChange={e => setEntityForm(p => ({ ...p, locationDesc: e.target.value }))} /></div>
                  <div className="admin-field"><label>IO Device (Tower Light)</label>
                    <select value={entityForm.ioDeviceId} onChange={e => setEntityForm(p => ({ ...p, ioDeviceId: e.target.value }))}>
                      <option value="">-- None --</option>
                      {ioDevices.map((device) => (
                        <option key={device.id} value={device.id}>{device.name} ({device.controllerType})</option>
                      ))}
                    </select>
                  </div>
                  <div className="admin-field"><label>Red Pin</label><input type="number" value={entityForm.ioRedPin} onChange={e => setEntityForm(p => ({ ...p, ioRedPin: e.target.value }))} /></div>
                  <div className="admin-field"><label>Yellow Pin</label><input type="number" value={entityForm.ioYellowPin} onChange={e => setEntityForm(p => ({ ...p, ioYellowPin: e.target.value }))} /></div>
                  <div className="admin-field"><label>Green Pin</label><input type="number" value={entityForm.ioGreenPin} onChange={e => setEntityForm(p => ({ ...p, ioGreenPin: e.target.value }))} /></div>
                  <div className="admin-field"><label>Buzzer Pin</label><input type="number" value={entityForm.ioBuzzerPin} onChange={e => setEntityForm(p => ({ ...p, ioBuzzerPin: e.target.value }))} /></div>
                </>
              )}
              {rackEntity === 'levels' && (
                <>
                  <div className="admin-field"><label>Select Rack *</label>
                    <select required value={entityForm.rackId} onChange={e => setEntityForm(p => ({ ...p, rackId: e.target.value }))}>
                      <option value="">-- Choose Rack --</option>
                      {rackOptions.map((rack) => (
                        <option key={rack.id} value={rack.id}>Rack {rack.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="admin-field"><label>Level No *</label><input type="number" required value={entityForm.levelNo} onChange={e => setEntityForm(p => ({ ...p, levelNo: e.target.value }))} /></div>
                  <div className="admin-field"><label>Remark</label><input value={entityForm.remark} onChange={e => setEntityForm(p => ({ ...p, remark: e.target.value }))} /></div>
                </>
              )}
              {rackEntity === 'boxes' && (
                <>
                  <div className="admin-field" style={{ minWidth: '260px' }}><label>Location (Level) *</label>
                    <select required value={entityForm.levelId} onChange={e => setEntityForm(p => ({ ...p, levelId: e.target.value }))}>
                      <option value="">-- Choose Level --</option>
                      {levelOptions.map((level) => (
                        <option key={level.id} value={level.id}>{level.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="admin-field"><label>Box Code *</label><input required value={entityForm.boxCode} onChange={e => setEntityForm(p => ({ ...p, boxCode: e.target.value }))} /></div>
                  <div className="admin-field"><label>Position</label><input type="number" value={entityForm.positionInLevel} onChange={e => setEntityForm(p => ({ ...p, positionInLevel: e.target.value }))} /></div>
                  <div className="admin-field"><label>Layout (W x H)</label>
                    <select value={entityForm.layout} onChange={e => setEntityForm(p => ({ ...p, layout: e.target.value }))}>
                      <option value="1x1">1 x 1</option>
                      <option value="2x5">2 x 5</option>
                      <option value="3x5">3 x 5</option>
                      <option value="4x5">4 x 5</option>
                      <option value="5x5">5 x 5</option>
                    </select>
                    <small className="admin-field-hint">ใช้รูปแบบ WxH เช่น 2x5 ตาม PHP</small>
                  </div>
                  <div className="admin-field"><label>IO Device</label>
                    <select value={entityForm.ioDeviceId} onChange={e => setEntityForm(p => ({ ...p, ioDeviceId: e.target.value }))}>
                      <option value="">-- None --</option>
                      {ioDevices.map((device) => (
                        <option key={device.id} value={device.id}>{device.name} ({device.controllerType})</option>
                      ))}
                    </select>
                  </div>
                  <div className="admin-field"><label>Output Pin</label><input type="number" value={entityForm.ioOutputPin} onChange={e => setEntityForm(p => ({ ...p, ioOutputPin: e.target.value }))} /></div>
                </>
              )}
              {rackEntity === 'slots' && (
                <>
                  <div className="admin-field" style={{ minWidth: '280px' }}><label>Select Box *</label>
                    <select required value={entityForm.boxId} onChange={e => setEntityForm(p => ({ ...p, boxId: e.target.value }))}>
                      <option value="">-- Choose Box --</option>
                      {boxOptions.map((box) => (
                        <option key={box.id} value={box.id}>
                          {box.label} ({box.occupied}/{box.total} · {box.layout})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="admin-field"><label>Slot No *</label><input type="number" required value={entityForm.slotNo} onChange={e => setEntityForm(p => ({ ...p, slotNo: e.target.value }))} /></div>
                  <div className="admin-field"><label>Remark</label><input value={entityForm.remark} onChange={e => setEntityForm(p => ({ ...p, remark: e.target.value }))} /></div>
                </>
              )}
              <div className="admin-actions" style={{ marginLeft: 'auto' }}>
                {editingEntity && (
                  <button type="button" className="fx-btn fx-btn-secondary" onClick={() => { setEditingEntity(null); setEntityForm(emptyEntityForm()); }}>
                    Cancel
                  </button>
                )}
                <button type="submit" className="fx-btn fx-btn-accent" disabled={entitySaving}>
                  {entitySaving ? <i className="fas fa-spinner fa-spin"></i> : (editingEntity ? <i className="fas fa-save"></i> : <i className="fas fa-plus"></i>)}
                  {editingEntity ? ' Update' : ' Add'}
                </button>
              </div>
            </form>

            {/* Custom Table */}
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>ID</th>
                    {entityColumns.filter(c => c.field !== 'id' && c.field !== 'actions').map(c => (
                      <th key={c.field}>{c.headerName}</th>
                    ))}
                    <th style={{ width: 100, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entityLoading ? (
                    <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}><i className="fas fa-circle-notch fa-spin"></i> Loading...</td></tr>
                  ) : entityRows.length === 0 ? (
                    <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No {rackEntity} found.</td></tr>
                  ) : entityRows.map(row => (
                    <tr key={row.id}>
                      <td style={{ color: '#94a3b8', fontWeight: 600 }}>{row.id}</td>
                      {entityColumns.filter(c => c.field !== 'id' && c.field !== 'actions').map(c => (
                        <td key={c.field}>{renderEntityCell(row, c.field)}</td>
                      ))}
                      <td style={{ textAlign: 'right' }}>
                        <div className="admin-actions" style={{ justifyContent: 'flex-end' }}>
                          <button className="btn-icon edit" onClick={() => openEntityEdit(row)} title="Edit">
                            <i className="fas fa-edit"></i>
                          </button>
                          <button className="btn-icon delete" onClick={() => setEntityDeleteTarget(row)} title="Delete">
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

      {tab === 'products' && (
        <AdminProductsTab
          onSuccess={(msg) => setSuccess(msg)}
          onError={(msg) => setError(msg)}
        />
      )}

      {tab === 'fifoSettings' && (
        <AdminFifoSettingsTab
          onSuccess={(msg) => setSuccess(msg)}
          onError={(msg) => setError(msg)}
        />
      )}

      {tab === 'mqttSettings' && (
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title"><i className="fas fa-wifi"></i> {t('pages:mqttSettings')}</h3>
          </div>
          <div className="admin-card-body">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              MQTT broker credentials are configured on the API server environment. The web app connects through REST and Socket.IO.
            </Typography>
            <div style={{ display: 'grid', gap: '12px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
              {mqttEnvItems.map((item) => (
                <div key={item.label} style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ minWidth: '240px', fontWeight: 600 }}>{item.label}</div>
                  <div style={{ color: '#64748b' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'raspberrySettings' && (
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title"><i className="fab fa-raspberry-pi"></i> {t('pages:raspberrySettings')}</h3>
            <div className="admin-actions">
              <button className="fx-btn fx-btn-secondary" onClick={() => void loadHealth()} disabled={healthLoading}>
                <i className="fas fa-sync-alt"></i>
              </button>
            </div>
          </div>
          <div className="admin-card-body">
            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontWeight: 600, minWidth: '150px' }}>{t('pages:mqttStatus')}</span>
                <span className={`fx-badge ${appHealth?.mqttConnected ? 'fx-badge-success' : 'fx-badge-danger'}`}>
                  {appHealth?.mqttConnected ? t('common:online') : t('common:offline')}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontWeight: 600, minWidth: '150px' }}>{t('pages:raspberryStatus')}</span>
                <span className={`fx-badge ${appHealth?.status === 'ok' ? 'fx-badge-success' : 'fx-badge-warning'}`}>
                  {appHealth?.status === 'ok' ? t('common:online') : t('common:unknown')}
                </span>
              </div>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                API health timestamp: {appHealth?.timestamp ?? '—'}<br/>
                Raspberry Pi IO bridge health is inferred from API connectivity and MQTT broker status reported by the backend.
              </Typography>

              <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
                <button className="fx-btn fx-btn-accent" onClick={() => void handleIoReset()} disabled={ioResetLoading}>
                  <i className="fas fa-power-off"></i> Test IO Reset (MQTT)
                </button>
                <Button component={RouterLink} to="/app/admin/iot" variant="outlined" sx={{ height: '38px' }}>
                  Open IoT Monitor
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'outputMapping' && (
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title"><i className="fas fa-network-wired"></i> {t('pages:outputMapping')}</h3>
            <div className="admin-actions">
              <button className="fx-btn fx-btn-secondary" onClick={() => void loadIoDevices()}>
                <i className="fas fa-sync-alt"></i>
              </button>
            </div>
          </div>
          <div className="admin-card-body">
            <div className="admin-helper-panel">
              <div>
                <div className="admin-helper-title">
                  <i className="fab fa-raspberry-pi"></i>
                  ตั้งค่า Raspi แบบใช้งานหน้างาน
                </div>
                <ol className="admin-step-list">
                  <li>เพิ่ม Raspi gateway ด้วย IP ของเครื่อง Raspberry Pi และ port 8080</li>
                  <li>ไปที่ Rack Configuration เพื่อผูก IO Device ID กับ rack/box และใส่ pin ที่ต่อจริง</li>
                  <li>กด Test IO Reset หรือเปิด IoT Monitor เพื่อดูสถานะ gateway ก่อนใช้งาน picklist</li>
                </ol>
              </div>
              <div className="admin-helper-actions">
                <button type="button" className="fx-btn fx-btn-accent" onClick={applyRaspiPreset}>
                  <i className="fas fa-bolt"></i> ใช้ค่า Raspi preset
                </button>
                <Button component={RouterLink} to="/app/admin/iot" variant="outlined" sx={{ height: '38px' }}>
                  เปิด IoT Monitor
                </Button>
              </div>
            </div>

            <div className="admin-metric-strip">
              <div><span>{ioDevices.length}</span><small>IO devices</small></div>
              <div><span>{adminOverview.raspiCount}</span><small>Raspi gateways</small></div>
              <div><span>{adminOverview.boxCount}</span><small>Boxes mapped</small></div>
            </div>
            
            {/* Inline Form for IO Devices */}
            <form className="admin-form-inline" onSubmit={(e) => { e.preventDefault(); void saveIo(); }}>
              <div className="admin-form-heading">
                <strong>{editingIo ? 'แก้ไข IO Device' : 'เพิ่ม IO Device'}</strong>
                <small>สำหรับ Raspi ให้ใช้ controller เป็น Raspi gateway และ URL format ตาม preset</small>
              </div>
              <div className="admin-field"><label>Name *</label><input required value={ioForm.name} onChange={e => setIoForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div className="admin-field"><label>IP Address *</label><input required value={ioForm.ipAddress} onChange={e => setIoForm(p => ({ ...p, ipAddress: e.target.value }))} /></div>
              <div className="admin-field" style={{ minWidth: '100px', flex: '0 1 100px' }}><label>Port</label><input type="number" value={ioForm.port} onChange={e => setIoForm(p => ({ ...p, port: e.target.value }))} /></div>
              <div className="admin-field" style={{ minWidth: '120px', flex: '0 1 120px' }}><label>Controller</label>
                <select
                  value={ioForm.controllerType}
                  onChange={e => setIoForm(p => ({
                    ...p,
                    controllerType: e.target.value,
                    port: e.target.value === 'raspi' ? RASPI_IO_PORT : p.port,
                    urlFormat: e.target.value === 'raspi'
                      ? RASPI_IO_URL_FORMAT
                      : p.urlFormat,
                  }))}
                >
                  <option value="http">HTTP</option>
                  <option value="mqtt">MQTT</option>
                  <option value="raspi">Raspi gateway</option>
                </select>
              </div>
              <div className="admin-field" style={{ minWidth: '250px' }}>
                <label>Command URL format</label>
                <input value={ioForm.urlFormat} onChange={e => setIoForm(p => ({ ...p, urlFormat: e.target.value }))} />
                {ioForm.controllerType === 'raspi' && <small className="admin-field-hint">Raspi endpoint: {RASPI_IO_URL_FORMAT}</small>}
              </div>
              <div className="admin-field"><label>Remark</label><input value={ioForm.remark} onChange={e => setIoForm(p => ({ ...p, remark: e.target.value }))} /></div>
              
              <div className="admin-actions" style={{ marginLeft: 'auto' }}>
                {editingIo && (
                  <button type="button" className="fx-btn fx-btn-secondary" onClick={() => { setEditingIo(null); setIoForm(emptyIoForm()); }}>
                    Cancel
                  </button>
                )}
                <button type="submit" className="fx-btn fx-btn-accent" disabled={ioSaving}>
                  {ioSaving ? <i className="fas fa-spinner fa-spin"></i> : (editingIo ? <i className="fas fa-save"></i> : <i className="fas fa-plus"></i>)}
                  {editingIo ? ' Update' : ' Add'}
                </button>
              </div>
            </form>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>IP Address</th>
                    <th>Port</th>
                    <th>Controller</th>
                    <th>URL Format</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ioLoading ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}><i className="fas fa-circle-notch fa-spin"></i> Loading...</td></tr>
                  ) : ioDevices.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No IO devices mapped.</td></tr>
                  ) : ioDevices.map(row => (
                    <tr key={row.id}>
                      <td style={{ fontWeight: 600 }}>{row.name}</td>
                      <td>{row.ipAddress}</td>
                      <td>{row.port}</td>
                      <td>{row.controllerType}</td>
                      <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{row.urlFormat}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="admin-actions" style={{ justifyContent: 'flex-end' }}>
                          <button className="btn-icon edit" onClick={() => {
                            setEditingIo(row);
                            setIoForm({
                              name: row.name,
                              ipAddress: row.ipAddress,
                              port: String(row.port),
                              controllerType: row.controllerType,
                              urlFormat: row.urlFormat,
                              remark: row.remark ?? '',
                            });
                          }} title="Edit">
                            <i className="fas fa-edit"></i>
                          </button>
                          <button className="btn-icon delete" onClick={() => setIoDeleteTarget(row)} title="Delete">
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'languageSettings' && (
        <div className="admin-card" style={{ maxWidth: '500px' }}>
          <div className="admin-card-header">
            <h3 className="admin-card-title"><i className="fas fa-language"></i> {t('pages:languageSettings')}</h3>
          </div>
          <div className="admin-card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="radio" name="lang" value="th" checked={language === 'th'} onChange={() => setLanguage('th')} />
                {t('common:thai')}
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="radio" name="lang" value="en" checked={language === 'en'} onChange={() => setLanguage('en')} />
                {t('common:english')}
              </label>
            </div>
            <button className="fx-btn fx-btn-accent" onClick={() => void handleLanguageSave()} disabled={languageSaving}>
              {languageSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>} {t('common:save')}
            </button>
          </div>
        </div>
      )}

      {tab === 'systemSettings' && (
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title"><i className="fas fa-heartbeat"></i> {t('pages:systemSettings')}</h3>
            <div className="admin-actions">
              <button className="fx-btn fx-btn-secondary" onClick={() => void loadHealth()} disabled={healthLoading}>
                <i className="fas fa-sync-alt"></i>
              </button>
              <button
                className="fx-btn fx-btn-accent"
                onClick={() => void loadCpkEndpointHealth()}
                disabled={cpkEndpointLoading}
              >
                {cpkEndpointLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-network-wired"></i>}
                {' '}{t('pages:cpkEndpointCheck')}
              </button>
            </div>
          </div>
          <div className="admin-card-body">
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 300px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ fontWeight: 700 }}>{t('pages:cpkServiceName')}</span>
                  <span className={`fx-badge ${cpkHealth?.status === 'ok' ? 'fx-badge-success' : 'fx-badge-danger'}`}>
                    {cpkHealth?.status ?? '—'}
                  </span>
                </div>
                <div style={{ fontSize: '0.9rem', color: '#475569' }}>
                  <p style={{ margin: '0 0 4px' }}>{t('pages:healthLatency')}: {cpkHealth?.latencyMs ?? '—'} ms</p>
                  <p style={{ margin: '0 0 4px' }}>{t('pages:cpkVersionLabel')}: {cpkVersionText}</p>
                  {cpkHealth?.message && <p style={{ margin: '4px 0 0', color: '#ef4444' }}>{cpkHealth.message}</p>}
                </div>
              </div>

              <div style={{ flex: '1 1 300px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ fontWeight: 700 }}>CPK</span>
                  <span className={`fx-badge ${cpkHealth?.status === 'ok' ? 'fx-badge-success' : 'fx-badge-danger'}`}>
                    {cpkHealth?.status ?? '—'}
                  </span>
                </div>
                <div style={{ fontSize: '0.9rem', color: '#475569' }}>
                  <p style={{ margin: '0 0 4px' }}>Latency: {cpkHealth?.latencyMs ?? '—'} ms</p>
                  <p style={{ margin: '0 0 4px' }}>Version: {cpkVersionText}</p>
                  {cpkHealth?.message && <p style={{ margin: '4px 0 0', color: '#ef4444' }}>{cpkHealth.message}</p>}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem' }}>{t('pages:cpkEndpointLatencyTitle')}</h4>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.88rem' }}>
                    {cpkEndpointHealth
                      ? `${t('pages:healthUpdated')} ${new Date(cpkEndpointHealth.timestamp).toLocaleString()}`
                      : t('pages:cpkEndpointLatencyHint')}
                  </p>
                </div>
              </div>

              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t('pages:cpkEndpointColumnEndpoint')}</th>
                      <th>{t('pages:cpkEndpointColumnMethod')}</th>
                      <th>{t('pages:healthLatency')}</th>
                      <th>{t('pages:cpkEndpointColumnHttp')}</th>
                      <th>{t('pages:cpkEndpointColumnCpk')}</th>
                      <th>{t('pages:cpkEndpointColumnStatus')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cpkEndpointLoading && !cpkEndpointHealth ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>
                          <i className="fas fa-circle-notch fa-spin"></i> Loading...
                        </td>
                      </tr>
                    ) : !cpkEndpointHealth ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>
                          {t('pages:cpkEndpointLatencyHint')}
                        </td>
                      </tr>
                    ) : (
                      cpkEndpointHealth.endpoints.map((endpoint) => (
                        <tr key={`${endpoint.method}-${endpoint.name}`}>
                          <td>
                            <div style={{ fontWeight: 700 }}>{endpoint.name}</div>
                            <div style={{ color: '#64748b', fontSize: '0.78rem', wordBreak: 'break-all' }}>
                              {endpoint.url}
                            </div>
                          </td>
                          <td>{endpoint.method}</td>
                          <td>{endpoint.latencyMs} ms</td>
                          <td>{endpoint.httpCode || '—'}</td>
                          <td>{endpoint.cpkStatus ?? '—'}</td>
                          <td>
                            <span className={`fx-badge ${endpoint.status === 'reachable' ? 'fx-badge-success' : 'fx-badge-danger'}`}>
                              {endpoint.status === 'reachable'
                                ? t('pages:cpkEndpointReachable')
                                : t('pages:cpkEndpointError')}
                            </span>
                            {endpoint.message && (
                              <div style={{ marginTop: 4, color: '#64748b', fontSize: '0.78rem' }}>
                                {endpoint.message}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

        </div>
      </div>

      <ConfirmDialog
        open={Boolean(entityDeleteTarget)}
        title={t('common:delete')}
        message={`Delete ${rackEntity} #${entityDeleteTarget?.id ?? ''}?`}
        confirmLabel={t('common:delete')}
        loading={entitySaving}
        onConfirm={() => void deleteEntity()}
        onCancel={() => setEntityDeleteTarget(null)}
      />

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
