import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import * as cpkService from '../../services/cpkService';
import { getErrorMessage } from '../../services/apiClient';
import { translateApiMessage } from '../../utils/translateApiMessage';
import * as inventoryService from '../../services/inventoryService';
import * as ioService from '../../services/ioService';
import { precheckIssuePuid } from '../../utils/picklistIssuePrecheck';
import {
  alertPendingPicklists,
  alertNewPicklists,
  bindPicklistAudioUnlock,
  countPendingPicklists,
  detectNewPicklistIds,
  enrichPicklistIssueStates,
  issueStateFromHeader,
  issueStateFromItems,
  normalizeDetailItems,
  type PicklistIssueState,
} from '../../utils/picklistNotify';
import {
  extractDetailMeta,
  extractPuidFromMessage,
  extractSapItemCodeFromSapInfo,
  getLinePart,
  isAlreadyIssuedMessage,
  lineIsInactiveBomRow,
  lineIsIssued,
  lineIssuedPuid,
  linePuidIsXMark,
  lineRequiredQty,
  lineShowsOpenStatus,
  lineStatusKey,
  lineWarehouseLocation,
  normalizePuid,
  parseOpenPicklistsResponse,
  parsePicklistDetailData,
  pickField,
  picklistIdFromRow,
  picklistShowDate,
  type FifoIssueData,
  type PicklistDetailMeta,
  type PicklistRow,
} from '../../utils/picklistIssueUtils';
import { isCpkSuccess, type CpkResponseBody } from '../../types/cpk';
import { usePicklistRealtimeSync } from '../../hooks/usePicklistRealtimeSync';
import { invalidatePicklistNotify } from '../../hooks/usePicklistNotify';
import { useServiceReadiness } from '../../hooks/useServiceReadiness';

const POLL_MS = 45_000;

type AlertType = 'info' | 'success' | 'warning' | 'error';

interface AlertState {
  panel: 'main' | 'issue';
  type: AlertType;
  html?: string;
  text?: string;
}

function issueStateRank(state: PicklistIssueState | 'loading'): number {
  if (state === 'complete') return 3;
  if (state === 'partial') return 2;
  if (state === 'open') return 1;
  return 0;
}

function resolveIssueState(
  id: string,
  fromHeader: PicklistIssueState | null,
  map: Record<string, PicklistIssueState>,
): PicklistIssueState | 'loading' {
  const cached = map[id];
  let next: PicklistIssueState | 'loading' =
    fromHeader !== null ? fromHeader : cached || 'loading';
  if (cached && issueStateRank(cached) > issueStateRank(next)) {
    next = cached;
  }
  return next;
}

function IssueStatusBadges({
  state,
  cpkStatus,
  t,
}: {
  state: PicklistIssueState | 'loading';
  cpkStatus: string;
  t: (key: string) => string;
}) {
  const badges: { key: string; cls: string }[] = [];
  if (state === 'complete') {
    badges.push({ key: 'pages:picklistIssueComplete', cls: 'fx-badge-ok' });
  } else if (state === 'partial') {
    badges.push({ key: 'pages:picklistIssuePartial', cls: 'fx-badge-rush' });
  } else if (state === 'loading') {
    badges.push({ key: 'common:loading', cls: '' });
  } else {
    badges.push({ key: 'pages:picklistIssueAwaiting', cls: 'fx-badge-open' });
  }
  if (cpkStatus.toLowerCase().includes('rush')) {
    badges.push({ key: 'pages:picklistRush', cls: 'fx-badge-rush' });
  }
  return (
    <>
      {badges.map((b) => (
        <span
          key={b.key}
          className={`fx-badge ${b.cls}`}
          style={!b.cls ? { background: '#e2e8f0', color: '#64748b' } : undefined}
        >
          {t(b.key)}
        </span>
      ))}
    </>
  );
}

export function PicklistPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation(['pages', 'common']);
  const { user } = useAuth();
  const operator = user?.username ?? '';
  const serviceReadiness = useServiceReadiness();

  const puidRef = useRef<HTMLInputElement>(null);
  const kitsNoteRef = useRef<HTMLTextAreaElement>(null);
  const issueStateRef = useRef<Record<string, PicklistIssueState>>({});
  const highlightBusyRef = useRef(false);
  const issueBusyRef = useRef(false);

  const [alert, setAlert] = useState<AlertState | null>({
    panel: 'main',
    type: 'info',
    text: t('pages:picklistLoadingOpen'),
  });
  const [openPicklists, setOpenPicklists] = useState<PicklistRow[]>([]);
  const [picklistRemarks, setPicklistRemarks] = useState<Record<string, string>>({});
  const [issueStateMap, setIssueStateMap] = useState<Record<string, PicklistIssueState>>({});
  const [listLoading, setListLoading] = useState(true);

  const [selectedPicklistId, setSelectedPicklistId] = useState('');
  const [detailItems, setDetailItems] = useState<PicklistRow[]>([]);
  const [detailMeta, setDetailMeta] = useState<PicklistDetailMeta | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [requiredOnly, setRequiredOnly] = useState(false);

  const [puidInput, setPuidInput] = useState('');
  const [issueBusy, setIssueBusy] = useState(false);
  const [highlightBusy, setHighlightBusy] = useState(false);

  const [selectedPart, setSelectedPart] = useState('');
  const [selectedPuid, setSelectedPuid] = useState('');

  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [kitsNote, setKitsNote] = useState('');
  const [closeBusy, setCloseBusy] = useState(false);

  const [fifoModalOpen, setFifoModalOpen] = useState(false);
  const [fifoData, setFifoData] = useState<FifoIssueData | null>(null);
  const [fifoScannedPuid, setFifoScannedPuid] = useState('');

  useEffect(() => {
    issueStateRef.current = issueStateMap;
  }, [issueStateMap]);

  useEffect(() => bindPicklistAudioUnlock(), []);

  const pendingCount = useMemo(
    () => countPendingPicklists(openPicklists, issueStateMap),
    [openPicklists, issueStateMap],
  );

  const allLinesIssued = useMemo(
    () => detailItems.length > 0 && !detailItems.some(lineShowsOpenStatus),
    [detailItems],
  );

  const showAlert = useCallback((panel: 'main' | 'issue', type: AlertType, message: string, html?: string) => {
    setAlert({ panel, type, text: html ? undefined : message, html });
  }, []);

  const hideAlert = useCallback(() => setAlert(null), []);

  const focusPuid = useCallback(() => {
    requestAnimationFrame(() => {
      if (puidRef.current && !puidRef.current.disabled) {
        puidRef.current.focus();
        puidRef.current.select();
      }
    });
  }, []);

  const setPicklistIssueState = useCallback((id: string, state: PicklistIssueState) => {
    setIssueStateMap((prev) => ({ ...prev, [id]: state }));
  }, []);

  const enrichListIssueStates = useCallback(async (list: PicklistRow[]) => {
    const map = { ...issueStateRef.current };
    await enrichPicklistIssueStates(list, map, async (picklistId) => {
      const data = (await cpkService.getPicklistDetail({ picklistId })) as CpkResponseBody;
      return normalizeDetailItems(data);
    });
    setIssueStateMap({ ...map });
  }, []);

  const applyOpenPicklists = useCallback(
    (parsed: ReturnType<typeof parseOpenPicklistsResponse>, options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      const newIds = detectNewPicklistIds(parsed.picklists, issueStateRef.current);
      const pendingCount = countPendingPicklists(parsed.picklists, issueStateRef.current);
      if (pendingCount > 0 && newIds.length) {
        alertNewPicklists(newIds, pendingCount);
        showAlert('main', 'success', t('pages:picklistNewAlert', { ids: newIds.join(', '), count: pendingCount }));
      } else if (!silent && pendingCount > 0 && parsed.picklists.length > 0) {
        alertPendingPicklists(pendingCount);
        showAlert('main', 'info', t('pages:picklistPendingAlert', { count: pendingCount }));
      } else if (!silent) {
        hideAlert();
      }
      setPicklistRemarks((prev) => ({ ...prev, ...parsed.remarks }));
      setOpenPicklists(parsed.picklists);
      void enrichListIssueStates(parsed.picklists);
    },
    [enrichListIssueStates, hideAlert, showAlert, t],
  );

  const loadOpenPicklists = useCallback(
    async (resetState = false, silent = false) => {
      if (resetState) {
        issueStateRef.current = {};
        setIssueStateMap({});
        setPicklistRemarks({});
      }
      if (!silent) {
        setListLoading(true);
        showAlert('main', 'info', t('pages:picklistLoadingOpen'));
      }
      try {
        const data = await cpkService.getOpenPicklists();
        if (!isCpkSuccess(data as CpkResponseBody) && (data as CpkResponseBody).Status) {
          throw new Error((data as CpkResponseBody).Message ?? t('common:error'));
        }
        applyOpenPicklists(parseOpenPicklistsResponse(data), { silent });
      } catch (err) {
        const msg = getErrorMessage(err, t('common:error'), t);
        showAlert('main', 'error', t('pages:picklistLoadFail', { msg }));
        setOpenPicklists([]);
      } finally {
        setListLoading(false);
      }
    },
    [applyOpenPicklists, showAlert, t],
  );

  const fetchDetail = useCallback(
    async (picklistId: string, requiredOnlyMode: boolean) => {
      const data = (await cpkService.getPicklistDetail({
        picklistId,
        requiredOnly: requiredOnlyMode,
      })) as CpkResponseBody & { Meta?: PicklistDetailMeta };

      if (!isCpkSuccess(data) && data.Status) {
        throw new Error(data.Message ?? t('common:error'));
      }

      let parsed = parsePicklistDetailData(data);
      const meta = extractDetailMeta(data);

      return { parsed, meta };
    },
    [t],
  );

  const applyDetailResponse = useCallback(
    (picklistId: string, parsed: ReturnType<typeof parsePicklistDetailData>, meta: PicklistDetailMeta | null) => {
      if (parsed.remark) {
        setPicklistRemarks((prev) => ({ ...prev, [picklistId]: parsed.remark }));
      }
      setDetailItems(parsed.items);
      setDetailMeta(meta);
      const issueState = issueStateFromItems(parsed.items);
      setPicklistIssueState(picklistId, issueState);
      if (issueState === 'complete') {
        invalidatePicklistNotify(queryClient);
      }

      if (meta?.RequiredOnlyRequested && meta.LineCountRaw != null && meta.LineCount != null && meta.LineCountRaw > meta.LineCount) {
        showAlert(
          'issue',
          'info',
          t('pages:picklistRequiredOnlyInfo', { shown: meta.LineCount, raw: meta.LineCountRaw }),
        );
      } else {
        hideAlert();
      }

      focusPuid();
    },
    [focusPuid, hideAlert, queryClient, setPicklistIssueState, showAlert, t],
  );

  const reloadDetail = useCallback(async () => {
    if (!selectedPicklistId) return;
    setDetailLoading(true);
    try {
      const { parsed, meta } = await fetchDetail(selectedPicklistId, requiredOnly);
      applyDetailResponse(selectedPicklistId, parsed, meta);
    } catch (err) {
      showAlert('issue', 'error', getErrorMessage(err, t('pages:picklistLoadDetailFail'), t));
    } finally {
      setDetailLoading(false);
    }
  }, [applyDetailResponse, fetchDetail, requiredOnly, selectedPicklistId, showAlert, t]);

  const reloadDetailSilent = useCallback(async () => {
    if (!selectedPicklistId) return;
    try {
      const { parsed, meta } = await fetchDetail(selectedPicklistId, requiredOnly);
      applyDetailResponse(selectedPicklistId, parsed, meta);
    } catch {
      // remote sync — ignore transient errors
    }
  }, [applyDetailResponse, fetchDetail, requiredOnly, selectedPicklistId]);

  const refreshPicklistListSilent = useCallback(() => {
    void loadOpenPicklists(false, true);
  }, [loadOpenPicklists]);

  usePicklistRealtimeSync(
    selectedPicklistId,
    () => {
      void reloadDetailSilent();
    },
    refreshPicklistListSilent,
  );

  const selectPicklist = useCallback(
    async (picklistId: string) => {
      if (!picklistId) return;
      setSelectedPicklistId(picklistId);
      setSelectedPart('');
      setSelectedPuid('');
      setPuidInput('');
      setDetailItems([]);
      setDetailLoading(true);
      hideAlert();

      try {
        const { parsed, meta } = await fetchDetail(picklistId, requiredOnly);
        applyDetailResponse(picklistId, parsed, meta);
      } catch (err) {
        setDetailItems([]);
        showAlert('issue', 'error', getErrorMessage(err, t('pages:picklistLoadDetailFail'), t));
      } finally {
        setDetailLoading(false);
      }
    },
    [applyDetailResponse, fetchDetail, hideAlert, requiredOnly, showAlert, t],
  );

  useEffect(() => {
    void loadOpenPicklists(true);
    const timer = window.setInterval(() => void loadOpenPicklists(false, true), POLL_MS);
    return () => window.clearInterval(timer);
  }, [loadOpenPicklists]);

  const requiredOnlyInitRef = useRef(true);

  useEffect(() => {
    if (requiredOnlyInitRef.current) {
      requiredOnlyInitRef.current = false;
      return;
    }
    if (selectedPicklistId) {
      void reloadDetail();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when requiredOnly toggles
  }, [requiredOnly]);

  const detailLineCountLabel = useMemo(() => {
    const shown = detailItems.length;
    const raw = detailMeta?.LineCountRaw;
    if (raw != null && raw !== shown) {
      return t('pages:picklistLinesFiltered', { shown, raw });
    }
    if (shown) return t('pages:picklistLinesFromCpk', { shown });
    return '';
  }, [detailItems.length, detailMeta, t]);

  const selectedLabel = useMemo(() => {
    if (!selectedPicklistId) return '—';
    const remark = picklistRemarks[selectedPicklistId];
    if (remark) {
      return `${selectedPicklistId} — ${t('pages:picklistRequestBy')}: ${remark}`;
    }
    return selectedPicklistId;
  }, [picklistRemarks, selectedPicklistId, t]);

  const openFifoModal = (data: FifoIssueData, scannedPuid: string) => {
    if (!data.expired_rolls?.length) return;
    setFifoData(data);
    setFifoScannedPuid(scannedPuid);
    setFifoModalOpen(true);
  };

  const showFifoIssueError = (message: string, fifo?: FifoIssueData) => {
    const translated = translateApiMessage(message, t);
    let html = translated;
    if (fifo?.recommended_puid) {
      html += ` · ${t('pages:picklistFifoUse', { puid: fifo.recommended_puid })}`;
    }
    if (fifo?.expired_rolls?.length) {
      const rows = fifo.expired_rolls.slice(0, 4).map((row) => {
        const exp = row.expiration_display || row.expiration_date || '-';
        const loc = row.loc_box ? ` · ${row.loc_box}` : '';
        return `<li><b>${row.puid ?? ''}</b> — ${t('pages:picklistFifoExp')} ${exp}${loc}</li>`;
      });
      html += `<div class="fx-picklist-fifo-inline">${t('pages:picklistFifoExpired')}<ul class="fx-picklist-fifo-roll-list">${rows.join('')}</ul></div>`;
    }
    showAlert('issue', 'error', translated, html);
    if (fifo?.renewal_required) openFifoModal(fifo, '');
  };

  const handleIssue = async () => {
    const puid = normalizePuid(puidInput);
    setPuidInput(puid);
    if (!serviceReadiness.cpkOk) {
      showAlert('issue', 'warning', t('pages:serviceNotReady'));
      return;
    }
    if (!selectedPicklistId) {
      showAlert('issue', 'warning', t('pages:picklistSelectFirst'));
      return;
    }
    if (!puid) {
      showAlert('issue', 'warning', t('pages:picklistScanFirst'));
      focusPuid();
      return;
    }
    if (issueBusyRef.current) return;

    const knownRow = detailItems.find((row) => lineIssuedPuid(row) === puid && lineIsIssued(row));
    if (knownRow) {
      showAlert('issue', 'success', t('pages:picklistAlreadyIssued', { puid }));
      setSelectedPuid(puid);
      setPuidInput('');
      return;
    }

    issueBusyRef.current = true;
    setIssueBusy(true);

    try {
      const check = await precheckIssuePuid(puid, detailItems, t);
      if (!check.ok) {
        showAlert('issue', 'warning', check.message ?? t('pages:picklistPrecheckVerifyFail'));
        focusPuid();
        return;
      }

      showAlert('issue', 'info', t('pages:picklistIssuing'));

      const data = (await cpkService.issuePuidToPicklist({
        picklistId: selectedPicklistId,
        puid,
        operator,
      })) as CpkResponseBody & {
        fifo?: FifoIssueData;
        fifo_renewal_notice?: boolean;
        CloseDone?: boolean;
      };

      if (!isCpkSuccess(data)) {
        const msg = translateApiMessage(data.Message ?? t('common:error'), t);
        if (isAlreadyIssuedMessage(msg)) {
          showAlert('issue', 'success', t('pages:picklistAlreadyIssued', { puid }));
          setSelectedPuid(puid);
          setPuidInput('');
          void reloadDetail();
          return;
        }
        showFifoIssueError(msg, data as FifoIssueData);
        focusPuid();
        return;
      }

      showAlert('issue', 'success', t('pages:picklistIssuedOk', { puid }));
      if (data.fifo_renewal_notice && data.fifo) {
        showAlert('issue', 'warning', t('pages:picklistFifoRenewalNotice'));
        openFifoModal(data.fifo, puid);
      }
      setSelectedPuid(puid);
      setPuidInput('');
      invalidatePicklistNotify(queryClient);
      window.setTimeout(() => void reloadDetail(), 2500);
      window.setTimeout(() => void loadOpenPicklists(false, true), 2500);
    } catch (err) {
      let msg = getErrorMessage(err, t('common:error'), t);
      let fifo: FifoIssueData | undefined;
      if (axios.isAxiosError(err)) {
        const body = err.response?.data as
          | { message?: string; details?: FifoIssueData; data?: FifoIssueData }
          | undefined;
        if (body?.message) msg = translateApiMessage(body.message, t);
        fifo = (body?.details ?? body?.data) as FifoIssueData | undefined;
      }
      if (isAlreadyIssuedMessage(msg)) {
        showAlert('issue', 'success', t('pages:picklistAlreadyIssued', { puid: extractPuidFromMessage(msg, puid) }));
        void reloadDetail();
      } else if (fifo?.expired_rolls?.length || fifo?.renewal_required) {
        showFifoIssueError(msg, fifo);
      } else {
        showAlert('issue', 'error', msg);
      }
      focusPuid();
    } finally {
      issueBusyRef.current = false;
      setIssueBusy(false);
    }
  };

  const handleHighlightPart = async (part: string) => {
    const raw = normalizePuid(part);
    if (!raw) {
      showAlert('issue', 'warning', t('pages:picklistHighlightNoPart'));
      return;
    }
    if (highlightBusyRef.current) {
      showAlert('issue', 'info', t('pages:picklistHighlightBusy'));
      return;
    }
    highlightBusyRef.current = true;
    setHighlightBusy(true);
    setSelectedPart(raw);
    showAlert('issue', 'info', t('pages:picklistHighlightSending', { part: raw }));

    try {
      const response = await inventoryService.searchResolve(raw);
      if (response.status !== 'success' || !response.data) {
        showAlert('issue', 'error', t('pages:picklistHighlightNotFound', { part: raw }));
        return;
      }
      const data = response.data;
      await inventoryService.highlightLocation({ query: data.hanaPart || raw, slotId: data.slotId });
      if (data.boxId) {
        await ioService.ioHighlight({ boxId: data.boxId, slotNo: data.slotNo });
      }
      const loc = [data.rackName, data.levelNo != null ? `L${data.levelNo}` : '', data.boxCode, data.slotNo != null ? `S${data.slotNo}` : '']
        .filter(Boolean)
        .join(' / ');
      showAlert(
        'issue',
        'success',
        t('pages:picklistHighlightOk', { part: data.hanaPart || raw, loc: loc ? `: ${loc}` : '' }),
      );
    } catch {
      showAlert('issue', 'error', t('pages:picklistHighlightNotFound', { part: raw }));
    } finally {
      highlightBusyRef.current = false;
      setHighlightBusy(false);
    }
  };

  const confirmClosePicklist = async () => {
    if (!selectedPicklistId) {
      setCloseModalOpen(false);
      return;
    }
    const note = kitsNote.trim();
    if (note.length > 200) {
      showAlert('issue', 'warning', t('pages:picklistKitsNoteTooLong'));
      return;
    }
    setCloseBusy(true);
    showAlert('issue', 'info', t('pages:picklistClosing'));
    try {
      const data = (await cpkService.closePicklist({
        picklistId: selectedPicklistId,
        operator,
        kitsNote: note || undefined,
      })) as CpkResponseBody & { CloseDone?: boolean };

      if (!isCpkSuccess(data) || data.CloseDone === false) {
        throw new Error(data.Message ?? t('pages:picklistCloseFail'));
      }
      setCloseModalOpen(false);
      setKitsNote('');
      showAlert('main', 'success', t('pages:picklistClosedOk', { id: selectedPicklistId }));
      invalidatePicklistNotify(queryClient);
      setSelectedPicklistId('');
      setDetailItems([]);
      void loadOpenPicklists(true);
    } catch (err) {
      showAlert('issue', 'error', getErrorMessage(err, t('pages:picklistCloseFail'), t));
    } finally {
      setCloseBusy(false);
    }
  };

  const mainAlert = alert?.panel === 'main' ? alert : null;
  const issueAlert = alert?.panel === 'issue' ? alert : null;

  return (
    <div className="picklist-page">
      {mainAlert && (
        <div className={`fx-alert fx-alert-${mainAlert.type}`} role="status">
          {mainAlert.html ? (
            <span dangerouslySetInnerHTML={{ __html: mainAlert.html }} />
          ) : (
            mainAlert.text
          )}
        </div>
      )}

      <section className="fx-panel picklist-page__list-panel">
        <p className="fx-panel__title">
                <i className="fas fa-clipboard-list" />
                <span>{t('pages:picklistPendingTitle')}</span> ({listLoading ? '…' : pendingCount})
        </p>
        <div className="picklist-page__list-scroll">
          <div className="fx-table-wrap fx-picklist-list-table">
            <table className="fx-table fx-picklist-table" id="picklistTable">
                  <colgroup>
                    <col className="fx-picklist-col-id" />
                    <col className="fx-picklist-col-request" />
                    <col className="fx-picklist-col-line" />
                    <col className="fx-picklist-col-status" />
                    <col className="fx-picklist-col-time" />
                    <col className="fx-picklist-col-action" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>{t('pages:picklistColId')}</th>
                      <th>{t('pages:picklistColRequestBy')}</th>
                      <th>{t('pages:picklistColLine')}</th>
                      <th>{t('pages:picklistColIssueStatus')}</th>
                      <th>{t('pages:picklistColDateTime')}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody id="picklistTableBody">
              {listLoading && openPicklists.length === 0 ? (
                <tr>
                  <td colSpan={6} className="fx-picklist-empty">
                    {t('common:loading')}
                  </td>
                </tr>
              ) : openPicklists.length === 0 ? (
                <tr>
                  <td colSpan={6} className="fx-picklist-empty">
                    {t('pages:picklistNoOpen')}
                  </td>
                </tr>
              ) : (
                openPicklists.map((row) => {
                  const id = picklistIdFromRow(row);
                  const requestBy =
                    picklistRemarks[id] ||
                    String(
                      pickField(row, ['Remark', 'RequestBy', 'Request_By', 'RequestByName']) || '',
                    );
                  const line = String(
                    pickField(row, ['Req_Line_Name', 'LineName', 'Line', 'ProductionLine']) || '—',
                  );
                  const cpkStatus = String(
                    pickField(row, ['Status', 'PicklistStatus', 'State']) || 'Open',
                  );
                  const showDate = picklistShowDate(row);
                  const issueState = resolveIssueState(
                    id,
                    issueStateFromHeader(row),
                    issueStateMap,
                  ) as PicklistIssueState | 'loading';
                  const rowClass = [
                    issueState === 'complete' ? 'fx-picklist-list-complete' : '',
                    issueState === 'partial' ? 'fx-picklist-list-partial' : '',
                    selectedPicklistId === id ? 'fx-picklist-selected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ');

                  return (
                    <tr
                      key={id}
                      className={rowClass}
                      data-id={id}
                      data-issue-state={issueState}
                      tabIndex={0}
                      role="button"
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('button')) return;
                        void selectPicklist(id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          void selectPicklist(id);
                        }
                      }}
                    >
                      <td data-label={t('pages:picklistColId')}>
                        <strong>{id}</strong>
                      </td>
                      <td data-label={t('pages:picklistColRequestBy')}>
                        <span className="fx-picklist-request-by">{requestBy || '—'}</span>
                      </td>
                      <td data-label={t('pages:picklistColLine')}>{line || '—'}</td>
                      <td
                        data-label={t('pages:picklistColIssueStatus')}
                        className="fx-picklist-issue-status"
                      >
                        <IssueStatusBadges state={issueState} cpkStatus={cpkStatus} t={t} />
                      </td>
                      <td data-label={t('pages:picklistColDateTime')} className="fx-picklist-show-date">
                        {showDate || '—'}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="fx-btn fx-btn-accent fx-btn--compact"
                          onClick={() => void selectPicklist(id)}
                        >
                          {t('pages:picklistSelect')}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
                  </tbody>
            </table>
          </div>
        </div>
        <div className="fx-scan-toolbar picklist-page__refresh-toolbar">
          <button
            type="button"
            className="fx-btn fx-btn-secondary"
            onClick={() => void loadOpenPicklists(true)}
            disabled={listLoading}
          >
            <i className="fas fa-sync-alt" /> {t('pages:picklistRefreshList')}
          </button>
        </div>
      </section>

      {selectedPicklistId ? (
        <section className="fx-panel picklist-page__detail-panel" id="issuePanel">
              <div className="fx-picklist-panel-head">
                <p className="fx-panel__title fx-picklist-panel-title">
                  <i className="fas fa-barcode" />
                  <span id="selectedPicklistLabel">{selectedLabel}</span>
                </p>
                <button
                  type="button"
                  className="fx-btn fx-btn-danger"
                  onClick={() => {
                    setKitsNote('');
                    setCloseModalOpen(true);
                    setTimeout(() => kitsNoteRef.current?.focus(), 50);
                  }}
                >
                  <i className="fas fa-door-closed" /> {t('pages:picklistCloseBtn')}
                </button>
              </div>
              <p className="fx-panel__hint fx-picklist-detail-hint">{t('pages:picklistDetailHint')}</p>
              <div className="picklist-page__detail-toolbar">
                <label>
                  <input
                    type="checkbox"
                    checked={requiredOnly}
                    onChange={(e) => setRequiredOnly(e.target.checked)}
                  />
                  {t('pages:picklistRequiredOnly')}
                </label>
                <span id="detailLineCount" className="picklist-page__detail-count">
                  {detailLineCountLabel}
                </span>
              </div>

              <div className="fx-picklist-scan-sticky">
            {issueAlert && (
              <div className={`fx-alert fx-alert-${issueAlert.type}`} role="status">
                {issueAlert.html ? (
                  <span dangerouslySetInnerHTML={{ __html: issueAlert.html }} />
                ) : (
                  issueAlert.text
                )}
              </div>
            )}
            {allLinesIssued && (
              <div className="fx-alert fx-alert-success" role="status">
                {t('pages:picklistScanComplete')}
              </div>
            )}
            {!allLinesIssued && (
              <div id="scanIssueSection">
                <p className="fx-panel__title fx-picklist-scan-title">
                  <i className="fas fa-qrcode" /> {t('pages:picklistScanIssue')}
                </p>
                <div className="fx-scan-row">
                  <input
                    ref={puidRef}
                    type="text"
                    className="fx-scan-input"
                    id="puidInput"
                    value={puidInput}
                    placeholder={t('pages:picklistScanPlaceholder')}
                    autoComplete="off"
                    disabled={issueBusy}
                    onChange={(e) => setPuidInput(normalizePuid(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleIssue();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="fx-btn fx-btn-primary"
                    id="btnIssue"
                    disabled={issueBusy}
                    onClick={() => void handleIssue()}
                  >
                    {issueBusy ? (
                      <>
                        <i className="fas fa-spinner fa-spin" /> {t('pages:picklistIssuing')}
                      </>
                    ) : (
                      t('pages:picklistIssueBtn')
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

              <div className="picklist-page__detail-scroll">
                <div className="fx-table-wrap fx-picklist-detail-table">
                  <table className="fx-table fx-picklist-table fx-picklist-detail-grid" id="detailTable">
              <colgroup>
                <col className="fx-picklist-col-item" />
                <col className="fx-picklist-col-part" />
                <col className="fx-picklist-col-req" />
                <col className="fx-picklist-col-puid" />
                <col className="fx-picklist-col-line" />
                <col className="fx-picklist-col-loc" />
                <col className="fx-picklist-col-status" />
                <col className="fx-picklist-col-action" />
              </colgroup>
              <thead>
                <tr>
                  <th>{t('pages:picklistColItem')}</th>
                  <th>{t('pages:picklistColPart')}</th>
                  <th>{t('pages:picklistColRequired')}</th>
                  <th>{t('pages:picklistColReel')}</th>
                  <th>{t('pages:picklistColLine')}</th>
                  <th>{t('pages:picklistColLocation')}</th>
                  <th>{t('common:status')}</th>
                  <th>{t('pages:picklistColTv3d')}</th>
                </tr>
              </thead>
              <tbody id="detailTableBody">
                {detailLoading ? (
                  <tr>
                    <td colSpan={8} className="fx-picklist-empty">
                      {t('common:loading')}
                    </td>
                  </tr>
                ) : detailItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="fx-picklist-empty">
                      {t('pages:picklistNoLines')}
                    </td>
                  </tr>
                ) : (
                  detailItems.map((row, idx) => {
                    const part = getLinePart(row);
                    const sapInfo = pickField(row, ['SAP_Info', 'SAPInfo']);
                    const itemCode = extractSapItemCodeFromSapInfo(sapInfo);
                    const wo = String(pickField(row, ['WorkOrder']) || '');
                    const req = lineRequiredQty(row);
                    const inactive = lineIsInactiveBomRow(row);
                    const issued = lineIsIssued(row);
                    const xMark = !issued && linePuidIsXMark(row);
                    const puid = lineIssuedPuid(row);
                    const lineName = String(
                      pickField(row, ['LineName', 'Req_Line_Name', 'Line', 'ProductionLine']) || '—',
                    );
                    const location = lineWarehouseLocation(row);
                    const statusKey = lineStatusKey(row);
                    const rowClass = [
                      issued ? 'fx-picklist-issued' : '',
                      inactive ? 'fx-picklist-inactive' : '',
                      xMark ? 'fx-picklist-marked-x' : '',
                      selectedPart === part || selectedPuid === puid ? 'fx-picklist-selected' : '',
                    ]
                      .filter(Boolean)
                      .join(' ');

                    return (
                      <tr
                        key={`${part}-${idx}`}
                        className={rowClass}
                        data-part={part}
                        data-puid={puid}
                        data-issued={issued ? '1' : '0'}
                      >
                        <td>
                          {itemCode ? (
                            <span className="fx-picklist-sap-item">{itemCode}</span>
                          ) : (
                            <span className="fx-picklist-muted">—</span>
                          )}
                        </td>
                        <td>
                          <strong>{part || '—'}</strong>
                          {wo && (
                            <>
                              <br />
                              <small style={{ color: '#64748b' }}>WO {wo}</small>
                            </>
                          )}
                        </td>
                        <td title={String(sapInfo || '')}>
                          {inactive || !req ? (
                            <span className="fx-picklist-muted">—</span>
                          ) : (
                            req
                          )}
                        </td>
                        <td>
                          {puid.length >= 4 ? (
                            <span className="fx-picklist-puid">{puid}</span>
                          ) : xMark ? (
                            <span className="fx-picklist-muted">x</span>
                          ) : (
                            <span className="fx-picklist-muted">—</span>
                          )}
                        </td>
                        <td>{lineName}</td>
                        <td>{location || '—'}</td>
                        <td>
                          {statusKey ? (
                            <span
                              className={`fx-badge ${statusKey === 'pages:picklistLineIssued' ? 'fx-badge-ok' : statusKey === 'pages:picklistRush' ? 'fx-badge-rush' : 'fx-badge-open'}`}
                            >
                              {t(statusKey)}
                            </span>
                          ) : (
                            <span className="fx-picklist-muted">—</span>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="fx-btn fx-btn-accent fx-btn--compact btn-search-part"
                            disabled={!part || highlightBusy}
                            onClick={() => void handleHighlightPart(part)}
                          >
                            <i className="fas fa-search" /> {t('pages:picklistSearchBtn')}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
                  </tbody>
                </table>
              </div>
            </div>
        </section>
      ) : null}

      <div
        className={`fx-picklist-close-modal${fifoModalOpen ? ' is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        hidden={!fifoModalOpen}
        onClick={(e) => {
          if (e.target === e.currentTarget) setFifoModalOpen(false);
        }}
      >
        <div className="fx-picklist-close-dialog fx-picklist-fifo-dialog">
          <h3>
            <i className="fas fa-exclamation-triangle" style={{ color: '#dc2626' }} />{' '}
            {t('pages:picklistFifoTitle')}
          </h3>
          <div className="fx-picklist-fifo-body">
            <p
              dangerouslySetInnerHTML={{
                __html: fifoScannedPuid
                  ? t('pages:picklistFifoIntroIssued', { puid: fifoScannedPuid })
                  : t('pages:picklistFifoIntro'),
              }}
            />
            {fifoData?.expired_rolls?.length ? (
              <ul className="fx-picklist-fifo-roll-list">
                {fifoData.expired_rolls.slice(0, 8).map((row, rollIdx) => (
                  <li key={row.puid ?? rollIdx}>
                    <b>{row.puid}</b> — {t('pages:picklistFifoExp')}{' '}
                    {row.expiration_display || row.expiration_date || '-'}
                    {row.loc_box ? ` · ${row.loc_box}` : ''}
                  </li>
                ))}
                {fifoData.expired_rolls.length > 8 && (
                  <li className="fx-picklist-fifo-more">
                    {t('pages:picklistFifoAndMore', {
                      count: fifoData.expired_rolls.length - 8,
                    })}
                  </li>
                )}
              </ul>
            ) : null}
          </div>
          <div className="fx-picklist-close-actions">
            <button
              type="button"
              className="fx-btn fx-btn-primary"
              onClick={() => setFifoModalOpen(false)}
            >
              {t('pages:picklistFifoOk')}
            </button>
          </div>
        </div>
      </div>

      <div
        className={`fx-picklist-close-modal${closeModalOpen ? ' is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        hidden={!closeModalOpen}
        onClick={(e) => {
          if (e.target === e.currentTarget) setCloseModalOpen(false);
        }}
      >
        <div className="fx-picklist-close-dialog">
          <h3>
            <i className="fas fa-exclamation-triangle" style={{ color: '#ea580c' }} />{' '}
            {t('pages:picklistCloseTitle')}
          </h3>
          <p
            dangerouslySetInnerHTML={{
              __html: t('pages:picklistCloseMessage', { id: selectedPicklistId, operator }),
            }}
          />
          <label htmlFor="closePicklistKitsNote">{t('pages:picklistKitsNoteLabel')}</label>
          <textarea
            ref={kitsNoteRef}
            id="closePicklistKitsNote"
            maxLength={200}
            value={kitsNote}
            placeholder={t('pages:picklistKitsNotePlaceholder')}
            onChange={(e) => setKitsNote(e.target.value)}
          />
          <div className="fx-picklist-close-actions">
            <button
              type="button"
              className="fx-btn fx-btn-secondary"
              onClick={() => setCloseModalOpen(false)}
              disabled={closeBusy}
            >
              {t('common:cancel')}
            </button>
            <button
              type="button"
              className="fx-btn fx-btn-danger"
              disabled={closeBusy}
              onClick={() => void confirmClosePicklist()}
            >
              <i className="fas fa-check" /> {t('pages:picklistCloseBtn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
