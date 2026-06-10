import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import {
  Box,
  CircularProgress,
  IconButton,
  InputAdornment,
  Link,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import type { WarehouseSceneHandle } from '../../components/layout3d/WarehouseScene';
import { useSocketEvent } from '../../hooks/useSocket';
import { getHierarchy, getBoxLayout } from '../../services/warehouseService';
import { getSocket, SocketEvents } from '../../services/socketService';
import { useAuthStore } from '../../store/authStore';
import type { BoxLayout } from '../../types/warehouse';
import type { TvHighlight } from '../../services/tvService';

const AUDIO_KEY = 'layout_audio_enabled';
const COLORS = {
  bg: '#0f172a',
  primary: '#4f46e5',
  highlight: '#3b82f6',
  success: '#10b981',
};

function loadAudioEnabled(): boolean {
  return localStorage.getItem(AUDIO_KEY) !== '0';
}

function speak(text: string, lang: string, enabled: boolean): void {
  if (!enabled || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === 'th' ? 'th-TH' : 'en-US';
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}

function SlotGridPanel({
  layout,
  onClose,
}: {
  layout: BoxLayout;
  onClose: () => void;
}) {
  const { t } = useTranslation('pages');

  const cellMap = new Map<string, (typeof layout.cells)[0]>();
  for (const cell of layout.cells) {
    cellMap.set(`${cell.row}-${cell.col}`, cell);
  }

  return (
    <Paper
      elevation={0}
      sx={{
        position: 'absolute',
        top: 80,
        right: 16,
        width: { xs: 'calc(100% - 32px)', sm: 360 },
        maxHeight: 'calc(100vh - 100px)',
        overflow: 'auto',
        p: 2,
        background: 'rgba(30, 41, 59, 0.82)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(148, 163, 184, 0.25)',
        borderRadius: 2,
        zIndex: 10,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
        <Box>
          <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 700 }}>
            {layout.boxCode}
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
            {layout.rackName} · {t('locationView')} {layout.levelNo} · {layout.layout}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: '#94a3b8' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
          gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
          gap: 0.75,
        }}
      >
        {Array.from({ length: layout.rows }, (_, r) =>
          Array.from({ length: layout.cols }, (_, c) => {
            const cell = cellMap.get(`${r}-${c}`);
            const highlighted = cell?.highlighted;
            const occupied = Boolean(cell?.product);
            return (
              <Box
                key={`${r}-${c}`}
                sx={{
                  minHeight: 52,
                  p: 0.75,
                  borderRadius: 1,
                  border: highlighted ? `2px solid ${COLORS.highlight}` : '1px solid #475569',
                  bgcolor: highlighted
                    ? 'rgba(59, 130, 246, 0.25)'
                    : occupied
                      ? 'rgba(16, 185, 129, 0.18)'
                      : 'rgba(15, 23, 42, 0.6)',
                  boxShadow: highlighted ? `0 0 12px ${COLORS.highlight}55` : 'none',
                }}
              >
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                  #{cell?.slotNo ?? '—'}
                </Typography>
                {cell?.product && (
                  <Typography
                    variant="caption"
                    display="block"
                    sx={{ color: '#e2e8f0', lineHeight: 1.2, mt: 0.25 }}
                  >
                    {cell.product.name}
                  </Typography>
                )}
              </Box>
            );
          }),
        )}
      </Box>
    </Paper>
  );
}

export function Layout3dPage() {
  const { t, i18n } = useTranslation(['pages', 'common']);
  const [searchParams, setSearchParams] = useSearchParams();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<WarehouseSceneHandle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [audioEnabled, setAudioEnabled] = useState(loadAudioEnabled);
  const [boxLayout, setBoxLayout] = useState<BoxLayout | null>(null);
  const [panelLoading, setPanelLoading] = useState(false);

  const accessToken = useAuthStore((s) => s.accessToken);

  const handleBoxClick = useCallback(async (boxId: number) => {
    const handle = sceneRef.current;
    if (!handle) return;

    setPanelLoading(true);
    try {
      await handle.focusBox(boxId);
      const layout = await getBoxLayout(boxId);
      setBoxLayout(layout);
    } catch {
      setBoxLayout(null);
    } finally {
      setPanelLoading(false);
    }
  }, []);

  const handleHighlight = useCallback(
    async (payload: TvHighlight) => {
      const handle = sceneRef.current;
      if (!handle || !payload?.boxId) return;

      await handle.focusBox(payload.boxId, payload.slotId);
      handle.applyHighlight(payload.boxId, payload.slotId);

      if (payload.slotId) {
        try {
          const layout = await getBoxLayout(payload.boxId, payload.slotId);
          setBoxLayout(layout);
        } catch {
          setBoxLayout(null);
        }
      }

      if (payload.productName) {
        const rack = payload.rackName ?? '';
        const level = payload.levelNo != null ? ` L${payload.levelNo}` : '';
        const box = payload.boxCode ?? '';
        speak(`${payload.productName}, ${rack}${level}, ${box}`, i18n.language, audioEnabled);
      }
    },
    [audioEnabled, i18n.language],
  );

  useSocketEvent<TvHighlight>(SocketEvents.highlightUpdate, handleHighlight, Boolean(accessToken));

  useEffect(() => {
    if (accessToken) {
      getSocket({ token: accessToken });
    }
  }, [accessToken]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const hierarchy = await getHierarchy();
        if (cancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const { initScene, disposeScene } = await import(
          '../../components/layout3d/WarehouseScene'
        );
        const handle = await initScene(canvas, hierarchy, { onBoxClick: handleBoxClick });
        if (cancelled) {
          disposeScene();
          return;
        }
        sceneRef.current = handle;

        const initialSearch = searchParams.get('search') ?? '';
        if (initialSearch) {
          handle.setSearchQuery(initialSearch);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load 3D scene');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      void import('../../components/layout3d/WarehouseScene').then((m) => m.disposeScene());
      sceneRef.current = null;
    };
  }, [handleBoxClick]);

  useEffect(() => {
    const q = search.trim();
    const current = searchParams.get('search') ?? '';
    if (q !== current) {
      const next = new URLSearchParams(searchParams);
      if (q) next.set('search', q);
      else next.delete('search');
      setSearchParams(next, { replace: true });
    }
    sceneRef.current?.setSearchQuery(q);
  }, [search, searchParams, setSearchParams]);

  const toggleAudio = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    localStorage.setItem(AUDIO_KEY, next ? '1' : '0');
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        bgcolor: COLORS.bg,
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
      />

      {loading && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(15, 23, 42, 0.7)',
            zIndex: 20,
          }}
        >
          <CircularProgress sx={{ color: COLORS.primary }} />
        </Box>
      )}

      {error && (
        <Typography
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#f87171',
            zIndex: 20,
          }}
        >
          {error}
        </Typography>
      )}

      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 1.5,
          zIndex: 10,
          background: 'linear-gradient(180deg, rgba(15,23,42,0.92) 0%, rgba(15,23,42,0) 100%)',
        }}
      >
        <Link
          component={RouterLink}
          to="/app"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            color: '#cbd5e1',
            textDecoration: 'none',
            px: 1,
            py: 0.5,
            borderRadius: 1,
            '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
          }}
        >
          <ArrowBackIcon fontSize="small" />
          <Typography variant="body2">{t('common:back')}</Typography>
        </Link>

        <Typography variant="h6" sx={{ color: '#f1f5f9', fontWeight: 700, mr: 1, display: { xs: 'none', sm: 'block' } }}>
          {t('pages:layout3dTitle')}
        </Typography>

        <TextField
          size="small"
          placeholder={t('pages:searchByName')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{
            flex: 1,
            maxWidth: 420,
            '& .MuiOutlinedInput-root': {
              bgcolor: 'rgba(30, 41, 59, 0.85)',
              color: '#f1f5f9',
              '& fieldset': { borderColor: 'rgba(148, 163, 184, 0.35)' },
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#94a3b8' }} />
              </InputAdornment>
            ),
          }}
        />

        <IconButton onClick={toggleAudio} sx={{ color: audioEnabled ? COLORS.success : '#64748b' }}>
          {audioEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
        </IconButton>
      </Box>

      {panelLoading && !boxLayout && (
        <Box sx={{ position: 'absolute', top: 80, right: 16, zIndex: 10 }}>
          <CircularProgress size={28} sx={{ color: COLORS.highlight }} />
        </Box>
      )}

      {boxLayout && (
        <SlotGridPanel layout={boxLayout} onClose={() => setBoxLayout(null)} />
      )}
    </Box>
  );
}
