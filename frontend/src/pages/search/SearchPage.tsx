import { useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../components/layout/PageHeader';
import * as inventoryService from '../../services/inventoryService';
import * as ioService from '../../services/ioService';
import * as tvService from '../../services/tvService';
import { getErrorMessage } from '../../services/apiClient';
import { normalizePuidInput } from '../../utils/reservationUtils';
import { useSocketEvent } from '../../hooks/useSocket';
import { SocketEvents } from '../../services/socketService';
import { useAuthStore } from '../../store/authStore';
import { RackOverviewSection } from '../rack/RackOverviewSection';

export function SearchPage() {
  const { t } = useTranslation(['pages', 'common']);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [result, setResult] = useState<inventoryService.SearchResolveData | null>(null);
  const [message, setMessage] = useState<{ kind: 'success' | 'warning'; html: string } | null>(
    null,
  );
  const [rackView, setRackView] = useState<'grid' | 'table'>('grid');
  const autoClearTimerRef = useRef<number | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const buildSuccessMessage = useCallback(
    (data: inventoryService.SearchResolveData) => {
      const locationLine = '📦 Rack: <b>' + data.rackName + '</b> → Level: <b>' + data.levelNo + '</b> → Box: <b>' + data.boxCode + '</b> → Slot: <b>' + data.slotNo + '</b>';
      if (data.searchMode === 'puid') {
        return '🔍 ' + t('pages:searchPuidFound') + ': <b>"' + data.puid + '"</b><br>' +
          '          HanaPart: <b>' + data.hanaPart + '</b><br>' +
          '          ' + locationLine + '<br>' +
          '          ' + t('pages:searchPuidCount') + ': <b>' + (data.puidCount ?? data.qty) + '</b>';
      }
      return '🔍 ' + t('pages:searchProductFound') + ' <b>"' + data.hanaPart + '"</b><br>' +
        '        ' + locationLine + '<br>' +
        '        ' + t('pages:searchPuidCount') + ': <b>' + (data.puidCount ?? data.qty) + '</b>';
    },
    [t],
  );

  const clearAutoClearTimer = useCallback(() => {
    if (autoClearTimerRef.current !== null) {
      window.clearTimeout(autoClearTimerRef.current);
      autoClearTimerRef.current = null;
    }
  }, []);

  const clearSearchState = useCallback(() => {
    clearAutoClearTimer();
    setQuery('');
    setResult(null);
    setMessage(null);
    inputRef.current?.focus();
  }, [clearAutoClearTimer]);

  const handleTimedClear = useCallback(async () => {
    clearAutoClearTimer();
    setResult(null);
    setMessage(null);
    try {
      await tvService.clearTvHighlight();
    } catch {
      // ignore
    }
    try {
      await ioService.ioReset();
    } catch {
      // ignore
    }
    inputRef.current?.focus();
  }, [clearAutoClearTimer]);

  const scheduleAutoClear = useCallback((expiresAt?: string) => {
    clearAutoClearTimer();
    if (!expiresAt) return;

    const expiresMs = new Date(expiresAt).getTime();
    if (Number.isNaN(expiresMs)) return;

    const delay = Math.max(0, expiresMs - Date.now());
    autoClearTimerRef.current = window.setTimeout(() => {
      void handleTimedClear();
    }, delay);
  }, [clearAutoClearTimer, handleTimedClear]);

  useEffect(() => () => clearAutoClearTimer(), [clearAutoClearTimer]);

  const searchMutation = useMutation({
    mutationFn: async (term: string) => {
      const response = await inventoryService.searchResolve(term);
      if (response.status !== 'success' || !response.data) {
        throw new Error(response.message ?? t('common:error'));
      }
      return response.data;
    },
    onSuccess: async (data) => {
      setResult(data);
      setMessage({ kind: 'success', html: buildSuccessMessage(data) });

      try {
        const highlight = await tvService.setTvHighlight({
          productName: data.hanaPart,
          puid: data.puid || undefined,
          boxId: data.boxId,
          slotId: data.slotId || undefined,
          slotNo: data.slotNo || undefined,
          rackName: data.rackName,
          levelNo: data.levelNo,
          boxCode: data.boxCode,
          qty: data.qty,
          actionType: 'highlight',
        });
        scheduleAutoClear(highlight.expiresAt);
      } catch {
        // non-fatal — location still shown on rack map
      }

      try {
        await ioService.ioHighlight({ boxId: data.boxId, slotNo: data.slotNo });
      } catch {
        // non-fatal — IO light control optional
      }
    },
    onError: (err, term) => {
      clearAutoClearTimer();
      setResult(null);
      const msg = getErrorMessage(err, t('common:error'), t);
      setMessage({
        kind: 'warning',
        html: `❌ ${t('pages:searchNotFound')}: <b>"${term}"</b> (${t('pages:searchNotFoundHint')})<br><small>${msg}</small>`,
      });
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const term = normalizePuidInput(query);
    if (!term || searchMutation.isPending) return;
    clearAutoClearTimer();
    setQuery(term);
    setMessage(null);
    searchMutation.mutate(term);
  };

  const accessToken = useAuthStore((s) => s.accessToken);
  const socketAuth = useMemo(
    () => (accessToken ? { token: accessToken } : undefined),
    [accessToken],
  );

  const clearStateLocally = clearSearchState;

  useSocketEvent<null>(
    SocketEvents.highlightClear,
    () => {
      clearStateLocally();
    },
    Boolean(accessToken),
    socketAuth,
  );

  const handleClear = async () => {
    clearStateLocally();
    try {
      await tvService.clearTvHighlight();
    } catch {
      // ignore
    }
    try {
      await ioService.ioReset();
    } catch {
      // ignore
    }
  };

  const handleResetLights = async () => {
    try {
      await ioService.ioReset();
    } catch {
      // ignore
    }
  };

  const highlightBoxId = result?.boxId ?? null;
  const highlightSlotId = result?.slotId ?? null;

  return (
    <div className="fx-scan-page">
      <PageHeader title={t('searchTitle')} />

      {message && (
        <div
          className={`message ${message.kind}`}
          dangerouslySetInnerHTML={{ __html: message.html }}
        />
      )}

      <div className="fx-scan-toolbar fx-scan-toolbar--search">
        <div className="fx-search-view-toggle fx-search-view-toggle--right">
          <button
            type="button"
            className="fx-btn fx-btn-secondary"
            onClick={() => setRackView((current) => (current === 'grid' ? 'table' : 'grid'))}
          >
            <i className={`fas ${rackView === 'grid' ? 'fa-table' : 'fa-th-large'}`} />{' '}
            {rackView === 'grid' ? t('pages:rackViewTable') : t('pages:rackViewGrid')}
          </button>
          <button
            type="button"
            className="fx-btn fx-btn-danger"
            onClick={() => void handleResetLights()}
          >
            <i className="fas fa-lightbulb" /> {t('pages:searchResetLights')}
          </button>
        </div>
      </div>

      <form id="searchForm" className="fade-in" onSubmit={handleSubmit}>
        <div className="fx-form-panel fx-search-panel">
          <label htmlFor="searchInput" className="fx-search-panel__title">
            {t('pages:searchInputLabel')}
          </label>
          <div className="fx-scan-row">
            <div className="fx-search-field">
              <input
                ref={inputRef}
                type="text"
                name="product_name"
                id="searchInput"
                className="fx-scan-input"
                placeholder={t('pages:searchPlaceholder')}
                value={query}
                required
                autoComplete="off"
                disabled={searchMutation.isPending}
                onChange={(e) => setQuery(normalizePuidInput(e.target.value))}
              />
              {searchMutation.isPending && (
                <div className="fx-search-loader" aria-hidden="true">
                  <i className="fas fa-circle-notch fa-spin" />
                </div>
              )}
            </div>
            <button
              type="submit"
              className="fx-btn fx-btn-accent"
              id="btnSearch"
              disabled={searchMutation.isPending}
            >
              <i className="fas fa-search" /> {t('common:search')}
            </button>
            <button type="button" className="fx-btn fx-btn-secondary" onClick={handleClear}>
              <i className="fas fa-eraser" /> {t('pages:searchClear')}
            </button>
          </div>
        </div>
      </form>

      <section className="fx-rack-section">
        <RackOverviewSection
          highlightBoxId={highlightBoxId ?? undefined}
          highlightSlotId={highlightSlotId ?? undefined}
          showTitle={false}
          view={rackView}
          onViewChange={setRackView}
          showToolbar={false}
          quantityMode="puid"
        />
      </section>
    </div>
  );
}
