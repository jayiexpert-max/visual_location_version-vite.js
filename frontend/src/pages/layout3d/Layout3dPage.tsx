import CloseIcon from '@mui/icons-material/Close';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import type { WarehouseSceneHandle } from '../../components/layout3d/WarehouseScene';
import { useSocketEvent } from '../../hooks/useSocket';
import { searchResolve } from '../../services/inventoryService';
import { getHierarchy, getBoxLayout } from '../../services/warehouseService';
import { SocketEvents } from '../../services/socketService';
import { getTvHighlight, clearTvHighlight, type TvHighlight } from '../../services/tvService';
import { useAuthStore } from '../../store/authStore';
import type { BoxLayout } from '../../types/warehouse';
import { speakKiosk } from '../../utils/kioskTts';
import { useKioskAudio } from '../../hooks/useKioskAudio';
import {
  isHighlightExpired,
  useHighlightExpiryTimer,
} from '../../hooks/useHighlightExpiryTimer';
import * as ioService from '../../services/ioService';
import '../../styles/layout3d-kiosk.css';

const AUDIO_KEY = 'layout_audio_enabled';
const POLL_INTERVAL_MS = 2000;
const COLORS = {
  bg: '#0f172a',
  primary: '#4f46e5',
  highlight: '#3b82f6',
  success: '#10b981',
};

function speak(text: string, lang: string, enabled: boolean): void {
  speakKiosk(text, lang, enabled);
}

function LocationPath({
  rackName,
  levelNo,
  boxCode,
  slotNo,
  activeSlot,
}: {
  rackName: string;
  levelNo: string | number;
  boxCode: string;
  slotNo?: string | number | null;
  activeSlot?: boolean;
}) {
  const { t } = useTranslation('pages');

  return (
    <div className="layout3d-location-path">
      <div className="layout3d-location-step">
        <span className="layout3d-step-label">{t('layout3dRack')}:</span>
        <span className="layout3d-step-val">{rackName}</span>
      </div>
      <div className="layout3d-location-step">
        <span className="layout3d-step-label">{t('layout3dLevel')}:</span>
        <span className="layout3d-step-val">{levelNo}</span>
      </div>
      <div className="layout3d-location-step">
        <span className="layout3d-step-label">{t('layout3dBoxCode')}:</span>
        <span className="layout3d-step-val">{boxCode}</span>
      </div>
      {slotNo != null && (
        <div className="layout3d-location-step">
          <span className="layout3d-step-label">{t('layout3dSlotNo')}:</span>
          <span className={`layout3d-step-val${activeSlot ? ' active' : ''}`}>{slotNo}</span>
        </div>
      )}
    </div>
  );
}

function BoxInfoPanel({
  layout,
  highlight,
  onClose,
}: {
  layout: BoxLayout;
  highlight: TvHighlight | null;
  onClose: () => void;
}) {
  const { t } = useTranslation('pages');

  const highlightedCell = layout.cells.find((c) => c.highlighted);
  const hasLiveHighlight =
    Boolean(highlightedCell) ||
    (highlight != null && highlight.boxId === layout.boxId);

  const rackName = layout.rackName ?? '—';
  const levelNo = layout.levelNo ?? '—';
  const itemsCount = layout.cells.filter((c) => c.product).length;

  return (
    <div className="layout3d-info-panel active">
      <div className="layout3d-panel-header">
        <span>{layout.boxCode}</span>
        <IconButton size="small" onClick={onClose} className="layout3d-panel-close" aria-label="close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </div>

      <div className="layout3d-panel-content">
        {hasLiveHighlight ? (
          <>
            <div className="layout3d-product-highlight">
              <div className="layout3d-highlight-title">{t('layout3dFoundProduct')}</div>
              <div className="layout3d-product-name">
                {highlight?.productName ?? highlightedCell?.product?.name ?? '—'}
              </div>
            </div>

            {highlight?.puid?.trim() && (
              <div className="layout3d-puid-highlight">
                <div className="layout3d-highlight-title">{t('layout3dPuid')}</div>
                <div className="layout3d-puid-val">{highlight.puid.trim()}</div>
              </div>
            )}

            <LocationPath
              rackName={highlight?.rackName ?? rackName}
              levelNo={highlight?.levelNo ?? levelNo}
              boxCode={highlight?.boxCode ?? layout.boxCode}
              slotNo={highlightedCell?.slotNo ?? highlight?.slotNo ?? '—'}
              activeSlot
            />

            <div className="layout3d-qty-box">
              <span className="layout3d-qty-label">{t('layout3dQty')}</span>
              <span
                className={`layout3d-qty-val${
                  (highlightedCell?.product?.qty ?? highlight?.qty ?? 0) === 0 ? ' zero' : ''
                }`}
              >
                {highlightedCell?.product?.qty ?? highlight?.qty ?? 0}
              </span>
            </div>
          </>
        ) : (
          <>
            <LocationPath rackName={rackName} levelNo={levelNo} boxCode={layout.boxCode} />

            <div className="layout3d-detail-row">
              <span className="layout3d-detail-label">{t('layout3dLayoutConfig')}</span>
              <span className="layout3d-detail-value">{layout.layout}</span>
            </div>

            <div className="layout3d-panel-divider" />

            <div className="layout3d-detail-row">
              <span className="layout3d-detail-label">{t('layout3dTotalItems')}</span>
              <span className={`layout3d-detail-value${itemsCount > 0 ? ' ok' : ' empty'}`}>
                {itemsCount} {t('layout3dStored')}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function Layout3dPage() {
  const { t, i18n } = useTranslation('pages');
  const [searchParams, setSearchParams] = useSearchParams();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<WarehouseSceneHandle | null>(null);
  const lastSeqRef = useRef<string | null>(null);
  const liveHighlightRef = useRef<TvHighlight | null>(null);
  const { schedule: scheduleHighlightExpiry, clearTimer: clearHighlightExpiry } =
    useHighlightExpiryTimer();

  const tvKey = searchParams.get('tv_key') ?? import.meta.env.VITE_TV_KIOSK_KEY ?? undefined;
  const langParam = searchParams.get('lang');
  const accessToken = useAuthStore((s) => s.accessToken);
  const socketEnabled = true;
  const socketAuth = useMemo(
    () => (tvKey ? { kioskKey: tvKey } : accessToken ? { token: accessToken } : undefined),
    [accessToken, tvKey],
  );
  const { enabled: audioEnabled, toggle: toggleAudio } = useKioskAudio(
    AUDIO_KEY,
    i18n.language,
    searchParams,
    '3d',
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [boxLayout, setBoxLayout] = useState<BoxLayout | null>(null);
  const [liveHighlight, setLiveHighlight] = useState<TvHighlight | null>(null);
  const [panelLoading, setPanelLoading] = useState(false);

  useEffect(() => {
    if (langParam === 'th' || langParam === 'en') {
      void i18n.changeLanguage(langParam);
    }
  }, [langParam, i18n]);

  const announceHighlight = useCallback(
    (payload: TvHighlight) => {
      if (payload.boxId) {
        const isTh = i18n.language.startsWith('th');
        const rack = payload.rackName ? `${isTh ? 'ชั้นวางที่ ' : 'Rack '}${payload.rackName}` : '';
        const level = payload.levelNo != null ? `${isTh ? ' ชั้นที่ ' : ' Level '}${payload.levelNo}` : '';
        const box = payload.boxCode ? `${isTh ? ' กล่อง ' : ' Box '}${payload.boxCode}` : '';
        const slot = payload.slotNo != null ? `${isTh ? ' ช่องที่ ' : ' Slot '}${payload.slotNo}` : '';
        
        const textToSpeak = [rack, level, box, slot].filter(Boolean).join(', ');
        
        if (textToSpeak) {
          speak(textToSpeak, i18n.language, audioEnabled);
        }
      }
    },
    [audioEnabled, i18n.language],
  );

  const clearHighlightView = useCallback(() => {
    clearHighlightExpiry();
    lastSeqRef.current = null;
    liveHighlightRef.current = null;
    setLiveHighlight(null);
    setBoxLayout(null);
    sceneRef.current?.clearHighlight();
    sceneRef.current?.resetCamera();
  }, [clearHighlightExpiry]);

  const handleHighlightExpired = useCallback(() => {
    clearHighlightView();
    void clearTvHighlight().catch(() => {});
    void ioService.ioReset().catch(() => {});
  }, [clearHighlightView]);

  const handleHighlight = useCallback(
    async (payload: TvHighlight | null) => {
      const handle = sceneRef.current;

      if (!payload?.boxId || isHighlightExpired(payload.expiresAt)) {
        clearHighlightView();
        return;
      }

      liveHighlightRef.current = payload;
      setLiveHighlight(payload);
      scheduleHighlightExpiry(payload.expiresAt, () => {
        void handleHighlightExpired();
      });

      if (!handle) return;

      setPanelLoading(true);
      await handle.applyTvHighlight({
        productName: payload.productName,
        puid: payload.puid,
        rackName: payload.rackName,
        levelNo: payload.levelNo,
        boxCode: payload.boxCode,
        boxId: payload.boxId,
        slotId: payload.slotId,
        slotNo: payload.slotNo,
        qty: payload.qty,
        highlightSeq: payload.highlightSeq,
      });

      if (payload.highlightSeq && payload.highlightSeq !== lastSeqRef.current) {
        lastSeqRef.current = payload.highlightSeq;
        announceHighlight(payload);
      }
    },
    [announceHighlight, clearHighlightView, handleHighlightExpired, scheduleHighlightExpiry],
  );

  useSocketEvent<TvHighlight>(
    SocketEvents.highlightUpdate,
    (payload) => {
      void handleHighlight(payload);
    },
    socketEnabled,
    socketAuth,
  );

  useSocketEvent<null>(
    SocketEvents.highlightClear,
    () => {
      clearHighlightView();
    },
    socketEnabled,
    socketAuth,
  );

  useEffect(() => {
    let cancelled = false;
    let localDispose: (() => void) | null = null;

    (async () => {
      try {
        const hierarchy = await getHierarchy(tvKey);
        if (cancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const { initScene, disposeScene } = await import(
          '../../components/layout3d/WarehouseScene'
        );
        
        if (cancelled) return;
        localDispose = disposeScene;

        const handle = await initScene(canvas, hierarchy, {
          fetchBoxLayout: (boxId, slotId) => getBoxLayout(boxId, slotId, tvKey),
          onBoxFocused: (_boxId, layout) => {
            setBoxLayout(layout);
            setPanelLoading(false);
          },
          onFocusCleared: () => {
            setBoxLayout(null);
            setPanelLoading(false);
          },
        });
        if (cancelled) {
          disposeScene();
          return;
        }
        sceneRef.current = handle;

        const initialSearch = searchParams.get('search') ?? '';
        if (initialSearch) {
          const resolved = await searchResolve(initialSearch, tvKey);
          if (!cancelled && resolved.status === 'success' && resolved.data) {
            const d = resolved.data;
            await handle.applyTvHighlight({
              productName: d.hanaPart,
              puid: d.puid || null,
              boxId: d.boxId,
              slotId: d.slotId,
              slotNo: d.slotNo,
              rackName: d.rackName,
              levelNo: Number(d.levelNo) || null,
              boxCode: d.boxCode,
              qty: d.qty,
              highlightSeq: `search-${initialSearch}`,
            });
          } else if (!cancelled) {
            handle.setSearchQuery(initialSearch);
          }
        }

        if (!cancelled) {
          const current = await getTvHighlight(tvKey);
          if (current && !isHighlightExpired(current.expiresAt)) {
            lastSeqRef.current = current.highlightSeq;
            liveHighlightRef.current = current;
            setLiveHighlight(current);
            scheduleHighlightExpiry(current.expiresAt, () => {
              void handleHighlightExpired();
            });
            await handle.applyTvHighlight({
              productName: current.productName,
              puid: current.puid,
              boxId: current.boxId,
              slotId: current.slotId,
              slotNo: current.slotNo,
              rackName: current.rackName,
              levelNo: current.levelNo,
              boxCode: current.boxCode,
              qty: current.qty,
              highlightSeq: current.highlightSeq,
            });
            announceHighlight(current);
          }
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
      if (localDispose) {
        localDispose();
      }
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scene init once per kiosk key
  }, [tvKey, announceHighlight]);

  useEffect(() => {
    const interval = setInterval(() => {
      void getTvHighlight(tvKey).then((current) => {
        if (!current || isHighlightExpired(current.expiresAt)) {
          if (liveHighlightRef.current) {
            clearHighlightView();
          }
          return;
        }
        if (current.highlightSeq !== lastSeqRef.current) {
          void handleHighlight(current);
        }
      });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [tvKey, handleHighlight, clearHighlightView]);

  const resetView = () => {
    setBoxLayout(null);
    sceneRef.current?.resetCamera();
  };

  const setLang = (_: React.MouseEvent<HTMLElement>, value: string | null) => {
    if (!value || (value !== 'th' && value !== 'en')) return;
    void i18n.changeLanguage(value);
    const next = new URLSearchParams(searchParams);
    next.set('lang', value);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="layout3d-page">
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
      />

      {loading && (
        <div className="layout3d-loading">
          <CircularProgress sx={{ color: COLORS.primary }} />
          <span>{t('layout3dLoading')}</span>
        </div>
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

      {liveHighlight && (
        <div className="layout3d-hl-banner">
          {liveHighlight.productName ?? liveHighlight.boxCode}
          {liveHighlight.puid ? ` · ${liveHighlight.puid}` : ''} — {liveHighlight.rackName} L
          {liveHighlight.levelNo} · {liveHighlight.boxCode}
        </div>
      )}

      <div className="layout3d-toolbar">
        <div className="layout3d-title-block">
          <h1>{t('layout3dTitle')}</h1>
          <p>{t('layout3dSubtitle')}</p>
        </div>

        <span className={`layout3d-monitor-badge${socketEnabled ? '' : ' offline'}`}>
          <span className="layout3d-monitor-dot" />
          {socketEnabled ? t('layout3dMonitoring') : t('tvKioskKeyHint')}
        </span>

        <ToggleButtonGroup
          size="small"
          value={i18n.language.startsWith('th') ? 'th' : 'en'}
          exclusive
          onChange={setLang}
          sx={{
            '& .MuiToggleButton-root': {
              color: '#94a3b8',
              borderColor: '#475569',
              px: 1.5,
              py: 0.25,
              fontSize: '0.75rem',
              '&.Mui-selected': { bgcolor: COLORS.primary, color: '#fff' },
            },
          }}
        >
          <ToggleButton value="th">TH</ToggleButton>
          <ToggleButton value="en">EN</ToggleButton>
        </ToggleButtonGroup>

        <Button
          size="small"
          variant="outlined"
          startIcon={<MyLocationIcon />}
          onClick={() => void resetView()}
          sx={{ color: '#cbd5e1', borderColor: '#475569', display: { xs: 'none', md: 'inline-flex' } }}
        >
          {t('layout3dResetView')}
        </Button>

        <button
          type="button"
          className={`layout3d-sound-btn${audioEnabled ? ' active' : ''}`}
          onClick={toggleAudio}
        >
          {audioEnabled ? <VolumeUpIcon fontSize="small" /> : <VolumeOffIcon fontSize="small" />}
          <span>{audioEnabled ? t('layout3dSoundActive') : t('layout3dSoundEnable')}</span>
        </button>
      </div>

      {panelLoading && !boxLayout && (
        <Box sx={{ position: 'absolute', top: 80, right: 16, zIndex: 10 }}>
          <CircularProgress size={28} sx={{ color: COLORS.highlight }} />
        </Box>
      )}

      {boxLayout && (
        <BoxInfoPanel
          layout={boxLayout}
          highlight={liveHighlight}
          onClose={() => {
            setBoxLayout(null);
            if (!liveHighlight) {
              sceneRef.current?.clearHighlight();
            }
          }}
        />
      )}
    </div>
  );
}
