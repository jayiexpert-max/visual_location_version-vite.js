import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import * as inventoryService from '../../services/inventoryService';
import * as ioService from '../../services/ioService';
import * as tvService from '../../services/tvService';
import { getErrorMessage } from '../../services/apiClient';
import { translateApiMessage, translateApiMessages } from '../../utils/translateApiMessage';
import { formatExpireDate, isPuidExpired, normalizePuidInput } from '../../utils/reservationUtils';
import { useServiceReadiness } from '../../hooks/useServiceReadiness';

const HIGHLIGHT_COUNTDOWN_SEC = 30;

type FetchMessageKind = 'success' | 'warning' | 'idle';

interface FetchedMeta extends inventoryService.InventoryLookupData {
  QtyRemain_source?: string;
  QtyRemain_pdservice?: number;
  QtyRemain_cpk_effective?: number;
}

function toDatetimeLocalValue(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatLocationLine(meta: FetchedMeta): string {
  return [
    meta.Loc_Shelf || 'N/A',
    meta.Loc_Level ?? 'N/A',
    meta.Loc_Box || 'N/A',
    meta.Loc_Slot ?? 'N/A',
  ].join(' → ');
}

export function ReceiveReturnPage() {
  const { t } = useTranslation(['pages', 'common']);
  const { user } = useAuth();
  const serviceReadiness = useServiceReadiness();
  const [searchParams] = useSearchParams();
  const resNoFromUrl = searchParams.get('res_no')?.trim() ?? '';

  const puidRef = useRef<HTMLInputElement>(null);

  const [puid, setPuid] = useState('');
  const [receiveDate, setReceiveDate] = useState(toDatetimeLocalValue());
  const [hanaPart, setHanaPart] = useState('');
  const [im, setIm] = useState('');
  const [qtyFull, setQtyFull] = useState<number | ''>('');
  const [qtyRemain, setQtyRemain] = useState<number | ''>('');
  const [meta, setMeta] = useState<FetchedMeta | null>(null);
  const [reservationNo, setReservationNo] = useState(resNoFromUrl);

  const [fetchLoading, setFetchLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [fetchMsg, setFetchMsg] = useState<{ kind: FetchMessageKind; html: string }>({
    kind: 'idle',
    html: '',
  });
  const [flashMsg, setFlashMsg] = useState<{ kind: 'success' | 'warning'; text: string } | null>(
    null,
  );
  const [countdown, setCountdown] = useState<number | null>(null);
  const [successHighlight, setSuccessHighlight] = useState<FetchedMeta | null>(null);

  useEffect(() => {
    puidRef.current?.focus();
  }, []);

  const resetForm = useCallback(() => {
    setPuid('');
    setReceiveDate(toDatetimeLocalValue());
    setHanaPart('');
    setIm('');
    setQtyFull('');
    setQtyRemain('');
    setMeta(null);
    setFetchMsg({ kind: 'idle', html: '' });
    setFlashMsg(null);
    setCountdown(null);
    setSuccessHighlight(null);
    setReservationNo(resNoFromUrl);
    setTimeout(() => puidRef.current?.focus(), 50);
  }, [resNoFromUrl]);

  useEffect(() => {
    if (countdown === null) return undefined;
    if (countdown <= 0) {
      resetForm();
      return undefined;
    }
    const timer = window.setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : null)), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown, resetForm]);

  const handlePuidInput = (value: string) => {
    setPuid(normalizePuidInput(value));
  };

  const buildQtySourceNotes = (data: FetchedMeta, remain: number): string => {
    const parts: string[] = [];
    parts.push(`<br><small>📡 ${t('pages:addStockSourcePdservice')}</small>`);
    if (data.QtyRemain_source === 'cpk') {
      parts.push(`<br><small>📡 ${t('pages:addStockSourceCpk')}</small>`);
    } else if (data.QtyRemain_source === 'local') {
      parts.push(`<br><small>💾 ${t('pages:addStockSourceLocal')}</small>`);
    } else if (data.QtyRemain_source === 'pdservice') {
      parts.push(`<br><small>✅ ${t('pages:addStockSourcePdQty')}</small>`);
    }
    if (
      data.QtyRemain_pdservice != null &&
      data.QtyRemain_pdservice < 0
    ) {
      parts.push(
        `<br><small style="color:#b45309;">⚠️ ${t('pages:addStockPdCorrection', {
          pd: data.QtyRemain_pdservice,
          remain,
        })}</small>`,
      );
    } else if (
      data.QtyRemain_pdservice != null &&
      data.QtyRemain_pdservice > 0 &&
      data.QtyRemain_pdservice !== remain
    ) {
      parts.push(`<br><small>ℹ️ ${t('pages:addStockPdDiffers')}</small>`);
    }
    if (
      data.QtyRemain_cpk_effective != null &&
      data.QtyRemain_cpk_effective !== remain
    ) {
      parts.push(
        `<br><small style="color:#b45309;">⚠️ ${t('pages:addStockCpkEffective', {
          effective: data.QtyRemain_cpk_effective,
          remain,
        })}</small>`,
      );
    }
    parts.push(`<br><small>📺 ${t('pages:addStockHighlightHint')}</small>`);
    return parts.join('');
  };

  const fetchData = async () => {
    const normalized = normalizePuidInput(puid);
    if (!normalized || fetchLoading || saveLoading) return;

    setPuid(normalized);
    setFetchLoading(true);
    setFlashMsg(null);
    setFetchMsg({
      kind: 'warning',
      html: `<i class="fas fa-spinner fa-spin"></i> ${t('pages:addStockFetching')}`,
    });

    try {
      const response = await inventoryService.lookupPuid(
        normalized,
        hanaPart || undefined,
      );

      if (response.status !== 'success' || !response.data) {
        setMeta(null);
        setIm('');
        setHanaPart('');
        setQtyFull('');
        setQtyRemain('');
        setFetchMsg({
          kind: 'warning',
          html: `❌ ${translateApiMessage(response.message ?? t('common:error'), t)}`,
        });
        return;
      }

      const data = response.data as FetchedMeta;
      const remain = data.QtyRemain ?? data.Qty ?? 0;

      setMeta(data);
      setIm(data.IM ?? '');
      setHanaPart(data.HanaPart ?? '');
      setQtyFull(data.Qty ?? remain);
      setQtyRemain(remain);

      const offlineNote = response.pdserviceOffline
        ? `<br><small>⚠️ ${response.pdserviceWarning ?? t('pages:resPdserviceOffline')}</small>`
        : '';

      setFetchMsg({
        kind: 'success',
        html: `🔍 ${t('pages:addStockFoundPart', { part: data.HanaPart })}<br>
          📦 ${t('common:location')}: <b>${formatLocationLine(data)}</b>
          <br>✅ ${t('pages:qtyRemain')}: <b>${remain}</b>${buildQtySourceNotes(data, remain)}${offlineNote}`,
      });

      setTimeout(() => {
        document.getElementById('qty_remain_input')?.focus();
      }, 50);
    } catch (err) {
      setMeta(null);
      setFetchMsg({
        kind: 'warning',
        html: `❌ ${getErrorMessage(err, t('common:error'), t)}`,
      });
    } finally {
      setFetchLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saveLoading || fetchLoading || !meta || !user) return;
    if (!serviceReadiness.cpkOk) {
      setFlashMsg({ kind: 'warning', text: t('pages:serviceNotReady') });
      return;
    }

    const normalized = normalizePuidInput(puid);
    const remain = Number(qtyRemain);
    const fullQty = Number(qtyFull) || remain;

    if (!normalized || !im.trim() || !hanaPart.trim() || !meta.slot_id) {
      setFlashMsg({ kind: 'warning', text: t('pages:addStockMissingFields') });
      return;
    }
    if (!Number.isFinite(remain) || remain <= 0) {
      setFlashMsg({ kind: 'warning', text: t('pages:addStockQtyRequired') });
      return;
    }

    setSaveLoading(true);
    setFlashMsg(null);

    try {
      const receiveIso = receiveDate
        ? new Date(receiveDate).toISOString()
        : new Date().toISOString();

      const result = (await inventoryService.receiveReturn({
        puid: normalized,
        im: im.trim(),
        hanaPart: hanaPart.trim(),
        slotId: meta.slot_id,
        qty: fullQty,
        qtyRemain: remain,
        receiveDate: receiveIso,
        customer: meta.Customer,
        description: meta.Description,
        lotNo: meta.LotNo,
        expirationDate: meta.ExpirationDate || undefined,
        statusName: meta.StatusName ?? 'Available',
        locShelf: meta.Loc_Shelf,
        locLevel: String(meta.Loc_Level ?? ''),
        locBox: meta.Loc_Box,
        locSlot: meta.Loc_Slot,
        reservationNo: reservationNo || undefined,
      })) as {
        cpkWarnings?: string[];
        cpkSynced?: boolean;
        isNewReel?: boolean;
      };

      let message = t('pages:addStockSaved');
      if (result.cpkSynced) {
        message += ` — ${t('pages:addStockCpkOk')} (${t('pages:qtyRemain')}: ${remain})`;
      }
      if (result.isNewReel) {
        message += ` ${t('pages:addStockNewReel')}`;
      } else {
        message += ` ${t('pages:addStockUpdatedPuid')}`;
      }
      if (result.cpkWarnings?.length) {
        message += ` ${translateApiMessages(result.cpkWarnings, t)}`;
      }

      setFlashMsg({ kind: 'success', text: message });
      setSuccessHighlight(meta);
      setCountdown(HIGHLIGHT_COUNTDOWN_SEC);

      void tvService
        .setTvHighlight({
          productName: hanaPart.trim(),
          puid: normalized,
          boxId: meta.box_id,
          slotId: meta.slot_id || undefined,
          slotNo: meta.Loc_Slot || undefined,
          rackName: meta.Loc_Shelf,
          levelNo: Number(meta.Loc_Level) || undefined,
          boxCode: meta.Loc_Box,
          qty: remain,
          actionType: 'receive',
        })
        .catch(() => undefined);
      if (meta.box_id) {
        void ioService
          .ioHighlight({
            boxId: meta.box_id,
            slotNo: meta.Loc_Slot,
          })
          .catch(() => undefined);
      }
    } catch (err) {
      setFlashMsg({
        kind: 'warning',
        text: getErrorMessage(err, t('common:error'), t),
      });
    } finally {
      setSaveLoading(false);
    }
  };

  const busy = fetchLoading || saveLoading;
  const canSave =
    Boolean(meta?.slot_id) &&
    Boolean(im.trim()) &&
    Boolean(hanaPart.trim()) &&
    Number(qtyRemain) > 0 &&
    !busy &&
    serviceReadiness.cpkOk &&
    !serviceReadiness.loading;
  const expired = meta ? isPuidExpired(meta.ExpirationDate) : false;

  return (
    <div className="fx-scan-page">
      {flashMsg && (
        <div className={`message ${flashMsg.kind}`}>{flashMsg.text}</div>
      )}
      {flashMsg?.kind === 'success' && countdown !== null && (
        <div className="fx-countdown-hint">
          {t('pages:addStockCountdownHint')}{' '}
          <span className="fx-countdown">{countdown}</span> {t('pages:addStockCountdownSec')}
        </div>
      )}

      {fetchMsg.kind !== 'idle' && (
        <div
          className={`fx-page-message message ${fetchMsg.kind === 'success' ? 'success' : 'warning'}`}
          dangerouslySetInnerHTML={{ __html: fetchMsg.html }}
        />
      )}

      {meta && expired && (
        <div className="fx-page-message message warning">
          {t('pages:resExpiredPuidNotice', {
            puid,
            date: formatExpireDate(meta.ExpirationDate),
          })}
        </div>
      )}

      {successHighlight && flashMsg?.kind === 'success' && (
        <div className="fx-page-message message success">
          📍 {t('pages:addStockStoredAt')}: <b>{successHighlight.Loc_Shelf}</b> →{' '}
          <b>{t('pages:addStockLevel', { level: successHighlight.Loc_Level ?? '—' })}</b> →{' '}
          <b>{successHighlight.Loc_Box}</b> →{' '}
          <b>{t('pages:addStockSlot', { slot: successHighlight.Loc_Slot ?? '—' })}</b>
          <br />
          PUID: <b style={{ fontFamily: 'monospace' }}>{puid}</b>
          <br />
          <small>📺 {t('pages:addStockTvShown')}</small>
        </div>
      )}

      <div className="fx-scan-toolbar">
        <button type="button" className="fx-btn fx-btn-secondary" onClick={resetForm}>
          <i className="fas fa-sync-alt" /> {t('pages:addStockRefresh')}
        </button>
      </div>

      <form id="addInventoryForm" autoComplete="off" onSubmit={handleSubmit}>
        <div className="fx-form-panel">
          <div className="row">
            <div className="col-md-6">
              <label htmlFor="puid_input">PUID (Unique ID)</label>
              <div className="fx-scan-row">
                <input
                  ref={puidRef}
                  type="text"
                  name="PUID"
                  id="puid_input"
                  className="fx-scan-input"
                  placeholder={t('pages:resPuidScanPlaceholder')}
                  required
                  autoComplete="off"
                  value={puid}
                  disabled={fetchLoading}
                  onChange={(e) => handlePuidInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void fetchData();
                    }
                  }}
                />
                <button
                  type="button"
                  className="fx-btn fx-btn-accent"
                  id="btnFetchData"
                  disabled={busy || !puid.trim()}
                  onClick={() => void fetchData()}
                >
                  {fetchLoading ? (
                    <>
                      <i className="fas fa-spinner fa-spin" /> {t('pages:addStockFetching')}
                    </>
                  ) : (
                    <>
                      <i className="fas fa-search" /> {t('pages:addStockFetch')}
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="col-md-6">
              <label htmlFor="receive_date_input">{t('pages:receiveDate')}</label>
              <input
                type="datetime-local"
                name="ReceiveDate"
                id="receive_date_input"
                value={receiveDate}
                onChange={(e) => setReceiveDate(e.target.value)}
              />
            </div>

            <div className="col-md-6">
              <label htmlFor="hanapart_input">Hana Part Name</label>
              <input
                type="text"
                name="HanaPart"
                id="hanapart_input"
                placeholder={t('pages:addStockPartPlaceholder')}
                required
                readOnly
                value={hanaPart}
              />
            </div>

            <div className="col-md-6">
              <label htmlFor="im_display">Internal Material (IM)</label>
              <input type="text" name="IM" id="im_display" readOnly value={im} />
            </div>

            <div className="col-md-6">
              <label htmlFor="qty_display">{t('pages:addStockQtyFull')}</label>
              <input
                type="number"
                name="Qty"
                id="qty_display"
                readOnly
                value={qtyFull}
              />
            </div>

            <div className="col-md-6">
              <label htmlFor="qty_remain_input">{t('pages:addStockQtyRemain')}</label>
              <input
                type="number"
                name="QtyRemain"
                id="qty_remain_input"
                placeholder={t('pages:addStockQtyRemainPlaceholder')}
                required
                min={1}
                value={qtyRemain}
                onChange={(e) => {
                  const val = e.target.value;
                  setQtyRemain(val === '' ? '' : Math.max(1, Number(val) || 1));
                }}
              />
            </div>

            {resNoFromUrl && (
              <div className="col-md-6">
                <label htmlFor="reservation_no_input">{t('pages:reservationSearch')}</label>
                <input
                  type="text"
                  name="ReservationNo"
                  id="reservation_no_input"
                  readOnly
                  value={reservationNo}
                />
              </div>
            )}

            <div className="col-md-12 fx-form-actions">
              <button
                type="submit"
                className="fx-btn fx-btn-primary fx-btn-lg"
                id="btnSubmitSave"
                style={{ minWidth: 300 }}
                disabled={!canSave}
              >
                {saveLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin" /> {t('pages:addStockSaving')}
                  </>
                ) : (
                  <>
                    <i className="fas fa-save" /> {t('pages:addStockSave')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
