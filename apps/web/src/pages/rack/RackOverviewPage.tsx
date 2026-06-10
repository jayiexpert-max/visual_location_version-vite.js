import {
  Alert,
  Box,
  Breadcrumbs,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Grid2 as Grid,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import LayersIcon from '@mui/icons-material/Layers';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../components/layout/PageHeader';
import * as warehouseService from '../../services/warehouseService';
import { getErrorMessage } from '../../services/apiClient';
import type {
  HierarchyBox,
  HierarchyLevel,
  HierarchyRack,
  HierarchySlot,
  WarehouseHierarchy,
} from '../../types/warehouse';
import { BoxLayoutPanel } from './BoxLayoutPanel';

type DrillLevel = 'warehouse' | 'rack' | 'level' | 'box';

function slotOccupancy(slots: HierarchySlot[]) {
  const filled = slots.filter((s) => s.product).length;
  return { filled, total: slots.length };
}

function boxOccupancy(box: HierarchyBox) {
  return slotOccupancy(box.slots);
}

function levelOccupancy(level: HierarchyLevel) {
  return level.boxes.reduce(
    (acc, box) => {
      const o = boxOccupancy(box);
      return { filled: acc.filled + o.filled, total: acc.total + o.total };
    },
    { filled: 0, total: 0 },
  );
}

function rackOccupancy(rack: HierarchyRack) {
  return rack.levels.reduce(
    (acc, level) => {
      const o = levelOccupancy(level);
      return { filled: acc.filled + o.filled, total: acc.total + o.total };
    },
    { filled: 0, total: 0 },
  );
}

function OccupancyChip({ filled, total }: { filled: number; total: number }) {
  const { t } = useTranslation('pages');
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
  const empty = filled === 0;

  return (
    <Chip
      size="small"
      label={`${t('occupancy')} ${filled}/${total} (${pct}%)`}
      color={empty ? 'default' : filled === total ? 'success' : 'warning'}
      variant={empty ? 'outlined' : 'filled'}
    />
  );
}

export function RackOverviewPage() {
  const { t } = useTranslation(['pages', 'common']);
  const [hierarchy, setHierarchy] = useState<WarehouseHierarchy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [drillLevel, setDrillLevel] = useState<DrillLevel>('warehouse');
  const [selectedRack, setSelectedRack] = useState<HierarchyRack | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<HierarchyLevel | null>(null);
  const [selectedBox, setSelectedBox] = useState<HierarchyBox | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const loadHierarchy = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await warehouseService.getHierarchy();
      setHierarchy(data);
    } catch (err) {
      setError(getErrorMessage(err, t('common:error')));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadHierarchy();
  }, [loadHierarchy]);

  const breadcrumbs = useMemo(() => {
    const items = [{ label: t('warehouseView'), onClick: () => resetDrill('warehouse') }];
    if (selectedRack) {
      items.push({ label: selectedRack.name, onClick: () => resetDrill('rack') });
    }
    if (selectedLevel) {
      items.push({ label: `L${selectedLevel.levelNo}`, onClick: () => resetDrill('level') });
    }
    if (selectedBox) {
      items.push({ label: selectedBox.boxCode, onClick: () => {} });
    }
    return items;
  }, [selectedRack, selectedLevel, selectedBox, t]);

  function resetDrill(level: DrillLevel) {
    setDrillLevel(level);
    if (level === 'warehouse') {
      setSelectedRack(null);
      setSelectedLevel(null);
      setSelectedBox(null);
      setPanelOpen(false);
    } else if (level === 'rack') {
      setSelectedLevel(null);
      setSelectedBox(null);
      setPanelOpen(false);
    } else if (level === 'level') {
      setSelectedBox(null);
      setPanelOpen(false);
    }
  }

  const handleRackSelect = (rack: HierarchyRack) => {
    setSelectedRack(rack);
    setDrillLevel('rack');
  };

  const handleLevelSelect = (level: HierarchyLevel) => {
    setSelectedLevel(level);
    setDrillLevel('level');
  };

  const handleBoxSelect = (box: HierarchyBox) => {
    setSelectedBox(box);
    setDrillLevel('box');
    setPanelOpen(true);
  };

  const warehouseOccupancy = useMemo(() => {
    if (!hierarchy) return { filled: 0, total: 0 };
    return hierarchy.racks.reduce(
      (acc, rack) => {
        const o = rackOccupancy(rack);
        return { filled: acc.filled + o.filled, total: acc.total + o.total };
      },
      { filled: 0, total: 0 },
    );
  }, [hierarchy]);

  return (
    <>
      <PageHeader
        title={t('rackTitle')}
        action={
          <Chip
            icon={<WarehouseIcon />}
            label={`${warehouseOccupancy.filled}/${warehouseOccupancy.total} ${t('occupancy').toLowerCase()}`}
            color="primary"
            variant="outlined"
          />
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Breadcrumbs sx={{ mb: 3 }}>
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;
          return isLast ? (
            <Typography key={item.label} color="text.primary" fontWeight={600}>
              {item.label}
            </Typography>
          ) : (
            <Link
              key={item.label}
              component="button"
              underline="hover"
              color="inherit"
              onClick={item.onClick}
              sx={{ cursor: 'pointer', border: 0, background: 'none', font: 'inherit' }}
            >
              {item.label}
            </Link>
          );
        })}
      </Breadcrumbs>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : !hierarchy?.racks.length ? (
        <Typography color="text.secondary">{t('common:noData')}</Typography>
      ) : (
        <Grid container spacing={2}>
          {drillLevel === 'warehouse' &&
            hierarchy.racks.map((rack) => {
              const occ = rackOccupancy(rack);
              return (
                <Grid key={rack.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardActionArea onClick={() => handleRackSelect(rack)} sx={{ height: '100%' }}>
                      <CardContent>
                        <Stack spacing={1.5}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <WarehouseIcon color="primary" />
                            <Typography variant="h6" fontWeight={700}>
                              {rack.name}
                            </Typography>
                          </Stack>
                          {rack.locationDesc && (
                            <Typography variant="body2" color="text.secondary">
                              {rack.locationDesc}
                            </Typography>
                          )}
                          <Typography variant="body2">
                            {rack.levels.length} levels
                          </Typography>
                          <OccupancyChip filled={occ.filled} total={occ.total} />
                        </Stack>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              );
            })}

          {drillLevel === 'rack' && selectedRack &&
            selectedRack.levels.map((level) => {
              const occ = levelOccupancy(level);
              return (
                <Grid key={level.id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Card variant="outlined">
                    <CardActionArea onClick={() => handleLevelSelect(level)}>
                      <CardContent>
                        <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                          <LayersIcon color="secondary" />
                          <Typography variant="h6" fontWeight={700}>
                            Level {level.levelNo}
                          </Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary" mb={1}>
                          {level.boxes.length} boxes
                        </Typography>
                        <OccupancyChip filled={occ.filled} total={occ.total} />
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              );
            })}

          {drillLevel === 'level' && selectedLevel &&
            selectedLevel.boxes.map((box) => {
              const occ = boxOccupancy(box);
              const empty = occ.filled === 0;
              return (
                <Grid key={box.id} size={{ xs: 6, sm: 4, md: 3 }}>
                  <Card
                    variant="outlined"
                    sx={{
                      borderColor: empty ? 'divider' : 'success.main',
                      bgcolor: empty ? 'background.paper' : 'success.light',
                    }}
                  >
                    <CardActionArea onClick={() => handleBoxSelect(box)}>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <ViewModuleIcon
                          sx={{ fontSize: 36, mb: 1, color: empty ? 'text.disabled' : 'success.dark' }}
                        />
                        <Typography variant="subtitle1" fontWeight={700}>
                          {box.boxCode}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {box.layout}
                        </Typography>
                        <Box mt={1}>
                          <OccupancyChip filled={occ.filled} total={occ.total} />
                        </Box>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              );
            })}

          {drillLevel === 'box' && selectedLevel && (
            <Grid size={12}>
              <Alert severity="info" icon={<Inventory2Icon />}>
                {t('common:openLocation')} — {selectedLevel.boxes.length} boxes on L{selectedLevel.levelNo}
              </Alert>
            </Grid>
          )}
        </Grid>
      )}

      <BoxLayoutPanel
        open={panelOpen}
        boxId={selectedBox?.id ?? null}
        boxCode={selectedBox?.boxCode}
        onClose={() => {
          setPanelOpen(false);
          if (drillLevel === 'box') setDrillLevel('level');
        }}
      />
    </>
  );
}
