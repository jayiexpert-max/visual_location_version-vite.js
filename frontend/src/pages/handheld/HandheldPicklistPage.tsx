import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HandheldTopBar } from '../../components/handheld/HandheldTopBar';
import { useAuth } from '../../contexts/AuthContext';
import * as cpkService from '../../services/cpkService';
import { getErrorMessage } from '../../services/apiClient';
import { translateApiMessage } from '../../utils/translateApiMessage';
import { isHandheldHighlightBusy, sendHandheldHighlight, sendHandheldPicklistIssueHighlight } from '../../utils/handheldHighlight';
import { precheckIssuePuid } from '../../utils/picklistIssuePrecheck';
import { issueStateFromItems } from '../../utils/picklistNotify';
import {
  extractDetailMeta,
  getLinePart,
  isAlreadyIssuedMessage,
  lineIsIssued,
  lineIssuedPuid,
  lineRequiredQty,
  lineShowsOpenStatus,
  normalizePuid,
  parseOpenPicklistsResponse,
  parsePicklistDetailData,
  pickField,
  picklistIdFromRow,
  picklistShowDate,
  type PicklistRow,
} from '../../utils/picklistIssueUtils';
import { isCpkSuccess, type CpkResponseBody } from '../../types/cpk';
import { usePicklistRealtimeSync } from '../../hooks/usePicklistRealtimeSync';
import { invalidatePicklistNotify } from '../../hooks/usePicklistNotify';

type AlertType = 'info' | 'success' | 'warning' | 'error';

export function HandheldPicklistPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation(['pages', 'common']);
  const { user, canAccess } = useAuth();
  const operator = user?.username ?? '';

  const puidRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<'list' | 'issue'>('list');
  const [alert, setAlert] = useState<{ type: AlertType; text: string }>({
    type: 'info',
    text: t('pages:picklistLoadingOpen'),
  });
  const [openPicklists, setOpenPicklists] = useState<PicklistRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [detailItems, setDetailItems] = useState<PicklistRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [puidInput, setPuidInput] = useState('');
  const [issueBusy, setIssueBusy] = useState(false);
  const [selectedLineKey, setSelectedLineKey] = useState<string | null>(null);
  const [highlightLoading, setHighlightLoading] = useState(false);

  const focusPuid = useCallback(() => {
    requestAnimationFrame(() => {
      puidRef.current?.focus();
      puidRef.current?.select();
    });
  }, []);

  const loadOpenPicklists = useCallback(async (silent = false) => {
    if (!silent) {
      setListLoading(true);
      setAlert({ type: 'info', text: t('pages:picklistLoadingOpen') });
    }
    try {
      const data = await cpkService.getOpenPicklists();
      if (!isCpkSuccess(data as CpkResponseBody) && (data as CpkResponseBody).Status) {
        throw new Error((data as CpkResponseBody).Message ?? t('common:error'));
      }
      const parsed = parseOpenPicklistsResponse(data);
      setOpenPicklists(parsed.picklists);
      if (!silent) {
        setAlert({
          type: 'success',
          text: t('pages:handheldPicklistCount', { count: parsed.picklists.length }),
        });
      }
    } catch (err) {
      setOpenPicklists([]);
      if (!silent) {
        setAlert({ type: 'error', text: getErrorMessage(err, t('common:error'), t) });
      }
    } finally {
      if (!silent) setListLoading(false);
    }
  }, [t]);

  const loadDetail = useCallback(
    async (picklistId: string) => {
      setDetailLoading(true);
      try {
        const data = (await cpkService.getPicklistDetail({ picklistId })) as CpkResponseBody;
        if (!isCpkSuccess(data) && data.Status) {
          throw new Error(data.Message ?? t('common:error'));
        }
        const parsed = parsePicklistDetailData(data);
        setDetailItems(parsed.items);
        if (issueStateFromItems(parsed.items) === 'complete') {
          invalidatePicklistNotify(queryClient);
        }
        extractDetailMeta(data);
        setAlert({ type: 'info', text: t('pages:handheldPicklistScanHint') });
      } catch (err) {
        setDetailItems([]);
        setAlert({ type: 'error', text: getErrorMessage(err, t('pages:picklistLoadDetailFail'), t) });
      } finally {
        setDetailLoading(false);
        focusPuid();
      }
    },
    [focusPuid, queryClient, t],
  );

  const selectPicklist = async (picklistId: string) => {
    setSelectedId(picklistId);
    setPuidInput('');
    setView('issue');
    await loadDetail(picklistId);
  };

  const reloadDetailSilent = useCallback(async () => {
    if (!selectedId) return;
    try {
      const data = (await cpkService.getPicklistDetail({ picklistId: selectedId })) as CpkResponseBody;
      if (!isCpkSuccess(data) && data.Status) return;
      const parsed = parsePicklistDetailData(data);
      setDetailItems(parsed.items);
      if (issueStateFromItems(parsed.items) === 'complete') {
        invalidatePicklistNotify(queryClient);
      }
    } catch {
      // remote sync — ignore transient errors
    }
  }, [queryClient, selectedId]);

  const refreshPicklistListSilent = useCallback(() => {
    void loadOpenPicklists(true);
  }, [loadOpenPicklists]);

  usePicklistRealtimeSync(
    selectedId,
    () => {
      void reloadDetailSilent();
    },
    refreshPicklistListSilent,
  );

  useEffect(() => {
    void loadOpenPicklists();
  }, [loadOpenPicklists]);

  const handleLineHighlight = async (part: string, puid: string, lineKey: string) => {
    const query = part.trim() || puid.trim();
    if (!query) {
      setAlert({ type: 'warning', text: t('pages:handheldResNoPart') });
      return;
    }
    if (isHandheldHighlightBusy() || highlightLoading) {
      setAlert({ type: 'warning', text: t('pages:picklistHighlightBusy') });
      return;
    }

    setSelectedLineKey(lineKey);
    setHighlightLoading(true);
    setAlert({ type: 'info', text: t('pages:picklistHighlightSending', { part: query }) });

    const result = await sendHandheldHighlight(query);
    setHighlightLoading(false);

    if (result.busy) {
      setAlert({ type: 'warning', text: t('pages:picklistHighlightBusy') });
      return;
    }
    if (result.ok) {
      const loc = result.location ? `: ${result.location}` : '';
      const fifo = result.puid ? ` · PUID ${result.puid}` : '';
      setAlert({
        type: 'success',
        text: t('pages:picklistHighlightOk', { part: result.query ?? query, loc: loc + fifo }),
      });
      return;
    }
    setAlert({
      type: 'error',
      text: t('pages:handheldResHighlightFail', {
        part: result.query ?? query,
        msg: result.error ?? t('pages:woFindFailed'),
      }),
    });
  };

  const handleIssue = async () => {
    const puid = normalizePuid(puidInput);
    setPuidInput(puid);
    if (!selectedId || !puid) {
      setAlert({ type: 'warning', text: t('pages:picklistScanFirst') });
      return;
    }

    setIssueBusy(true);
    setAlert({ type: 'info', text: t('pages:picklistIssuing') });
    try {
      const check = await precheckIssuePuid(puid, detailItems, t);
      if (!check.ok) {
        setAlert({ type: 'warning', text: check.message ?? t('pages:picklistPrecheckVerifyFail') });
        return;
      }

      const data = (await cpkService.issuePuidToPicklist({
        picklistId: selectedId,
        puid,
        operator,
      })) as CpkResponseBody;

      if (!isCpkSuccess(data)) {
        const msg = translateApiMessage(data.Message ?? t('common:error'), t);
        if (isAlreadyIssuedMessage(msg)) {
          setAlert({ type: 'success', text: t('pages:picklistAlreadyIssued', { puid }) });
        } else {
          setAlert({ type: 'error', text: msg });
        }
        return;
      }

      setAlert({ type: 'success', text: t('pages:picklistIssuedOk', { puid }) });
      setPuidInput('');
      invalidatePicklistNotify(queryClient);
      if (check.meta) {
        try {
          await sendHandheldPicklistIssueHighlight(check.meta, check.part);
        } catch {
          // non-fatal — issue already saved
        }
      }
      await loadDetail(selectedId);
    } catch (err) {
      let msg = getErrorMessage(err, t('common:error'), t);
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        msg = translateApiMessage(String(err.response.data.message), t);
      }
      setAlert({ type: 'error', text: msg });
    } finally {
      setIssueBusy(false);
      focusPuid();
    }
  };

  if (!canAccess('picklist')) {
    return (
      <>
        <HandheldTopBar title={t('pages:handheldPicklist')} />
        <section className="fx-alert fx-alert-warning">{t('pages:handheldAccessDenied')}</section>
      </>
    );
  }

  if (view === 'list') {
    return (
      <div className="hh-picklist-shell">
        <HandheldTopBar title={t('pages:handheldPicklist')} />

        <section className={`fx-alert fx-alert-${alert.type}`} role="status">
          {alert.text}
        </section>

        <div className="hh-picklist-toolbar">
          <p className="hh-picklist-heading">
            {t('pages:handheldPicklistPending')} ({openPicklists.length})
          </p>
          <button
            type="button"
            className="fx-btn fx-btn-secondary fx-btn--inline"
            disabled={listLoading}
            onClick={() => void loadOpenPicklists()}
          >
            {t('pages:handheldRefresh')}
          </button>
        </div>

        <div className="hh-picklist-cards hh-picklist-lines-scroll">
          {listLoading ? (
            <p className="hh-picklist-empty">{t('common:loading')}</p>
          ) : openPicklists.length === 0 ? (
            <p className="hh-picklist-empty">{t('pages:handheldPicklistEmpty')}</p>
          ) : (
            openPicklists.map((row) => {
              const id = picklistIdFromRow(row);
              const line = String(pickField(row, ['Line', 'LineName', 'ProductionLine']) ?? '-');
              const status = String(pickField(row, ['Status', 'PicklistStatus']) ?? 'Open');
              const time = picklistShowDate(row);
              const isRush = status.toLowerCase().includes('rush');
              return (
                <button
                  key={id}
                  type="button"
                  className="hh-picklist-card"
                  onClick={() => void selectPicklist(id)}
                >
                  <div className="hh-picklist-card-head">
                    <strong>{id}</strong>
                    <span className={`fx-badge ${isRush ? 'fx-badge-rush' : 'fx-badge-open'}`}>
                      {status}
                    </span>
                  </div>
                  <div className="hh-picklist-card-meta">
                    <span>{line}</span>
                    <span>{time}</span>
                  </div>
                  <span className="fx-btn fx-btn-accent fx-btn--inline">{t('pages:handheldSelect')}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="hh-picklist-shell hh-picklist-shell--issue">
      <HandheldTopBar title={t('pages:handheldPicklist')} />

      <div className="hh-picklist-toolbar">
        <button
          type="button"
          className="fx-btn fx-btn-secondary fx-btn--inline"
          onClick={() => {
            setView('list');
            setSelectedId('');
          }}
        >
          &larr; {t('pages:handheldBackList')}
        </button>
      </div>

      <p className="hh-picklist-selected">{selectedId}</p>

      <section className={`fx-alert fx-alert-${alert.type}`} role="status">
        {alert.text}
      </section>

      <p className="hh-picklist-hint">{t('pages:handheldResTapLineHint')}</p>

      <div className="hh-picklist-scan-block">
        <label htmlFor="puidInput">{t('pages:handheldPicklistScanLabel')}</label>
        <input
          ref={puidRef}
          id="puidInput"
          type="text"
          autoComplete="off"
          inputMode="text"
          value={puidInput}
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
          disabled={issueBusy || !puidInput}
          onClick={() => void handleIssue()}
        >
          {issueBusy ? t('common:loading') : t('pages:picklistIssueBtn')}
        </button>
      </div>

      <div className="hh-picklist-lines hh-picklist-lines-scroll">
        {detailLoading ? (
          <p className="hh-picklist-empty">{t('common:loading')}</p>
        ) : detailItems.length === 0 ? (
          <p className="hh-picklist-empty">{t('pages:handheldPicklistNoLines')}</p>
        ) : (
          detailItems.map((row, idx) => {
            const part = getLinePart(row);
            const reqQty = lineRequiredQty(row);
            const issuedPuid = lineIssuedPuid(row);
            const open = lineShowsOpenStatus(row);
            const lineKey = `${part}-${idx}`;
            return (
              <button
                type="button"
                key={lineKey}
                className={`hh-picklist-line is-clickable ${lineIsIssued(row) ? 'is-issued' : ''} ${!open && !lineIsIssued(row) ? 'is-inactive' : ''} ${selectedLineKey === lineKey ? 'is-selected' : ''}`}
                disabled={highlightLoading || (!part && !issuedPuid)}
                onClick={() => void handleLineHighlight(part, issuedPuid, lineKey)}
              >
                <div className="hh-picklist-line-head">
                  <strong>{part || '-'}</strong>
                  <span className={`fx-badge ${lineIsIssued(row) ? 'fx-badge-ok' : 'fx-badge-open'}`}>
                    {lineIsIssued(row) ? t('pages:picklistIssueComplete') : t('pages:picklistOpen')}
                  </span>
                </div>
                <div className="hh-picklist-line-meta">
                  <span>{t('pages:handheldReqQty')}: {reqQty || '-'}</span>
                  <span>{issuedPuid ? `PUID: ${issuedPuid}` : '—'}</span>
                </div>
              </button>
            );
          })
        )}
      </div>

    </div>
  );
}
