import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import {
  Box,
  CircularProgress,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useSocketEvent } from '../../hooks/useSocket';
import { getHierarchy, getBoxLayout } from '../../services/warehouseService';
import { getTvHighlight, type TvHighlight } from '../../services/tvService';
import { getSocket, SocketEvents } from '../../services/socketService';
import type { BoxLayout, HierarchyBox, HierarchyRack, WarehouseHierarchy } from '../../types/warehouse';

const COLORS = {
  bg: '#0f172a',
  primary: '#4f46e5',
  highlight: '#3b82f6',
  success: '#10b981',
  surface: '#1e293b',
};

const SOUND_KEY = 'tv_sound_enabled';
const POLL_INTERVAL_MS = 5000;

function formatClock(date: Date): string {
  return date.toLocaleTimeString('en-GB', { hour12: false });
}

function loadSoundEnabled(searchParams: URLSearchParams): boolean {
  const param = searchParams.get('sound');
  if (param === '1' || param === 'true') return true;
  if (param === '0' || param === 'false') return false;
  return localStorage.getItem(SOUND_KEY) !== '0';
}

function speak(text: string, lang: string, enabled: boolean): void {
  if (!enabled || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === 'th' ? 'th-TH' : 'en-US';
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}

function boxOccupied(box: HierarchyBox): boolean {
  return box.slots.some((s) => s.product && s.product.qty > 0);
}

function tvSlotIndex(row: number, col: number, gridRows: number): number {
  return col * gridRows + (gridRows - 1 - row);
}

function buildTvSlotGrid(layout: BoxLayout): Array<BoxLayout['cells'][0] | null> {
  const total = layout.rows * layout.cols;
  const ordered: Array<BoxLayout['cells'][0] | null> = Array.from({ length: total }, () => null);
  const cellByPos = new Map<string, BoxLayout['cells'][0]>();
  for (const cell of layout.cells) {
    cellByPos.set(`${cell.row}-${cell.col}`, cell);
  }
  for (let r = 0; r < layout.rows; r += 1) {
    for (let c = 0; c < layout.cols; c += 1) {
      const idx = tvSlotIndex(r, c, layout.rows);
      ordered[idx] = cellByPos.get(`${r}-${c}`) ?? null;
    }
  }
  return ordered;
}

function RackGrid({
  hierarchy,
  highlight,
}: {
  hierarchy: WarehouseHierarchy;
  highlight: TvHighlight | null;
}) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, 1fr)',
          md: `repeat(${Math.min(hierarchy.racks.length, 5)}, 1fr)`,
        },
        gap: 2,
        flex: 1,
        overflow: 'auto',
        pr: 1,
      }}
    >
      {hierarchy.racks.map((rack) => (
        <RackCard key={rack.id} rack={rack} highlight={highlight} />
      ))}
    </Box>
  );
}

function RackCard({ rack, highlight }: { rack: HierarchyRack; highlight: TvHighlight | null }) {
  const rackHighlighted = highlight?.rackName === rack.name;

  return (
    <Box
      sx={{
        border: `2px solid ${rackHighlighted ? COLORS.highlight : '#334155'}`,
        borderRadius: 2,
        p: 1.5,
        bgcolor: COLORS.surface,
        boxShadow: rackHighlighted ? `0 0 20px ${COLORS.highlight}44` : 'none',
        transition: 'border-color 0.3s, box-shadow 0.3s',
      }}
    >
      <Typography
        variant="subtitle1"
        sx={{ color: '#f1f5f9', fontWeight: 700, mb: 1, textAlign: 'center' }}
      >
        {rack.name}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {rack.levels.map((level) => (
          <Box key={level.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Typography
              variant="caption"
              sx={{ color: '#64748b', minWidth: 28, fontWeight: 600, textAlign: 'right' }}
            >
              L{level.levelNo}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, flex: 1 }}>
              {level.boxes.map((box) => {
                const isBoxHighlight =
                  highlight?.boxId === box.id ||
                  (highlight?.boxCode != null && highlight.boxCode === box.boxCode);
                const occupied = boxOccupied(box);
                return (
                  <Box
                    key={box.id}
                    title={box.boxCode}
                    sx={{
                      minWidth: 36,
                      height: 28,
                      px: 0.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 0.75,
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      color: isBoxHighlight ? '#fff' : occupied ? '#a7f3d0' : '#64748b',
                      bgcolor: isBoxHighlight
                        ? COLORS.highlight
                        : occupied
                          ? 'rgba(16, 185, 129, 0.22)'
                          : 'rgba(15, 23, 42, 0.8)',
                      border: isBoxHighlight ? `2px solid ${COLORS.highlight}` : '1px solid #475569',
                      animation: isBoxHighlight ? 'tvPulse 1.4s ease-in-out infinite' : 'none',
                      '@keyframes tvPulse': {
                        '0%, 100%': { transform: 'scale(1)', boxShadow: `0 0 0 0 ${COLORS.highlight}66` },
                        '50%': { transform: 'scale(1.06)', boxShadow: `0 0 14px 4px ${COLORS.highlight}55` },
                      },
                    }}
                  >
                    {box.boxCode}
                  </Box>
                );
              })}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function DetailPanel({
  highlight,
  layout,
  loading,
}: {
  highlight: TvHighlight | null;
  layout: BoxLayout | null;
  loading: boolean;
}) {
  const { t } = useTranslation('pages');

  const orderedCells = useMemo(
    () => (layout ? buildTvSlotGrid(layout) : []),
    [layout],
  );

  if (!highlight) {
    return (
      <Box
        sx={{
          width: { xs: '100%', lg: '40%' },
          minWidth: { lg: 360 },
          borderLeft: { lg: '1px solid #334155' },
          borderTop: { xs: '1px solid #334155', lg: 'none' },
          p: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'rgba(30, 41, 59, 0.5)',
        }}
      >
        <Typography variant="h5" sx={{ color: '#64748b', textAlign: 'center' }}>
          {t('tvTitle')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: { xs: '100%', lg: '40%' },
        minWidth: { lg: 360 },
        borderLeft: { lg: '1px solid #334155' },
        borderTop: { xs: '1px solid #334155', lg: 'none' },
        p: 2.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        overflow: 'auto',
        bgcolor: 'rgba(30, 41, 59, 0.65)',
      }}
    >
      <Box>
        <Typography variant="overline" sx={{ color: COLORS.success, fontWeight: 700 }}>
          {highlight.rackName} · L{highlight.levelNo}
        </Typography>
        <Typography variant="h4" sx={{ color: '#f8fafc', fontWeight: 700, lineHeight: 1.2 }}>
          {highlight.productName ?? '—'}
        </Typography>
        <Typography variant="h6" sx={{ color: '#94a3b8', mt: 0.5 }}>
          {highlight.boxCode} · {t('locationView')} {highlight.slotNo != null ? `#${highlight.slotNo}` : ''}
        </Typography>
        {highlight.qty > 0 && (
          <Typography variant="body1" sx={{ color: '#cbd5e1', mt: 1 }}>
            Qty: {highlight.qty}
          </Typography>
        )}
        {highlight.searchedBy && (
          <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5 }}>
            {highlight.searchedBy}
          </Typography>
        )}
      </Box>

      {loading && <CircularProgress size={32} sx={{ color: COLORS.highlight, alignSelf: 'center' }} />}

      {layout && !loading && (
        <Box>
          <Typography variant="subtitle2" sx={{ color: '#94a3b8', mb: 1 }}>
            {layout.layout}
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
              gap: 1,
            }}
          >
            {orderedCells.map((cell, idx) => {
              const highlighted = cell?.highlighted;
              const occupied = Boolean(cell?.product);
              return (
                <Box
                  key={cell?.slotId ?? `empty-${idx}`}
                  sx={{
                    minHeight: 64,
                    p: 1,
                    borderRadius: 1.5,
                    border: highlighted ? `3px solid ${COLORS.highlight}` : '1px solid #475569',
                    bgcolor: highlighted
                      ? 'rgba(59, 130, 246, 0.3)'
                      : occupied
                        ? 'rgba(16, 185, 129, 0.2)'
                        : 'rgba(15, 23, 42, 0.7)',
                    boxShadow: highlighted ? `0 0 16px ${COLORS.highlight}66` : 'none',
                  }}
                >
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700 }}>
                    #{cell?.slotNo ?? '—'}
                  </Typography>
                  {cell?.product && (
                    <Typography
                      variant="body2"
                      sx={{ color: '#f1f5f9', fontWeight: 600, lineHeight: 1.25, mt: 0.25 }}
                    >
                      {cell.product.name}
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
}

export function TvDisplayPage() {
  const { t, i18n } = useTranslation(['pages', 'common']);
  const [searchParams, setSearchParams] = useSearchParams();

  const tvKey = searchParams.get('tv_key') ?? undefined;
  const langParam = searchParams.get('lang');

  const [clock, setClock] = useState(() => formatClock(new Date()));
  const [hierarchy, setHierarchy] = useState<WarehouseHierarchy | null>(null);
  const [highlight, setHighlight] = useState<TvHighlight | null>(null);
  const [boxLayout, setBoxLayout] = useState<BoxLayout | null>(null);
  const [layoutLoading, setLayoutLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(() => loadSoundEnabled(searchParams));

  const lastSeqRef = useRef<string | null>(null);

  const applyHighlight = useCallback(
    async (payload: TvHighlight | null) => {
      setHighlight(payload);
      if (!payload?.boxId) {
        setBoxLayout(null);
        return;
      }

      setLayoutLoading(true);
      try {
        const layout = await getBoxLayout(payload.boxId, payload.slotId ?? undefined, tvKey);
        setBoxLayout(layout);
      } catch {
        setBoxLayout(null);
      } finally {
        setLayoutLoading(false);
      }

      if (payload.highlightSeq && payload.highlightSeq !== lastSeqRef.current) {
        lastSeqRef.current = payload.highlightSeq;
        if (payload.productName) {
          const rack = payload.rackName ?? '';
          const level = payload.levelNo != null ? ` L${payload.levelNo}` : '';
          const box = payload.boxCode ?? '';
          const slot = payload.slotNo != null ? ` slot ${payload.slotNo}` : '';
          speak(`${payload.productName}, ${rack}${level}, ${box}${slot}`, i18n.language, soundEnabled);
        }
      }
    },
    [i18n.language, soundEnabled, tvKey],
  );

  useEffect(() => {
    if (langParam === 'th' || langParam === 'en') {
      void i18n.changeLanguage(langParam);
    }
  }, [langParam, i18n]);

  useEffect(() => {
    const timer = setInterval(() => setClock(formatClock(new Date())), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (tvKey) {
      getSocket({ kioskKey: tvKey });
    }
  }, [tvKey]);

  useSocketEvent<TvHighlight | null>(
    SocketEvents.highlightUpdate,
    (payload) => {
      void applyHighlight(payload);
    },
    Boolean(tvKey),
  );

  useSocketEvent<null>(
    SocketEvents.highlightClear,
    () => {
      lastSeqRef.current = null;
      setHighlight(null);
      setBoxLayout(null);
    },
    Boolean(tvKey),
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [hier, current] = await Promise.all([
          getHierarchy(tvKey),
          getTvHighlight(tvKey),
        ]);
        if (cancelled) return;
        setHierarchy(hier);
        if (current) {
          lastSeqRef.current = current.highlightSeq;
          await applyHighlight(current);
        }
      } catch {
        if (!cancelled) setHierarchy({ racks: [] });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tvKey, applyHighlight]);

  useEffect(() => {
    if (!tvKey) return;
    const interval = setInterval(() => {
      void getTvHighlight(tvKey).then((current) => {
        if (!current) {
          if (highlight) {
            lastSeqRef.current = null;
            setHighlight(null);
            setBoxLayout(null);
          }
          return;
        }
        if (current.highlightSeq !== lastSeqRef.current) {
          void applyHighlight(current);
        }
      });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [tvKey, applyHighlight]);

  const setLang = (_: React.MouseEvent<HTMLElement>, value: string | null) => {
    if (!value || (value !== 'th' && value !== 'en')) return;
    void i18n.changeLanguage(value);
    const next = new URLSearchParams(searchParams);
    next.set('lang', value);
    setSearchParams(next, { replace: true });
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem(SOUND_KEY, next ? '1' : '0');
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('sound', next ? '1' : '0');
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: COLORS.bg,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          py: 1.5,
          borderBottom: '1px solid #334155',
          bgcolor: 'rgba(15, 23, 42, 0.95)',
        }}
      >
        <Typography variant="h5" sx={{ color: '#f1f5f9', fontWeight: 700 }}>
          {t('pages:tvTitle')}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ToggleButtonGroup
            size="small"
            value={i18n.language.startsWith('th') ? 'th' : 'en'}
            exclusive
            onChange={setLang}
            sx={{
              '& .MuiToggleButton-root': {
                color: '#94a3b8',
                borderColor: '#475569',
                px: 2,
                '&.Mui-selected': { bgcolor: COLORS.primary, color: '#fff' },
              },
            }}
          >
            <ToggleButton value="th">TH</ToggleButton>
            <ToggleButton value="en">EN</ToggleButton>
          </ToggleButtonGroup>

          <IconButton onClick={toggleSound} sx={{ color: soundEnabled ? COLORS.success : '#64748b' }}>
            {soundEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
          </IconButton>

          <Typography
            variant="h4"
            sx={{
              color: '#f8fafc',
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              minWidth: 120,
              textAlign: 'right',
            }}
          >
            {clock}
          </Typography>
        </Box>
      </Box>

      {highlight && (
        <Box
          sx={{
            px: 3,
            py: 1.25,
            background: `linear-gradient(90deg, ${COLORS.success} 0%, #059669 50%, ${COLORS.success} 100%)`,
            animation: 'tvBannerGlow 2s ease-in-out infinite',
            '@keyframes tvBannerGlow': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.88 },
            },
          }}
        >
          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, textAlign: 'center' }}>
            {t('pages:tvSearchAlert')}: {highlight.productName ?? highlight.boxCode} — {highlight.rackName}{' '}
            L{highlight.levelNo} · {highlight.boxCode}
            {highlight.slotNo != null ? ` #${highlight.slotNo}` : ''}
          </Typography>
        </Box>
      )}

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          overflow: 'hidden',
          p: 2,
          gap: 0,
        }}
      >
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, pr: { lg: 2 } }}>
          {loading ? (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress sx={{ color: COLORS.primary }} />
            </Box>
          ) : hierarchy ? (
            <RackGrid hierarchy={hierarchy} highlight={highlight} />
          ) : null}

          <Typography variant="caption" sx={{ color: '#475569', mt: 1, textAlign: 'center' }}>
            {t('pages:tvAutoRefresh')}
          </Typography>
        </Box>

        <DetailPanel highlight={highlight} layout={boxLayout} loading={layoutLoading} />
      </Box>
    </Box>
  );
}
