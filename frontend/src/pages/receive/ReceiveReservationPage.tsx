import SearchIcon from '@mui/icons-material/Search';
import ListIcon from '@mui/icons-material/List';
import BarcodeIcon from '@mui/icons-material/QrCodeScanner';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import SaveIcon from '@mui/icons-material/Save';
import { CircularProgress } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import * as inventoryService from '../../services/inventoryService';
import * as tvService from '../../services/tvService';
import * as reservationsService from '../../services/reservationsService';
import { getErrorMessage } from '../../services/apiClient';
import { translateApiMessages } from '../../utils/translateApiMessage';
import { useReservationRealtimeSync } from '../../hooks/useReservationRealtimeSync';
import {
  formatExpireDate,
  formatPuidQtyRemain,
  isPuidCpkReceived,
  isPuidExpired,
  isPuidLocallyReceived,
  isPuidReceived,
  isResCompleted,
  normalizePuidInput,
  normalizeResNo,
  resNoKey,
  type ResDetailData,
  type ResItemRow,
  type ResPuidRow,
  type ReservationListItem,
} from '../../utils/reservationUtils';

interface VerifiedPuid {
  puid: string;
  hanaPart: string;
  meta: inventoryService.InventoryLookupData;
  skipCpk: boolean;
  isExpired: boolean;
  expiration: string;
  pdserviceOffline: boolean;
  pdserviceWarning?: string;
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  return (
    <span className={`status-badge status-${normalized}`}>
      {status || 'Pending'}
    </span>
  );
}

export function ReceiveReservationPage() {
  const { t } = useTranslation(['pages', 'common']);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeResNo, setActiveResNo] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [currentResData, setCurrentResData] = useState<ResDetailData | null>(null);
  const [detailMeta, setDetailMeta] = useState<{ itemCount: number; puidCount: number } | null>(
    null,
  );
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [listFocus, setListFocus] = useState(false);

  const [puidInput, setPuidInput] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verified, setVerified] = useState<VerifiedPuid | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [cpkWarning, setCpkWarning] = useState<string | null>(null);

  const puidInputRef = useRef<HTMLInputElement>(null);

  const listQuery = useQuery({
    queryKey: ['reservations', 'list'],
    queryFn: () => reservationsService.listReservations(),
  });

  const reservations = listQuery.data ?? [];

  const loadDetail = useCallback(async (resNo: string) => {
    const normalized = normalizeResNo(resNo);
    if (!normalized) return;

    setActiveResNo(normalized);
    setDetailLoading(true);
    setDetailError(null);
    setVerified(null);
    setVerifyError(null);
    setPuidInput('');

    try {
      const response = await reservationsService.getReservationDetail(normalized);
      if (response.status === 'success' && response.data) {
        setCurrentResData(response.data);
        setDetailMeta({
          itemCount:
            response.meta?.itemCount ??
            response.meta?.item_count ??
            (response.data.Items?.length ?? 0),
          puidCount: response.meta?.puidCount ?? response.meta?.puid_count ?? 0,
        });
        await queryClient.invalidateQueries({ queryKey: ['reservations', 'list'] });
      } else {
        setCurrentResData(null);
        setDetailMeta(null);
        setDetailError(response.message ?? t('pages:resLoadFailed'));
      }
    } catch (err) {
      setCurrentResData(null);
      setDetailMeta(null);
      setDetailError(getErrorMessage(err, t('pages:resLoadFailed'), t));
    } finally {
      setDetailLoading(false);
    }
  }, [queryClient, t]);

  const reloadDetailSilent = useCallback(
    async (resNo: string) => {
      try {
        const response = await reservationsService.getReservationDetail(resNo);
        if (response.status === 'success' && response.data) {
          setCurrentResData(response.data);
          setDetailMeta({
            itemCount:
              response.meta?.itemCount ??
              response.meta?.item_count ??
              (response.data.Items?.length ?? 0),
            puidCount: response.meta?.puidCount ?? response.meta?.puid_count ?? 0,
          });
        }
      } catch {
        // remote sync — ignore transient errors
      }
    },
    [],
  );

  const refreshResListSilent = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['reservations', 'list'] });
  }, [queryClient]);

  useReservationRealtimeSync(activeResNo, reloadDetailSilent, refreshResListSilent);

  const searchMutation = useMutation({
    mutationFn: (resNo: string) => reservationsService.getReservationDetail(resNo),
    onSuccess: async (response, resNo) => {
      if (response.status === 'success' && response.data) {
        const key = resNoKey(response.data.ReservationNo ?? resNo);
        setActiveResNo(key);
        setCurrentResData(response.data);
        setDetailMeta({
          itemCount:
            response.meta?.itemCount ??
            response.meta?.item_count ??
            (response.data.Items?.length ?? 0),
          puidCount: response.meta?.puidCount ?? response.meta?.puid_count ?? 0,
        });
        setSearchInput('');
        setDetailError(null);
        await queryClient.invalidateQueries({ queryKey: ['reservations', 'list'] });
        setTimeout(() => puidInputRef.current?.focus(), 50);
      } else {
        setDetailError(response.message ?? t('pages:resSearchFailed'));
        setCurrentResData(null);
      }
    },
    onError: (err) => {
      setDetailError(getErrorMessage(err, t('pages:resSearchFailed'), t));
      setCurrentResData(null);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: VerifiedPuid) => {
      if (!user || !currentResData) throw new Error('Missing context');

      const meta = payload.meta;
      const slotId = meta.slot_id;
      if (!slotId) throw new Error(t('pages:resNoSlot'));

      return inventoryService.receiveItem({
        puid: payload.puid,
        hanaPart: payload.hanaPart,
        slotId,
        qty: meta.QtyRemain || meta.Qty || 1,
        reservationNo: String(currentResData.ReservationNo ?? activeResNo ?? ''),
        im: meta.IM,
        customer: meta.Customer,
        description: meta.Description,
        lotNo: meta.LotNo,
        expirationDate: meta.ExpirationDate || undefined,
        statusName: meta.StatusName ?? 'Available',
        locShelf: meta.Loc_Shelf,
        locLevel: String(meta.Loc_Level ?? ''),
        locBox: meta.Loc_Box,
        skipCpk: payload.skipCpk,
      });
    },
    onSuccess: async (result) => {
      const warnings = (result as { cpkWarnings?: string[] }).cpkWarnings;
      if (warnings?.length) {
        setCpkWarning(translateApiMessages(warnings, t));
        setTimeout(() => setCpkWarning(null), 10000);
      }

      if (verified?.meta) {
        const m = verified.meta;
        try {
          await tvService.setTvHighlight({
            productName: verified.hanaPart,
            puid: verified.puid,
            boxId: m.box_id,
            slotId: m.slot_id || undefined,
            slotNo: m.Loc_Slot || undefined,
            rackName: m.Loc_Shelf,
            levelNo: Number(m.Loc_Level) || undefined,
            boxCode: m.Loc_Box,
            qty: m.QtyRemain ?? m.Qty ?? 0,
            actionType: 'receive',
          });
        } catch {
          // non-fatal
        }
      }

      if (activeResNo) {
        await loadDetail(activeResNo);
      }
      setVerified(null);
      setVerifyError(null);
      setPuidInput('');
      setTimeout(() => puidInputRef.current?.focus(), 50);
    },
    onError: (err) => {
      setVerifyError(getErrorMessage(err, t('common:error'), t));
    },
  });

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const resNo = normalizeResNo(searchInput);
    if (!resNo) {
      focusResList();
      return;
    }
    searchMutation.mutate(resNo);
  };

  const focusResList = () => {
    setListFocus(true);
    setTimeout(() => setListFocus(false), 1600);
    listQuery.refetch();
  };

  const handleResInputChange = (value: string) => {
    setSearchInput(normalizeResNo(value));
  };

  const findPuidInRes = (puid: string): { puidRow: ResPuidRow; item: ResItemRow } | null => {
    if (!currentResData?.Items) return null;
    const target = puid.toUpperCase();
    for (const item of currentResData.Items) {
      const match = (item.PUIDList ?? []).find(
        (p) => String(p.PUID ?? '').toUpperCase() === target,
      );
      if (match) return { puidRow: match, item };
    }
    return null;
  };

  const handleVerify = async () => {
    const puid = normalizePuidInput(puidInput);
    setPuidInput(puid);
    if (!puid || !currentResData) return;

    setVerifyLoading(true);
    setVerifyError(null);
    setVerified(null);

    const match = findPuidInRes(puid);
    if (!match) {
      setVerifyError(t('pages:resPuidNotInRes'));
      setVerifyLoading(false);
      return;
    }

    try {
      const lookup = await inventoryService.lookupPuid(
        match.puidRow.PUID ?? puid,
        String(match.item.PartNumber ?? ''),
      );

      if (lookup.status !== 'success' || !lookup.data) {
        throw new Error(lookup.message ?? t('pages:resVerifyFailed'));
      }

      const expValue =
        lookup.data.ExpirationDate || String(match.puidRow.ExpireDate ?? '');
      const expired = isPuidExpired(expValue);

      setVerified({
        puid: String(match.puidRow.PUID ?? puid),
        hanaPart: String(match.item.PartNumber ?? lookup.data.HanaPart),
        meta: lookup.data,
        skipCpk: isPuidCpkReceived(match.puidRow),
        isExpired: expired,
        expiration: expValue,
        pdserviceOffline: Boolean(lookup.pdserviceOffline),
        pdserviceWarning: lookup.pdserviceWarning,
      });

      if (expired) {
        setToastMessage(t('pages:resExpiredPuidNotice', { puid, date: formatExpireDate(expValue) }));
        setTimeout(() => setToastMessage(null), 7000);
      }
    } catch (err) {
      setVerifyError(getErrorMessage(err, t('pages:resVerifyFailed'), t));
    } finally {
      setVerifyLoading(false);
    }
  };

  const items = currentResData?.Items ?? [];
  const completed = useMemo(() => isResCompleted(items), [items]);

  useEffect(() => {
    if (currentResData && !detailLoading) {
      setTimeout(() => puidInputRef.current?.focus(), 80);
    }
  }, [currentResData, detailLoading]);

  return (
    <div className="main-container">
      {toastMessage && (
        <div className="expired-puid-toast show" role="alert">
          <ErrorOutlineIcon />
          <div>
            <strong>{t('pages:resExpiredTitle')}</strong>
            <p>{toastMessage}</p>
          </div>
        </div>
      )}
      {cpkWarning && (
        <div className="expired-puid-toast cpk-warning-toast show" role="alert">
          <ErrorOutlineIcon />
          <div>
            <strong>{t('pages:resCpkWarningTitle')}</strong>
            <p>{cpkWarning}</p>
          </div>
        </div>
      )}

      <div className={`left-panel${listFocus ? ' is-list-focus' : ''}`}>
        <div className="panel-header">
          <span>{t('pages:resListTitle')}</span>
        </div>
        <div className="filter-section">
          <form className="fx-scan-row" onSubmit={handleSearchSubmit}>
            <input
              type="text"
              className="fx-scan-input"
              placeholder={t('pages:resSearchPlaceholder')}
              value={searchInput}
              onChange={(e) => handleResInputChange(e.target.value)}
              autoComplete="off"
            />
            <button type="submit" className="fx-btn fx-btn-accent" disabled={searchMutation.isPending}>
              {searchMutation.isPending ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <>
                  <SearchIcon fontSize="small" /> {t('common:search')}
                </>
              )}
            </button>
          </form>
        </div>
        <div className="list-container">
          {listQuery.isLoading && (
            <div className="loading-overlay">
              <CircularProgress size={28} />
              <span>{t('common:loading')}</span>
            </div>
          )}
          {listQuery.isError && (
            <div className="empty-state empty-state--error">
              <ErrorOutlineIcon />
              <p>{t('pages:resListError')}</p>
            </div>
          )}
          {!listQuery.isLoading && !listQuery.isError && reservations.length === 0 && (
            <div className="empty-state">
              <ListIcon />
              <p>{t('pages:resListEmpty')}</p>
            </div>
          )}
          {!listQuery.isLoading &&
            reservations.map((item: ReservationListItem) => {
              const resNo = String(item.resNo ?? '').trim();
              const isActive = resNoKey(resNo) === resNoKey(activeResNo);
              const isItemCompleted = item.status === 'Completed';
              return (
                <div
                  key={item.id}
                  className={`res-item${isActive ? ' active' : ''}${isItemCompleted ? ' completed' : ''}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => loadDetail(resNo)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      loadDetail(resNo);
                    }
                  }}
                >
                  <div className="res-info">
                    <div className="res-no">RES: {resNo}</div>
                    <div className="res-date">
                      {item.reqDate ? new Date(item.reqDate).toLocaleString() : '—'}
                    </div>
                  </div>
                  <div className="res-item__actions">
                    <StatusBadge status={item.status} />
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      <div className="right-panel">
        {detailLoading && (
          <div className="loading-overlay">
            <CircularProgress size={32} />
            <span>{t('pages:resLoadingDetail')}</span>
          </div>
        )}

        {!detailLoading && detailError && !currentResData && (
          <div className="empty-state empty-state--error">
            <ErrorOutlineIcon />
            <p>{detailError}</p>
            <button type="button" className="fx-btn fx-btn-secondary" onClick={focusResList}>
              <ListIcon fontSize="small" /> {t('pages:resBackToList')}
            </button>
          </div>
        )}

        {!detailLoading && !currentResData && !detailError && (
          <div className="empty-state">
            <ListIcon />
            <p>{t('pages:resEmptyDetail')}</p>
            <button type="button" className="fx-btn fx-btn-accent" onClick={focusResList}>
              <ListIcon fontSize="small" /> {t('pages:resShowList')}
            </button>
          </div>
        )}

        {!detailLoading && currentResData && (
          <>
            <div className="detail-header">
              <div>
                <h3 className={completed ? 'is-completed' : 'is-pending'}>
                  Res No. : {currentResData.ReservationNo ?? activeResNo}
                  {completed && (
                    <span className="status-badge status-completed" style={{ marginLeft: 15, fontSize: '1rem' }}>
                      COMPLETED
                    </span>
                  )}
                </h3>
                <div className="res-meta">
                  <span>
                    {t('pages:resLastUpdate')}: {new Date().toLocaleString()}
                  </span>
                  <span>
                    {t('common:status')}:{' '}
                    {completed ? t('pages:resStatusAllInWarehouse') : t('pages:resStatusPartial')}
                  </span>
                </div>
              </div>
            </div>

            <div className={`verification-box${verified ? ' active' : ''}`}>
              <h4>
                <BarcodeIcon fontSize="small" /> {t('pages:resPuidVerifyTitle')}
              </h4>
              <p className="verification-box__hint">{t('pages:resPuidVerifyHint')}</p>
              <div className="verify-input-group">
                <input
                  ref={puidInputRef}
                  type="text"
                  className="fx-scan-input"
                  placeholder={t('pages:resPuidScanPlaceholder')}
                  value={puidInput}
                  onChange={(e) => setPuidInput(e.target.value.toUpperCase().replace(/^VL/i, ''))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleVerify();
                    }
                  }}
                  disabled={verifyLoading || saveMutation.isPending}
                />
                <button
                  type="button"
                  className="fx-btn fx-btn-accent verify-btn"
                  onClick={() => void handleVerify()}
                  disabled={verifyLoading || saveMutation.isPending || !puidInput.trim()}
                >
                  {verifyLoading ? <CircularProgress size={18} color="inherit" /> : t('pages:resVerify')}
                </button>
              </div>

              {(verifyError || verified) && (
                <div className="verify-details" style={{ display: 'block' }}>
                  {verifyError && (
                    <div className="empty-state--error" style={{ minHeight: 'auto', padding: '0.75rem 0', textAlign: 'left' }}>
                      {verifyError}
                    </div>
                  )}
                  {verified && (
                    <>
                      <div className="fx-res-verify-card">
                        <div className="fx-res-verify-card__head">
                          <div className="fx-res-verify-card__status">
                            <CheckCircleIcon fontSize="small" /> {t('pages:resVerifiedMatch')}
                          </div>
                          <div className="fx-res-verify-card__qty">
                            <div className="fx-res-verify-card__qty-value">
                              {verified.meta.QtyRemain ?? verified.meta.Qty}
                            </div>
                            <div className="fx-res-verify-card__qty-label">{t('pages:qtyRemain')}</div>
                          </div>
                        </div>
                        <div className="fx-res-field-grid">
                          <div className="fx-res-field">
                            <label>PUID</label>
                            <div className="fx-res-field__value">{verified.puid}</div>
                          </div>
                          <div className="fx-res-field">
                            <label>{t('common:partNumber')}</label>
                            <div className="fx-res-field__value">{verified.hanaPart}</div>
                          </div>
                          <div className="fx-res-field">
                            <label>IM</label>
                            <div className="fx-res-field__value">{verified.meta.IM || '—'}</div>
                          </div>
                          <div className="fx-res-field">
                            <label>{t('pages:resBatchLot')}</label>
                            <div className="fx-res-field__value">{verified.meta.LotNo || '—'}</div>
                          </div>
                          <div className="fx-res-field">
                            <label>{t('pages:resCustomer')}</label>
                            <div className="fx-res-field__value">{verified.meta.Customer || '—'}</div>
                          </div>
                          <div className="fx-res-field">
                            <label>{t('pages:resExpiration')}</label>
                            <div
                              className={`fx-res-field__value${verified.isExpired ? ' fx-res-field__value--danger' : ''}`}
                            >
                              {formatExpireDate(verified.expiration)}
                            </div>
                          </div>
                          <div className="fx-res-field fx-res-location">
                            <label>{t('pages:resTargetLocation')}</label>
                            <div className="fx-res-location__value">
                              {verified.meta.Loc_Shelf}-{verified.meta.Loc_Level}-{verified.meta.Loc_Box}
                              {verified.meta.Loc_Slot != null ? ` (${t('common:location')} ${verified.meta.Loc_Slot})` : ''}
                            </div>
                          </div>
                        </div>
                      </div>
                      {verified.pdserviceOffline && (
                        <div className="fx-res-banner fx-res-banner--warning">
                          {verified.pdserviceWarning ?? t('pages:resPdserviceOffline')}
                        </div>
                      )}
                      {verified.skipCpk && (
                        <div className="fx-res-banner fx-res-banner--warning">
                          {t('pages:resCpkAlreadyReceived')}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {verified && (
                <div className="save-btn-section" style={{ display: 'block' }}>
                  <button
                    type="button"
                    className="btn-receive btn-receive--success"
                    disabled={saveMutation.isPending}
                    onClick={() => verified && saveMutation.mutate(verified)}
                  >
                    {saveMutation.isPending ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <>
                        <SaveIcon fontSize="small" /> {t('pages:resSaveToWarehouse')}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="table-container">
              <h4>{t('pages:resItemSummary')}</h4>
              <div className="fx-table-wrap">
                <table className="fx-table">
                  <thead>
                    <tr>
                      <th>Item#</th>
                      <th>{t('common:partNumber')}</th>
                      <th>{t('pages:resRequestQty')}</th>
                      <th>{t('pages:resPuidCount')}</th>
                      <th>{t('pages:resReceivedCount')}</th>
                      <th>{t('pages:resPendingCount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => {
                      const puids = item.PUIDList ?? [];
                      const receivedCount = puids.filter((p) => isPuidReceived(p)).length;
                      return (
                        <tr key={`${item.PartNumber}-${idx}`}>
                          <td>{item.ItemNo ?? '—'}</td>
                          <td className="fx-res-part-name">{item.PartNumber ?? '—'}</td>
                          <td>{item.RequestQty ?? '—'}</td>
                          <td>{puids.length}</td>
                          <td>{receivedCount}</td>
                          <td>{puids.length ? Math.max(0, puids.length - receivedCount) : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="table-container">
              <h4>{t('pages:resPuidDetail')}</h4>
              <div className="fx-table-wrap">
                <table className="fx-table">
                  <thead>
                    <tr>
                      <th>Item#</th>
                      <th>{t('pages:resPartAndPuid')}</th>
                      <th>{t('pages:resRequestQty')}</th>
                      <th>{t('pages:qtyRemain')}</th>
                      <th>{t('pages:resBatch')}</th>
                      <th>{t('common:status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.flatMap((item, itemIdx) => {
                      const puids = item.PUIDList ?? [];
                      if (puids.length === 0) {
                        return [
                          <tr key={`empty-${itemIdx}`}>
                            <td>{item.ItemNo ?? '—'}</td>
                            <td>
                              <div className="fx-res-part-name">{item.PartNumber ?? '—'}</div>
                              <div className="fx-res-part-sub">{t('pages:resNoPuidYet')}</div>
                            </td>
                            <td>{item.RequestQty ?? '—'}</td>
                            <td>—</td>
                            <td>—</td>
                            <td>
                              <span className="fx-res-puid-status--pending">
                                <ScheduleIcon fontSize="inherit" /> {t('pages:resAwaitingPuid')}
                              </span>
                            </td>
                          </tr>,
                        ];
                      }

                      return puids.map((p, pIdx) => {
                        const received = isPuidReceived(p);
                        return (
                          <tr key={`${itemIdx}-${pIdx}`} className={received ? 'fx-res-row-received' : ''}>
                            <td>{item.ItemNo ?? '—'}</td>
                            <td>
                              <div className="fx-res-part-name">{item.PartNumber ?? '—'}</div>
                              <div className="fx-res-part-sub">PUID: {p.PUID ?? '—'}</div>
                            </td>
                            <td>{item.RequestQty ?? '—'}</td>
                            <td className="fx-res-qty-accent">{formatPuidQtyRemain(p, item)}</td>
                            <td>{p.BatchNumber ?? '—'}</td>
                            <td>
                              {received ? (
                                <>
                                  <span className="fx-res-puid-status--received">
                                    <CheckCircleIcon fontSize="inherit" /> RECEIVED
                                  </span>
                                  {isPuidCpkReceived(p) && !isPuidLocallyReceived(p) && (
                                    <div className="fx-res-puid-status__hint">
                                      {t('pages:resCpkReceivedHint')}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <span className="fx-res-puid-status--pending">
                                  <ScheduleIcon fontSize="inherit" /> PENDING
                                </span>
                              )}
                              <div className="fx-res-part-sub" style={{ marginTop: 4 }}>
                                Exp: {formatExpireDate(p.ExpireDate)}
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })}
                  </tbody>
                </table>
              </div>
              {detailMeta && (
                <p className="fx-table-footnote">
                  {detailMeta.itemCount} {t('pages:resItemLines')}, {detailMeta.puidCount}{' '}
                  {t('pages:resPuidFromCpk')}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
