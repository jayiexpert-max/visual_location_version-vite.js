import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HandheldTopBar } from '../../components/handheld/HandheldTopBar';
import { useAuth } from '../../contexts/AuthContext';
import * as inventoryService from '../../services/inventoryService';
import * as reservationsService from '../../services/reservationsService';
import { getErrorMessage } from '../../services/apiClient';
import {
  isHandheldHighlightBusy,
  sendHandheldHighlight,
  sendHandheldReceiveHighlight,
} from '../../utils/handheldHighlight';
import {
  formatExpireDate,
  isPuidCpkReceived,
  isPuidExpired,
  isPuidLocallyReceived,
  isPuidReceived,
  normalizePuidInput,
  normalizeResNo,
  resNoKey,
  type ResDetailData,
  type ResItemRow,
  type ResPuidRow,
} from '../../utils/reservationUtils';
import { useReservationRealtimeSync } from '../../hooks/useReservationRealtimeSync';

function formatLocation(meta: inventoryService.InventoryLookupData): string {
  return [meta.Loc_Shelf, meta.Loc_Level, meta.Loc_Box, meta.Loc_Slot]
    .filter((v) => v != null && v !== '')
    .join(' / ') || '-';
}

function lineStatusLabel(row: ResPuidRow, t: (k: string) => string): string {
  if (isPuidReceived(row)) return t('pages:handheldResReceived');
  if (isPuidLocallyReceived(row)) return t('pages:handheldResLocalOnly');
  return t('pages:handheldResPending');
}

export function HandheldReceiveReservationPage() {
  const { t } = useTranslation(['pages', 'common']);
  const { user, canAccess } = useAuth();

  const resRef = useRef<HTMLInputElement>(null);
  const puidRef = useRef<HTMLInputElement>(null);

  const [message, setMessage] = useState<{ type: 'info' | 'success' | 'warning' | 'error'; text: string }>({
    type: 'info',
    text: t('pages:handheldResScanHint'),
  });
  const [resInput, setResInput] = useState('');
  const [activeResNo, setActiveResNo] = useState<string | null>(null);
  const [resData, setResData] = useState<ResDetailData | null>(null);
  const [loadingRes, setLoadingRes] = useState(false);
  const [puidInput, setPuidInput] = useState('');
  const [lookup, setLookup] = useState<inventoryService.InventoryLookupData | null>(null);
  const [matchedPart, setMatchedPart] = useState('');
  const [skipCpk, setSkipCpk] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [selectedLineKey, setSelectedLineKey] = useState<string | null>(null);
  const [highlightLoading, setHighlightLoading] = useState(false);

  useEffect(() => {
    resRef.current?.focus();
  }, []);

  if (!canAccess('receiveReservation')) {
    return (
      <>
        <HandheldTopBar title={t('pages:handheldReceiveRes')} />
        <section className="fx-alert fx-alert-warning">{t('pages:handheldAccessDenied')}</section>
      </>
    );
  }

  const loadReservation = useCallback(async (overrideResNo?: string) => {
    const resNo = normalizeResNo(overrideResNo ?? resInput);
    if (!resNo) {
      setMessage({ type: 'warning', text: t('pages:handheldResEnterNo') });
      return;
    }

    setLoadingRes(true);
    setMessage({ type: 'info', text: t('pages:handheldResLoading') });
    setLookup(null);
    setPuidInput('');

    try {
      const response = await reservationsService.getReservationDetail(resNo);
      if (response.status === 'success' && response.data) {
        const key = resNoKey(response.data.ReservationNo ?? resNo);
        setActiveResNo(key);
        setResData(response.data);
        setMessage({ type: 'info', text: t('pages:handheldResLoaded', { res: key }) });
        setTimeout(() => puidRef.current?.focus(), 80);
      } else {
        setResData(null);
        setActiveResNo(null);
        setMessage({ type: 'error', text: response.message ?? t('pages:resLoadFailed') });
      }
    } catch (err) {
      setResData(null);
      setActiveResNo(null);
      setMessage({ type: 'error', text: getErrorMessage(err, t('pages:resLoadFailed'), t) });
    } finally {
      setLoadingRes(false);
    }
  }, [resInput, t]);

  const reloadDetailSilent = useCallback(async (resNo: string) => {
    try {
      const response = await reservationsService.getReservationDetail(resNo);
      if (response.status === 'success' && response.data) {
        const key = resNoKey(response.data.ReservationNo ?? resNo);
        setActiveResNo(key);
        setResData(response.data);
      }
    } catch {
      // remote sync — ignore transient errors
    }
  }, []);

  useReservationRealtimeSync(activeResNo, reloadDetailSilent, () => {});

  const findPuidInRes = (puid: string): { puidRow: ResPuidRow; item: ResItemRow } | null => {
    if (!resData?.Items) return null;
    const target = puid.toUpperCase();
    for (const item of resData.Items) {
      const match = (item.PUIDList ?? []).find(
        (p) => String(p.PUID ?? '').toUpperCase() === target,
      );
      if (match) return { puidRow: match, item };
    }
    return null;
  };

  const verifyPuid = async () => {
    const puid = normalizePuidInput(puidInput);
    setPuidInput(puid);
    if (!puid || !resData) return;

    const match = findPuidInRes(puid);
    if (!match) {
      setLookup(null);
      setMessage({ type: 'error', text: t('pages:resPuidNotInRes') });
      return;
    }

    if (isPuidReceived(match.puidRow)) {
      setLookup(null);
      setMessage({ type: 'warning', text: t('pages:handheldResAlreadyReceived') });
      return;
    }

    setVerifyLoading(true);
    try {
      const result = await inventoryService.lookupPuid(
        match.puidRow.PUID ?? puid,
        String(match.item.PartNumber ?? ''),
      );
      if (result.status !== 'success' || !result.data) {
        throw new Error(result.message ?? t('pages:resVerifyFailed'));
      }

      const exp = result.data.ExpirationDate || String(match.puidRow.ExpireDate ?? '');
      setLookup(result.data);
      setMatchedPart(String(match.item.PartNumber ?? result.data.HanaPart));
      setSkipCpk(isPuidCpkReceived(match.puidRow));

      if (isPuidExpired(exp)) {
        setMessage({
          type: 'warning',
          text: t('pages:resExpiredPuidNotice', { puid, date: formatExpireDate(exp) }),
        });
      } else {
        setMessage({ type: 'success', text: t('pages:handheldResPuidReady') });
      }
    } catch (err) {
      setLookup(null);
      setMessage({ type: 'error', text: getErrorMessage(err, t('pages:resVerifyFailed'), t) });
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleLineHighlight = async (partNumber: string, puid: string, lineKey: string) => {
    const query = partNumber.trim() || puid.trim();
    if (!query) {
      setMessage({ type: 'warning', text: t('pages:handheldResNoPart') });
      return;
    }
    if (isHandheldHighlightBusy() || highlightLoading) {
      setMessage({ type: 'warning', text: t('pages:picklistHighlightBusy') });
      return;
    }

    setSelectedLineKey(lineKey);
    setHighlightLoading(true);
    setMessage({ type: 'info', text: t('pages:picklistHighlightSending', { part: query }) });

    const result = await sendHandheldHighlight(query);
    setHighlightLoading(false);

    if (result.busy) {
      setMessage({ type: 'warning', text: t('pages:picklistHighlightBusy') });
      return;
    }
    if (result.ok) {
      const loc = result.location ? `: ${result.location}` : '';
      const fifo = result.puid ? ` · PUID ${result.puid}` : '';
      setMessage({
        type: 'success',
        text: t('pages:picklistHighlightOk', { part: result.query ?? query, loc: loc + fifo }),
      });
      return;
    }
    setMessage({
      type: 'error',
      text: t('pages:handheldResHighlightFail', {
        part: result.query ?? query,
        msg: result.error ?? t('pages:woFindFailed'),
      }),
    });
  };

  const confirmReceive = async () => {
    if (!lookup || !user || !resData || !activeResNo) return;
    const slotId = lookup.slot_id;
    if (!slotId) {
      setMessage({ type: 'error', text: t('pages:resNoSlot') });
      return;
    }

    setSaveLoading(true);
    try {
      await inventoryService.receiveItem({
        puid: normalizePuidInput(puidInput),
        hanaPart: matchedPart || lookup.HanaPart,
        slotId,
        qty: lookup.QtyRemain || lookup.Qty || 1,
        reservationNo: String(resData.ReservationNo ?? activeResNo),
        im: lookup.IM,
        customer: lookup.Customer,
        description: lookup.Description,
        lotNo: lookup.LotNo,
        expirationDate: lookup.ExpirationDate || undefined,
        statusName: lookup.StatusName ?? 'Available',
        locShelf: lookup.Loc_Shelf,
        locLevel: String(lookup.Loc_Level ?? ''),
        locBox: lookup.Loc_Box,
        skipCpk,
      });

      try {
        await sendHandheldReceiveHighlight(lookup, matchedPart || lookup.HanaPart);
      } catch {
        // non-fatal — receive already saved
      }

      setMessage({ type: 'success', text: t('pages:handheldResSuccess') });
      setLookup(null);
      setPuidInput('');
      if (activeResNo) await loadReservation(activeResNo);
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err, t('common:error'), t) });
    } finally {
      setSaveLoading(false);
    }
  };

  const items = resData?.Items ?? [];

  return (
    <>
      <HandheldTopBar title={t('pages:handheldReceiveResShort')} />

      <section className={`fx-alert fx-alert-${message.type}`} role="status">
        {message.text}
      </section>

      <label htmlFor="reservation_input">{t('pages:handheldResScanLabel')}</label>
      <input
        ref={resRef}
        id="reservation_input"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={resInput}
        onChange={(e) => setResInput(normalizeResNo(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            void loadReservation();
          }
        }}
        placeholder={t('pages:handheldResScanPlaceholder')}
      />

      <button
        type="button"
        className="fx-btn fx-btn-secondary"
        disabled={loadingRes}
        onClick={() => void loadReservation()}
      >
        {loadingRes ? t('common:loading') : t('pages:handheldLoadReservation')}
      </button>

      {resData ? (
        <>
          <div className="hh-picklist-toolbar">
            <p className="hh-picklist-heading">
              RES {activeResNo} ({items.length} {t('pages:handheldResLines')})
            </p>
            <button
              type="button"
              className="fx-btn fx-btn-secondary fx-btn--inline"
              disabled={loadingRes}
              onClick={() => void loadReservation()}
            >
              {t('common:refresh')}
            </button>
          </div>

          <p className="hh-picklist-hint">{t('pages:handheldResTapLineHint')}</p>

          <div className="hh-picklist-lines">
            {items.map((item) =>
              (item.PUIDList ?? []).map((puidRow) => {
                const puid = String(puidRow.PUID ?? '');
                const part = String(item.PartNumber ?? '');
                const lineKey = `${part}-${puid}`;
                return (
                <button
                  type="button"
                  key={lineKey}
                  className={`hh-picklist-line is-clickable ${isPuidReceived(puidRow) ? 'is-issued' : ''} ${selectedLineKey === lineKey ? 'is-selected' : ''}`}
                  onClick={() => void handleLineHighlight(part, puid, lineKey)}
                  disabled={highlightLoading}
                >
                  <div className="hh-picklist-line-head">
                    <strong>{part || puid}</strong>
                    <span className={`fx-badge ${isPuidReceived(puidRow) ? 'fx-badge-ok' : 'fx-badge-open'}`}>
                      {lineStatusLabel(puidRow, t)}
                    </span>
                  </div>
                  <div className="hh-picklist-line-meta">
                    <span>PUID: {puid || '—'}</span>
                    <span>Qty: {String(puidRow.Qty ?? item.Qty ?? '-')}</span>
                  </div>
                </button>
                );
              }),
            )}
          </div>

          <label htmlFor="puid_input">{t('pages:handheldScanPuid')}</label>
          <input
            ref={puidRef}
            id="puid_input"
            type="text"
            inputMode="text"
            autoComplete="off"
            value={puidInput}
            disabled={saveLoading}
            onChange={(e) => setPuidInput(normalizePuidInput(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void verifyPuid();
              }
            }}
          />

          {lookup ? (
            <div className="fx-handheld-summary">
              <div><span>RES</span><strong>{activeResNo}</strong></div>
              <div><span>PUID</span><strong>{normalizePuidInput(puidInput)}</strong></div>
              <div><span>{t('pages:handheldPart')}</span><strong>{matchedPart || lookup.HanaPart}</strong></div>
              <div><span>IM</span><strong>{lookup.IM ?? '-'}</strong></div>
              <div><span>Qty</span><strong>{lookup.QtyRemain ?? lookup.Qty ?? 0}</strong></div>
              <div><span>{t('pages:handheldLocation')}</span><strong>{formatLocation(lookup)}</strong></div>
            </div>
          ) : null}

          <button
            type="button"
            className="fx-btn fx-btn-secondary"
            disabled={!puidInput || verifyLoading}
            onClick={() => void verifyPuid()}
          >
            {verifyLoading ? t('common:loading') : t('pages:handheldVerifyPuid')}
          </button>

          <button
            type="button"
            className="fx-btn fx-btn-primary"
            disabled={!lookup || saveLoading}
            onClick={() => void confirmReceive()}
          >
            {saveLoading ? t('common:loading') : t('confirmReceive')}
          </button>
        </>
      ) : null}
    </>
  );
}
