import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSocketEvent } from '../../hooks/useSocket';
import * as ioService from '../../services/ioService';
import * as warehouseService from '../../services/warehouseService';
import { SocketEvents } from '../../services/socketService';
import { getErrorMessage } from '../../services/apiClient';
import type { BoxLayout, BoxLayoutCell } from '../../types/warehouse';

interface HighlightUpdatePayload {
  boxId: number;
  slotId?: number | null;
  slotNo?: number | null;
}

interface BoxLayoutPanelProps {
  open: boolean;
  boxId: number | null;
  boxCode?: string;
  onClose: () => void;
}

export function BoxLayoutPanel({ open, boxId, boxCode, onClose }: BoxLayoutPanelProps) {
  const { t } = useTranslation(['pages', 'common']);
  const [layout, setLayout] = useState<BoxLayout | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightSlotId, setHighlightSlotId] = useState<number | undefined>();
  const [ioLoading, setIoLoading] = useState<number | null>(null);

  const loadLayout = useCallback(async (id: number, slotId?: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await warehouseService.getBoxLayout(id, slotId);
      setLayout(data);
    } catch (err) {
      setError(getErrorMessage(err, t('common:error')));
      setLayout(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (open && boxId) {
      void loadLayout(boxId, highlightSlotId);
    } else {
      setLayout(null);
      setHighlightSlotId(undefined);
      setError(null);
    }
  }, [open, boxId, highlightSlotId, loadLayout]);

  const handleHighlightUpdate = useCallback(
    (payload: HighlightUpdatePayload) => {
      if (!boxId || payload.boxId !== boxId) return;
      const slotId = payload.slotId ?? undefined;
      setHighlightSlotId(slotId);
      void loadLayout(boxId, slotId);
    },
    [boxId, loadLayout],
  );

  useSocketEvent<HighlightUpdatePayload>(
    SocketEvents.highlightUpdate,
    handleHighlightUpdate,
    open && Boolean(boxId),
  );

  const handleSlotClick = async (cell: BoxLayoutCell) => {
    if (!boxId) return;
    setIoLoading(cell.slotId);
    try {
      await ioService.ioHighlight({ boxId, slotNo: cell.slotNo });
      setHighlightSlotId(cell.slotId);
      await loadLayout(boxId, cell.slotId);
    } catch (err) {
      setError(getErrorMessage(err, t('common:error')));
    } finally {
      setIoLoading(null);
    }
  };

  const occupiedCount = layout?.cells.filter((c) => c.product).length ?? 0;
  const totalSlots = layout?.cells.length ?? 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack spacing={0.5}>
            <Typography variant="h5" fontWeight={700}>
              {layout?.boxCode ?? boxCode ?? t('locationView')}
            </Typography>
            {layout && (
              <Typography variant="body2" color="text.secondary">
                {layout.rackName} · L{layout.levelNo} · {layout.layout} ({layout.rows}×{layout.cols})
              </Typography>
            )}
          </Stack>
          <IconButton onClick={onClose} aria-label={t('common:close')}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading && !layout ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : layout ? (
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                label={`${t('occupancy')}: ${occupiedCount}/${totalSlots}`}
                color={occupiedCount > 0 ? 'success' : 'default'}
                variant="outlined"
              />
              <Chip
                icon={<LightbulbIcon />}
                label={t('common:triggerLight')}
                size="small"
                variant="outlined"
                color="info"
              />
            </Stack>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: `repeat(${layout.cols}, minmax(72px, 1fr))`,
                gap: 1.5,
              }}
            >
              {layout.cells.map((cell) => {
                const filled = Boolean(cell.product);
                const highlighted = cell.highlighted;
                const busy = ioLoading === cell.slotId;

                return (
                  <Tooltip
                    key={cell.slotId}
                    title={
                      filled
                        ? `${cell.product?.name} · ${t('common:quantity')}: ${cell.product?.qty}`
                        : t('common:noData')
                    }
                  >
                    <Box
                      component="button"
                      type="button"
                      onClick={() => void handleSlotClick(cell)}
                      disabled={busy}
                      sx={{
                        minHeight: 72,
                        border: 2,
                        borderRadius: 2,
                        borderColor: highlighted ? 'warning.main' : filled ? 'success.main' : 'divider',
                        bgcolor: highlighted
                          ? 'warning.light'
                          : filled
                            ? 'success.light'
                            : 'action.hover',
                        color: 'text.primary',
                        cursor: busy ? 'wait' : 'pointer',
                        p: 1,
                        textAlign: 'center',
                        transition: 'transform 0.15s, box-shadow 0.15s',
                        boxShadow: highlighted ? 4 : 0,
                        '&:hover': { transform: 'scale(1.03)', boxShadow: 3 },
                        opacity: busy ? 0.7 : 1,
                      }}
                    >
                      <Typography variant="caption" fontWeight={700} display="block">
                        {cell.slotNo}
                      </Typography>
                      <Typography variant="caption" display="block" noWrap>
                        {filled ? cell.product?.name : '—'}
                      </Typography>
                      {filled && (
                        <Typography variant="caption" color="text.secondary">
                          {cell.product?.qty}
                        </Typography>
                      )}
                    </Box>
                  </Tooltip>
                );
              })}
            </Box>
          </Stack>
        ) : (
          <Typography color="text.secondary">{t('common:noData')}</Typography>
        )}
      </DialogContent>
    </Dialog>
  );
}
