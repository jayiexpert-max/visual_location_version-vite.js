import SearchIcon from '@mui/icons-material/Search';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import {
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useSocketEvent } from '../../hooks/useSocket';
import { getHierarchy, getBoxLayout } from '../../services/warehouseService';
import { getTvHighlight, type TvHighlight } from '../../services/tvService';
import { SocketEvents } from '../../services/socketService';
import { useAuthStore } from '../../store/authStore';
import type { BoxLayout, HierarchyBox, HierarchyRack, WarehouseHierarchy } from '../../types/warehouse';
import { normalizeBoxLayoutPuids } from '../../utils/boxLayoutPuid';
import { speakKiosk } from '../../utils/kioskTts';
import { useKioskAudio } from '../../hooks/useKioskAudio';
import '../../styles/tv-display.css';

const TV_AUDIO_KEY = 'tv_audio_enabled';
const POLL_INTERVAL_MS = 2000;

function formatClock(date: Date): string {
  return date.toLocaleTimeString('en-GB', { hour12: false });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
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
      ordered[tvSlotIndex(r, c, layout.rows)] = cellByPos.get(`${r}-${c}`) ?? null;
    }
  }
  return ordered;
}

function levelHasHighlight(
  level: HierarchyRack['levels'][0],
  highlight: TvHighlight | null,
): boolean {
  if (!highlight) return false;
  if (highlight.levelNo != null && highlight.levelNo !== level.levelNo) return false;
  
  return level.boxes.some((box) =>
    highlight.boxId ? highlight.boxId === box.id : highlight.boxCode === box.boxCode
  );
}

function RackGrid({
  hierarchy,
  highlight,
  searchMode,
}: {
  hierarchy: WarehouseHierarchy;
  highlight: TvHighlight | null;
  searchMode: boolean;
}) {
  const { t } = useTranslation('pages');

  const racks =
    searchMode && highlight?.rackName
      ? hierarchy.racks.filter((rack) => rack.name === highlight.rackName)
      : hierarchy.racks;

  return (
    <>
      <h2 className="tv-section-title">
        <WarehouseIcon fontSize="small" />
        {t('tvRackOverview')}
      </h2>
      <div className={`tv-rack-grid${searchMode ? ' search-mode' : ''}`}>
        {racks.map((rack) => {
          const rackActive = highlight?.rackName === rack.name;
          return (
            <div key={rack.id} className={`tv-rack${rackActive ? ' highlight-active' : ''}`}>
              <div className="tv-rack-header">Rack: {rack.name}</div>
              {rack.levels.map((level) => {
                const levelActive = levelHasHighlight(level, highlight);
                return (
                  <div
                    key={level.id}
                    className={`tv-level${levelActive ? ' highlight-active' : ''}`}
                  >
                    <div className="tv-level-row">
                      <span className="tv-level-label">L{level.levelNo}</span>
                      <div className="tv-boxes">
                        {level.boxes.map((box) => {
                          const isBoxHighlight = highlight?.boxId
                            ? highlight.boxId === box.id
                            : highlight?.boxCode === box.boxCode && highlight?.levelNo === level.levelNo && highlight?.rackName === rack.name;
                          const occupied = boxOccupied(box);
                          const cls = [
                            'tv-box',
                            isBoxHighlight ? 'highlighted' : occupied ? 'occupied' : 'empty',
                          ].join(' ');
                          return (
                            <div key={box.id} className={cls} title={box.boxCode}>
                              {box.boxCode}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </>
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
      <aside className="tv-detail">
        <div className="tv-waiting">
          <SearchIcon sx={{ fontSize: 48, opacity: 0.35, mb: 1 }} />
          <div>{t('tvWaiting')}</div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="tv-detail">
      <p style={{ color: '#10b981', fontWeight: 700, margin: '0 0 4px', fontSize: '0.75rem' }}>
        {highlight.rackName} · L{highlight.levelNo}
      </p>
      <h3 style={{ margin: '0 0 8px', fontSize: '1.5rem', lineHeight: 1.2 }}>
        {highlight.productName ?? '—'}
      </h3>
      <p style={{ margin: '0 0 12px', color: '#94a3b8', fontSize: '1.1rem' }}>
        {highlight.boxCode} · {t('locationView')}{' '}
        {highlight.slotNo != null ? `#${highlight.slotNo}` : ''}
      </p>

      {highlight.puid && (
        <div className="tv-detail-puid-bar">PUID: {highlight.puid}</div>
      )}

      {highlight.qty > 0 && (
        <p style={{ margin: '0 0 8px', color: '#cbd5e1' }}>Qty: {highlight.qty}</p>
      )}
      {highlight.searchedBy && (
        <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '0.8rem' }}>
          {t('tvSearchedBy')}: {highlight.searchedBy}
        </p>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: 16 }}>
          <CircularProgress size={32} sx={{ color: '#3b82f6' }} />
        </div>
      )}

      {layout && !loading && (
        <>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: 8 }}>{layout.layout}</p>
          <div
            className="tv-slot-grid"
            style={{ gridTemplateColumns: `repeat(${layout.cols}, 1fr)` }}
          >
            {orderedCells.map((cell, idx) => {
              const highlighted = cell?.highlighted;
              const occupied = Boolean(cell?.product);
              const cls = [
                'tv-slot-cell',
                highlighted ? 'highlighted' : occupied ? 'occupied' : 'empty',
              ].join(' ');
              return (
                <div key={cell?.slotId ?? `empty-${idx}`} className={cls}>
                  <div style={{ color: '#94a3b8', fontWeight: 700, fontSize: '0.75rem' }}>
                    #{cell?.slotNo ?? '—'}
                  </div>
                  {cell?.product && (
                    <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.85rem', marginTop: 2 }}>
                      {cell.product.name}
                    </div>
                  )}
                  {cell?.puids && normalizeBoxLayoutPuids(cell.puids).map((item) => (
                    <div
                      key={item.puid}
                      className={`tv-puid-chip${item.isExpired ? ' tv-puid-chip--expired' : item.isNearExpiry ? ' tv-puid-chip--near' : ''}`}
                    >
                      {item.puid}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}
    </aside>
  );
}

export function TvDisplayPage() {
  const { t, i18n } = useTranslation(['pages', 'common']);
  const [searchParams, setSearchParams] = useSearchParams();

  const tvKey = searchParams.get('tv_key') ?? import.meta.env.VITE_TV_KIOSK_KEY ?? undefined;
  const langParam = searchParams.get('lang');
  const accessToken = useAuthStore((s) => s.accessToken);
  const liveEnabled = Boolean(tvKey || accessToken);
  const socketAuth = useMemo(
    () => (tvKey ? { kioskKey: tvKey } : accessToken ? { token: accessToken } : undefined),
    [accessToken, tvKey],
  );
  const { enabled: soundEnabled, toggle: toggleSound } = useKioskAudio(
    TV_AUDIO_KEY,
    i18n.language,
    searchParams,
    'tv',
    ['tv_sound_enabled'],
  );

  const [clock, setClock] = useState(() => formatClock(new Date()));
  const [today, setToday] = useState(() => formatDate(new Date()));
  const [hierarchy, setHierarchy] = useState<WarehouseHierarchy | null>(null);
  const [highlight, setHighlight] = useState<TvHighlight | null>(null);
  const [boxLayout, setBoxLayout] = useState<BoxLayout | null>(null);
  const [layoutLoading, setLayoutLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const lastSeqRef = useRef<string | null>(null);
  const highlightRef = useRef<TvHighlight | null>(null);
  highlightRef.current = highlight;

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
        if (payload.boxId) {
          const isTh = i18n.language.startsWith('th');
          const rack = payload.rackName ? `${isTh ? 'ชั้นวางที่ ' : 'Rack '}${payload.rackName}` : '';
          const level = payload.levelNo != null ? `${isTh ? ' ชั้นที่ ' : ' Level '}${payload.levelNo}` : '';
          const box = payload.boxCode ? `${isTh ? ' กล่อง ' : ' Box '}${payload.boxCode}` : '';
          const slot = payload.slotNo != null ? `${isTh ? ' ช่องที่ ' : ' Slot '}${payload.slotNo}` : '';
          
          const textToSpeak = [rack, level, box, slot].filter(Boolean).join(', ');
          
          if (textToSpeak) {
            speakKiosk(
              textToSpeak,
              i18n.language,
              soundEnabled,
            );
          }
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
    const timer = setInterval(() => {
      const now = new Date();
      setClock(formatClock(now));
      setToday(formatDate(now));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useSocketEvent<TvHighlight | null>(
    SocketEvents.highlightUpdate,
    (payload) => void applyHighlight(payload),
    liveEnabled,
    socketAuth,
  );

  useSocketEvent<null>(
    SocketEvents.highlightClear,
    () => {
      lastSeqRef.current = null;
      setHighlight(null);
      setBoxLayout(null);
    },
    liveEnabled,
    socketAuth,
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadError(null);
        const hier = await getHierarchy(tvKey);
        if (cancelled) return;
        setHierarchy(hier);
      } catch (err) {
        if (!cancelled) {
          setHierarchy(null);
          setLoadError(err instanceof Error ? err.message : 'Failed to load warehouse data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tvKey]);

  useEffect(() => {
    if (!liveEnabled) return;
    let cancelled = false;
    (async () => {
      try {
        const current = await getTvHighlight(tvKey);
        if (cancelled || !current) return;
        lastSeqRef.current = current.highlightSeq;
        await applyHighlight(current);
      } catch {
        // poll/socket is primary; ignore transient highlight fetch errors
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tvKey, liveEnabled, applyHighlight]);

  useEffect(() => {
    if (!liveEnabled) return;
    const interval = setInterval(() => {
      void getTvHighlight(tvKey)
        .then((current) => {
          if (!current) {
            if (highlightRef.current) {
              lastSeqRef.current = null;
              setHighlight(null);
              setBoxLayout(null);
            }
            return;
          }
          if (current.highlightSeq !== lastSeqRef.current) {
            void applyHighlight(current);
          }
        })
        .catch(() => {
          // ignore rate-limit / network blips on background poll
        });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [tvKey, liveEnabled, applyHighlight]);

  const setLang = (_: React.MouseEvent<HTMLElement>, value: string | null) => {
    if (!value || (value !== 'th' && value !== 'en')) return;
    void i18n.changeLanguage(value);
    const next = new URLSearchParams(searchParams);
    next.set('lang', value);
    setSearchParams(next, { replace: true });
  };

  const toggleSoundWithUrl = () => {
    toggleSound();
    const next = !soundEnabled;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('sound', next ? '1' : '0');
    setSearchParams(nextParams, { replace: true });
  };

  const searchMode = Boolean(highlight);

  return (
    <div className="tv-page">
      <header className="tv-header">
        <div>
          <h1 className="tv-header-title">{t('pages:tvTitle')}</h1>
          <p className="tv-header-subtitle">{t('pages:tvSubtitle')}</p>
        </div>
        <div className="tv-header-controls">
          <ToggleButtonGroup
            size="small"
            value={i18n.language.startsWith('th') ? 'th' : 'en'}
            exclusive
            onChange={setLang}
            sx={{
              '& .MuiToggleButton-root': {
                color: 'rgba(255,255,255,0.85)',
                borderColor: 'rgba(255,255,255,0.35)',
                px: 2,
                '&.Mui-selected': { bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' },
              },
            }}
          >
            <ToggleButton value="th">TH</ToggleButton>
            <ToggleButton value="en">EN</ToggleButton>
          </ToggleButtonGroup>
          <button
            type="button"
            className={`tv-sound-btn${soundEnabled ? ' active' : ''}`}
            onClick={toggleSoundWithUrl}
          >
            {soundEnabled ? <VolumeUpIcon fontSize="small" /> : <VolumeOffIcon fontSize="small" />}
            <span>{soundEnabled ? t('pages:tvSoundActive') : t('pages:tvSoundEnable')}</span>
          </button>
          <div className="tv-clock-block">
            <div className="tv-date">{today}</div>
            <div className="tv-clock">{clock}</div>
          </div>
        </div>
      </header>

      {highlight && (
        <div className="tv-alert">
          <div className="tv-alert-inner">
            <div className="tv-alert-icon">🔍</div>
            <div>
              <p className="tv-alert-product">{t('pages:tvSearchAlert')}</p>
              <p className="tv-alert-path">
                {highlight.productName ?? highlight.boxCode} — {highlight.rackName} L
                {highlight.levelNo} · {highlight.boxCode}
                {highlight.slotNo != null ? ` #${highlight.slotNo}` : ''}
              </p>
              <p className="tv-alert-meta">
                {highlight.puid && (
                  <>
                    <span className="tv-alert-puid">PUID {highlight.puid}</span>
                    {' · '}
                  </>
                )}
                {highlight.qty > 0 && <>Qty {highlight.qty} · </>}
                {highlight.searchedBy && (
                  <>
                    {t('pages:tvSearchedBy')}: {highlight.searchedBy}
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className={`tv-body${searchMode ? ' search-mode' : ''}`}>
        <div className="tv-main">
          {loading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress sx={{ color: '#4f46e5' }} />
            </div>
          ) : loadError ? (
            <div className="tv-waiting">
              <div style={{ color: '#f87171', marginBottom: 8 }}>{loadError}</div>
              <div>{t('pages:tvLoadErrorHint')}</div>
            </div>
          ) : hierarchy && hierarchy.racks.length === 0 ? (
            <div className="tv-waiting">
              <WarehouseIcon sx={{ fontSize: 48, opacity: 0.35, mb: 1 }} />
              <div>{t('pages:tvNoRacks')}</div>
            </div>
          ) : hierarchy ? (
            <RackGrid hierarchy={hierarchy} highlight={highlight} searchMode={searchMode} />
          ) : null}
        </div>
        {searchMode && (
          <DetailPanel highlight={highlight} layout={boxLayout} loading={layoutLoading} />
        )}
      </div>

      <footer className="tv-status-bar">
        <div className="tv-status-live">
          <span className={`tv-status-dot${liveEnabled ? '' : ' offline'}`} />
          <span>{liveEnabled ? t('pages:tvStatusLive') : t('pages:tvKioskKeyHint')}</span>
        </div>
        <span>{t('pages:tvAutoRefresh')}</span>
      </footer>
    </div>
  );
}
