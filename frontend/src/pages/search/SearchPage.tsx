import { useMutation, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as inventoryService from '../../services/inventoryService';
import * as ioService from '../../services/ioService';
import * as tvService from '../../services/tvService';
import * as warehouseService from '../../services/warehouseService';
import { getErrorMessage } from '../../services/apiClient';
import { normalizePuidInput } from '../../utils/reservationUtils';
import { arrangeSlotsByLayout, rackSlotGridCols } from '../../utils/rackSlotLayout';
import type { BoxLayout, WarehouseHierarchy } from '../../types/warehouse';
import { useSocketEvent } from '../../hooks/useSocket';
import { SocketEvents } from '../../services/socketService';
import { useAuthStore } from '../../store/authStore';

export function SearchPage() {
  const { t } = useTranslation(['pages', 'common']);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [result, setResult] = useState<inventoryService.SearchResolveData | null>(null);
  const [message, setMessage] = useState<{ kind: 'success' | 'warning'; html: string } | null>(
    null,
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [modalHighlightSlotId, setModalHighlightSlotId] = useState(0);
  const [modalLayout, setModalLayout] = useState<BoxLayout | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const hierarchyQuery = useQuery({
    queryKey: ['warehouse-hierarchy', 'search'],
    queryFn: () => warehouseService.getHierarchy(),
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const buildSuccessMessage = useCallback(
    (data: inventoryService.SearchResolveData) => {
      const locationLine = `📦 Rack: <b>${data.rackName}</b> → Level: <b>${data.levelNo}</b> → Box: <b>${data.boxCode}</b> → Slot: <b>${data.slotNo}</b>`;
      if (data.searchMode === 'puid') {
        return `🔍 ${t('pages:searchPuidFound')}: <b>"${data.puid}"</b><br>
          HanaPart: <b>${data.hanaPart}</b><br>
          ${locationLine}<br>
          ${t('pages:searchQtyRemain')}: <b>${data.qty}</b>`;
      }
      return `🔍 ${t('pages:searchProductFound')} <b>"${data.hanaPart}"</b><br>
        ${locationLine}<br>
        ${t('pages:searchQtyRemain')}: <b>${data.qty}</b>`;
    },
    [t],
  );

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

      // Push highlight directly to TV with the already-resolved location data.
      // Avoid re-resolving via /inventory/highlight which may fail silently
      // if the product is not in v_inventory_location.
      try {
        await tvService.setTvHighlight({
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
    setQuery(term);
    setMessage(null);
    searchMutation.mutate(term);
  };

  const accessToken = useAuthStore((s) => s.accessToken);
  const socketAuth = useMemo(
    () => (accessToken ? { token: accessToken } : undefined),
    [accessToken],
  );

  const clearStateLocally = useCallback(() => {
    setQuery('');
    setResult(null);
    setMessage(null);
    setModalOpen(false);
    inputRef.current?.focus();
  }, []);

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

  const openBoxModal = async (boxId: number, highlightSlotId: number) => {
    setModalHighlightSlotId(highlightSlotId);
    setModalOpen(true);
    setModalLoading(true);
    setModalError(null);
    setModalLayout(null);

    try {
      const layout = await warehouseService.getBoxLayout(
        boxId,
        highlightSlotId > 0 ? highlightSlotId : undefined,
      );
      setModalLayout(layout);
    } catch (err) {
      setModalError(getErrorMessage(err, t('common:error'), t));
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalLayout(null);
    setModalError(null);
  };

  const hierarchy = hierarchyQuery.data;
  const highlightBoxId = result?.boxId ?? 0;
  const highlightSlotId = result?.slotId ?? 0;

  const modalCells = useMemo(() => {
    if (!modalLayout) return [];
    const sorted = [...modalLayout.cells].sort((a, b) => a.slotNo - b.slotNo);
    return arrangeSlotsByLayout(sorted, modalLayout.layout);
  }, [modalLayout]);

  const modalGridCols = modalLayout ? rackSlotGridCols(modalLayout.layout) : 1;

  return (
    <div className="fx-scan-page">
      {message && (
        <div
          className={`message ${message.kind}`}
          dangerouslySetInnerHTML={{ __html: message.html }}
        />
      )}

      <div className="fx-scan-toolbar">
        <button type="button" className="fx-btn fx-btn-secondary" onClick={handleClear}>
          <i className="fas fa-eraser" /> {t('pages:searchClear')}
        </button>
        <button type="button" className="fx-btn fx-btn-danger" onClick={() => void handleResetLights()}>
          <i className="fas fa-lightbulb" /> {t('pages:searchResetLights')}
        </button>
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
            <button type="submit" className="fx-btn fx-btn-accent" id="btnSearch" disabled={searchMutation.isPending}>
              <i className="fas fa-search" /> {t('common:search')}
            </button>
          </div>
        </div>
      </form>

      <section className="fx-rack-section">
        <h3 className="fx-section-title">{t('pages:searchRackOverview')}</h3>

        {hierarchyQuery.isLoading && (
          <p className="message warning">{t('common:loading')}</p>
        )}

        {hierarchy && (
          <div className="fx-rack-layout">
            {hierarchy.racks.map((rack, rackIndex) => (
              <RackCard
                key={rack.id}
                rack={rack}
                delay={rackIndex * 0.1}
                highlightBoxId={highlightBoxId}
                highlightSlotId={highlightSlotId}
                onBoxClick={(boxId, slotId) => void openBoxModal(boxId, slotId)}
              />
            ))}
          </div>
        )}
      </section>

      <div
        className={`fx-rack-modal${modalOpen ? ' is-open' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeModal();
        }}
        onKeyDown={() => undefined}
        role="presentation"
      >
        <div className="fx-rack-modal__panel">
          <h3 className="fx-rack-modal__title">{t('pages:searchBoxDetails')}</h3>
          <div
            className="fx-rack-modal__slots"
            style={
              modalLayout
                ? {
                    display: 'grid',
                    gridTemplateColumns: `repeat(${modalGridCols}, 1fr)`,
                    gap: '8px',
                  }
                : undefined
            }
          >
            {modalLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="fx-rack-skeleton" />
              ))}
            {modalError && <div className="message warning">{modalError}</div>}
            {!modalLoading &&
              !modalError &&
              modalCells.map((cell, idx) => {
                if (!cell) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      style={{ visibility: 'hidden', border: 'none', background: 'transparent' }}
                    />
                  );
                }
                const highlighted =
                  cell.highlighted ||
                  (modalHighlightSlotId > 0 && cell.slotId === modalHighlightSlotId);
                const filled = Boolean(cell.product?.name);
                return (
                  <div
                    key={cell.slotId}
                    className={`fx-rack-slot fade-in${highlighted ? ' is-highlighted' : ''}`}
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    <div style={{ fontWeight: 'bold', color: 'var(--fx-text)' }}>{cell.slotNo}</div>
                    {filled ? (
                      <div style={{ fontSize: '0.75rem', marginTop: 4, color: 'var(--fx-text-muted)' }}>
                        {cell.product?.name}
                        <br />
                        <strong style={{ color: 'var(--fx-accent)' }}>{cell.product?.qty}</strong>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', marginTop: 4, color: 'var(--fx-danger)' }}>
                        {t('pages:searchSlotEmpty')}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
          <button type="button" className="fx-btn fx-btn-secondary fx-btn-block" onClick={closeModal}>
            <i className="fas fa-times" /> {t('common:close')}
          </button>
        </div>
      </div>
    </div>
  );
}

function RackCard({
  rack,
  delay,
  highlightBoxId,
  highlightSlotId,
  onBoxClick,
}: {
  rack: WarehouseHierarchy['racks'][number];
  delay: number;
  highlightBoxId: number;
  highlightSlotId: number;
  onBoxClick: (boxId: number, highlightSlotId: number) => void;
}) {
  return (
    <div className="fx-rack fx-rack-stagger" style={{ animationDelay: `${delay}s` }}>
      <h3>Rack: {rack.name}</h3>
      {rack.levels.map((level) => (
        <div key={level.id} className="fx-rack-level">
          <h4>Level {level.levelNo}</h4>
          <div className="fx-rack-level__boxes">
            {level.boxes.map((box) => {
              const isHighlighted = highlightBoxId > 0 && box.id === highlightBoxId;
              return (
                <button
                  key={box.id}
                  type="button"
                  className={`fx-rack-box${isHighlighted ? ' is-highlighted' : ''}`}
                  onClick={() => onBoxClick(box.id, isHighlighted ? highlightSlotId : 0)}
                >
                  {box.boxCode}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
