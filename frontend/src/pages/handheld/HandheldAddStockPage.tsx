import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HandheldTopBar } from '../../components/handheld/HandheldTopBar';
import { useAuth } from '../../contexts/AuthContext';
import * as inventoryService from '../../services/inventoryService';
import { sendHandheldReceiveHighlight } from '../../utils/handheldHighlight';
import { getErrorMessage } from '../../services/apiClient';
import { normalizePuidInput } from '../../utils/reservationUtils';
import { useServiceReadiness } from '../../hooks/useServiceReadiness';

function formatLocation(meta: inventoryService.InventoryLookupData): string {
  return [meta.Loc_Shelf, meta.Loc_Level, meta.Loc_Box, meta.Loc_Slot]
    .filter((v) => v != null && v !== '')
    .join(' / ') || '-';
}

export function HandheldAddStockPage() {
  const { t } = useTranslation(['pages', 'common']);
  const { user, canAccess } = useAuth();
  const serviceReadiness = useServiceReadiness();
  const puidRef = useRef<HTMLInputElement>(null);

  const [puid, setPuid] = useState('');
  const [meta, setMeta] = useState<inventoryService.InventoryLookupData | null>(null);
  const [qtyRemain, setQtyRemain] = useState<number | ''>('');
  const [fetchLoading, setFetchLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'info' | 'success' | 'warning' | 'error'; text: string } | null>(
    null,
  );

  useEffect(() => {
    puidRef.current?.focus();
  }, []);

  const resetForm = useCallback(() => {
    setPuid('');
    setMeta(null);
    setQtyRemain('');
    setMessage(null);
    setTimeout(() => puidRef.current?.focus(), 50);
  }, []);

  if (!canAccess('receiveReturn')) {
    return (
      <>
        <HandheldTopBar title={t('pages:handheldAddStock')} />
        <section className="fx-alert fx-alert-warning">{t('pages:handheldAccessDenied')}</section>
      </>
    );
  }

  const fetchData = async () => {
    const normalized = normalizePuidInput(puid);
    setPuid(normalized);
    if (!normalized) return;

    setFetchLoading(true);
    setMeta(null);
    setQtyRemain('');
    try {
      const result = await inventoryService.lookupPuid(normalized);
      if (result.status !== 'success' || !result.data) {
        throw new Error(result.message ?? t('common:error'));
      }
      const remain = Math.max(1, Number(result.data.QtyRemain ?? result.data.Qty ?? 1));
      setMeta(result.data);
      setQtyRemain(remain);
      setMessage({ type: 'success', text: t('pages:handheldAddStockFetched') });
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err, t('common:error'), t) });
    } finally {
      setFetchLoading(false);
    }
  };

  const confirmReceive = async () => {
    if (!meta || !user || qtyRemain === '') return;
    if (!serviceReadiness.cpkOk) {
      setMessage({ type: 'warning', text: t('pages:serviceNotReady') });
      return;
    }
    const slotId = meta.slot_id;
    if (!slotId) {
      setMessage({ type: 'error', text: t('pages:resNoSlot') });
      return;
    }

    setSaveLoading(true);
    try {
      await inventoryService.receiveReturn({
        puid: normalizePuidInput(puid),
        im: meta.IM ?? '',
        hanaPart: meta.HanaPart,
        slotId,
        qty: Number(meta.Qty ?? qtyRemain),
        qtyRemain: Number(qtyRemain),
        receiveDate: new Date().toISOString(),
        customer: meta.Customer,
        description: meta.Description,
        lotNo: meta.LotNo,
        expirationDate: meta.ExpirationDate,
        statusName: meta.StatusName ?? 'Available',
        locShelf: meta.Loc_Shelf,
        locLevel: String(meta.Loc_Level ?? ''),
        locBox: meta.Loc_Box,
        locSlot: meta.Loc_Slot,
      });

      try {
        await sendHandheldReceiveHighlight(meta);
      } catch {
        // non-fatal
      }

      setMessage({ type: 'success', text: t('pages:handheldAddStockSuccess') });
      setTimeout(resetForm, 1500);
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err, t('common:error'), t) });
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <>
      <HandheldTopBar title={t('pages:handheldAddStock')} />

      {message ? (
        <section className={`fx-alert fx-alert-${message.type}`} role="status">
          {message.text}
        </section>
      ) : null}

      <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="puid_input">{t('pages:handheldScanPuid')}</label>
        <input
          ref={puidRef}
          id="puid_input"
          type="text"
          inputMode="text"
          autoComplete="off"
          value={puid}
          onChange={(e) => setPuid(normalizePuidInput(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void fetchData();
            }
          }}
        />

        <div className="hh-actions">
          <button
            type="button"
            className="fx-btn fx-btn-secondary"
            disabled={!puid || fetchLoading}
            onClick={() => void fetchData()}
          >
            {fetchLoading ? t('pages:addStockFetching') : t('pages:addStockFetch')}
          </button>
        </div>

        <div className="hh-qty-remain">
          <label htmlFor="qty_remain_input">{t('pages:addStockQtyRemain')}</label>
          <input
            id="qty_remain_input"
            type="number"
            className="hh-qty-edit"
            inputMode="numeric"
            min={1}
            step={1}
            disabled={!meta}
            value={qtyRemain}
            onChange={(e) => {
              const val = e.target.value;
              setQtyRemain(val === '' ? '' : Math.max(1, Number(val) || 1));
            }}
          />
        </div>

        {meta ? (
          <div className="fx-handheld-summary">
            <div><span>{t('pages:handheldPart')}</span><strong>{meta.HanaPart}</strong></div>
            <div><span>IM</span><strong>{meta.IM ?? '-'}</strong></div>
            <div><span>{t('pages:addStockQtyFull')}</span><strong>{meta.Qty ?? '-'}</strong></div>
            <div><span>{t('pages:handheldLocation')}</span><strong>{formatLocation(meta)}</strong></div>
          </div>
        ) : null}

        <button
          type="button"
          className="fx-btn fx-btn-primary"
          disabled={!meta || qtyRemain === '' || saveLoading || !serviceReadiness.cpkOk || serviceReadiness.loading}
          onClick={() => void confirmReceive()}
        >
          {saveLoading ? t('pages:addStockSaving') : t('confirmReceive')}
        </button>
      </form>
    </>
  );
}
