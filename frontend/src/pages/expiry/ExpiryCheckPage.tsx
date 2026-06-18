import '../../styles/check-expiration.css';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format, isValid } from 'date-fns';
import { PageHeader } from '../../components/layout/PageHeader';
import { useExport } from '../../hooks/useExport';
import * as inventoryService from '../../services/inventoryService';
import * as reportsService from '../../services/reportsService';
import { getErrorMessage } from '../../services/apiClient';
import type { PaginatedResult } from '../../types/api';
import type { ExpirationReportItem, ExpirationReportParams } from '../../types/reports';

type ExpiryStatusFilter = 'all' | 'expired' | 'soon' | 'normal' | 'all_stock';

function normalizeResNo(value: string): string {
  return value.trim().toUpperCase().replace(/^RES/i, '');
}

export function ExpiryCheckPage() {
  const { t } = useTranslation(['pages', 'common']);
  const { exportExcel } = useExport();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [resNo, setResNo] = useState('');
  const [status, setStatus] = useState<ExpiryStatusFilter>('all');
  
  const [page, setPage] = useState(1);
  const limit = 20;

  const [resOptions, setResOptions] = useState<string[]>([]);
  const [resSyncList, setResSyncList] = useState<inventoryService.ResSyncListItem[]>([]);
  const [syncedResHighlight, setSyncedResHighlight] = useState<string | null>(null);

  const [rows, setRows] = useState<ExpirationReportItem[]>([]);
  const [totalRows, setTotalRows] = useState(0);

  const [syncLoading, setSyncLoading] = useState(false);
  const [resSyncLoading, setResSyncLoading] = useState<string | null>(null);

  const loadResMeta = useCallback(async () => {
    try {
      const [options, syncList] = await Promise.all([
        inventoryService.listExpirationResOptions(),
        inventoryService.listExpirationResSyncList({
          search: search.trim() || undefined,
          status: status,
          resNo: normalizeResNo(resNo) || undefined,
        }),
      ]);
      setResOptions(options);
      setResSyncList(syncList);
    } catch {
      // non-blocking
    }
  }, [status, resNo, search]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: ExpirationReportParams = {
        status: status,
        page,
        limit,
        search: search.trim() || undefined,
        resNo: normalizeResNo(resNo) || undefined,
      };

      const result = (await reportsService.getExpirationReport(
        params as Record<string, unknown>,
      )) as PaginatedResult<ExpirationReportItem>;

      setRows(result.items ?? []);
      setTotalRows(result.total ?? 0);
    } catch (err) {
      setError(getErrorMessage(err, t('common:error'), t));
      setRows([]);
      setTotalRows(0);
    } finally {
      setLoading(false);
    }
  }, [status, search, resNo, page, t]);

  useEffect(() => {
    void fetchReport();
    void loadResMeta();
  }, [fetchReport, loadResMeta]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    void fetchReport();
    void loadResMeta();
  };

  const handleClear = () => {
    setSearch('');
    setResNo('');
    setStatus('all');
    setPage(1);
  };

  const runCentralSync = async (targetResNo?: string) => {
    const normalized = targetResNo ? normalizeResNo(targetResNo) : normalizeResNo(resNo);

    if (!normalized && !targetResNo) {
      const confirmed = window.confirm(t('pages:expirySyncConfirmAll'));
      if (!confirmed) return;
    }

    if (targetResNo) {
      setResSyncLoading(normalized);
    } else {
      setSyncLoading(true);
    }
    setError(null);
    setSuccess(null);

    try {
      const result = await inventoryService.syncExpiration({
        search: search.trim() || undefined,
        resNo: normalized || undefined,
      });

      if (result.status === 'success' || result.status === 'skipped') {
        setSuccess(result.message || t('common:updated'));
        if (normalized) setSyncedResHighlight(normalized);
        await fetchReport();
        await loadResMeta();
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(getErrorMessage(err, t('common:error'), t));
    } finally {
      setSyncLoading(false);
      setResSyncLoading(null);
    }
  };

  const handleExportExcel = () => {
    const exportData = rows.map((row) => ({
      HanaPart: row.hanaPart ?? '',
      IM: row.im ?? '',
      'PUID Count': row.puidCount ?? 0,
      'Lot Number(s)': row.lotsRaw ?? '-',
      'Total Qty': row.totalQty ?? 0,
      ExpirationDate: row.expirationDate ? format(new Date(row.expirationDate), 'yyyy-MM-dd') : '',
      DaysLeft: row.daysLeft ?? '',
      Status: row.statusText ?? '',
    }));
    exportExcel(exportData, `Expiration_Report_${format(new Date(), 'yyyy-MM-dd')}`);
  };

  const totalPages = Math.ceil(totalRows / limit);
  const pageNums = useMemo(() => {
    if (totalPages <= 1) return [];
    const nums: (number | 0)[] = [];
    const radius = 2;
    const start = Math.max(1, page - radius);
    const end = Math.min(totalPages, page + radius);
    if (start > 1) { nums.push(1); if (start > 2) nums.push(0); }
    for (let i = start; i <= end; i++) nums.push(i);
    if (end < totalPages) { if (end < totalPages - 1) nums.push(0); nums.push(totalPages); }
    return nums;
  }, [page, totalPages]);

  const syncScopeNote = t('pages:expiryScopeNote');

  let syncText = `${syncScopeNote} ${t('pages:expirySyncResFilter')}`;
  if (resNo) {
    syncText = `${syncScopeNote} ${t('pages:expirySyncResActive', { resNo })}`;
  }
  if (success) {
    syncText = t('pages:expirySyncCompleted');
  }

  const syncBtnLabel = resNo ? t('pages:expirySyncThisRes') : t('pages:expirySyncAll');

  return (
    <>
      <PageHeader title={t('pages:expiryTitle')} />

      <p className="ce-page-lead" style={{ fontSize: '1.2rem', color: '#64748b', marginBottom: '0.5rem' }}>
        {t('pages:expirySubtitle')}
      </p>
      <p className="ce-group-hint" style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
        {t('pages:expiryGroupHint')}
        {totalRows > 0 && (
          <span className="ce-group-hint__meta" style={{ marginLeft: 8, fontWeight: 600, color: '#64748b' }}>
            {t('pages:expiryGroupCount', { count: totalRows })}
          </span>
        )}
      </p>

      {error && (
        <div className="fx-alert fx-alert-danger" style={{ marginBottom: 16 }}>
          <span><i className="fas fa-exclamation-triangle"></i> {error}</span>
          <button type="button" onClick={() => setError(null)} style={{ background:'transparent', border:'none', cursor:'pointer' }}>✕</button>
        </div>
      )}

      <div className={`fx-alert ce-sync-banner ${success ? 'fx-alert-success' : 'fx-alert-info'}`}>
        <span><i className="fas fa-cloud-download-alt"></i> {syncText}</span>
        <button 
          type="button" 
          className="fx-btn fx-btn-accent" 
          onClick={() => void runCentralSync()}
          disabled={syncLoading}
        >
          {syncLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-sync-alt"></i>} {syncBtnLabel}
        </button>
      </div>

      <form onSubmit={handleSearchSubmit} className="filter-card ce-filter">
        <div className="ce-filter-grid">
          <div className="ce-filter-field ce-filter-field--res">
            <label className="fx-field-label">{t('pages:expiryResNo')}</label>
            <input 
              type="text" 
              className="fx-scan-input" 
              value={resNo}
              onChange={(e) => setResNo(normalizeResNo(e.target.value))}
              list="resNoList"
              placeholder={t('pages:expiryResNoPlaceholder')}
            />
            <datalist id="resNoList">
              {resOptions.map(opt => <option key={opt} value={opt} />)}
            </datalist>
          </div>
          <div className="ce-filter-field ce-filter-field--search">
            <label className="fx-field-label">{t('common:search')}</label>
            <input 
              type="text" 
              className="fx-scan-input" 
              value={search}
              onChange={(e) => setSearch(e.target.value.toUpperCase().replace(/^VL/, ''))}
              placeholder={t('pages:expirySearchPlaceholder')}
            />
          </div>
          <div className="ce-filter-field ce-filter-field--status">
            <label className="fx-field-label">{t('common:status')}</label>
            <select className="fx-scan-input" value={status} onChange={(e) => setStatus(e.target.value as ExpiryStatusFilter)}>
              <option value="all">{t('pages:expiryStatusAll')}</option>
              <option value="expired">{t('pages:expiryStatusExpiredOnly')}</option>
              <option value="soon">{t('pages:expiryStatusSoon')}</option>
              <option value="normal">{t('pages:expiryStatusNormal')}</option>
              <option value="all_stock">{t('pages:expiryStatusAllStock')}</option>
            </select>
          </div>
          <div className="ce-filter-actions">
            <div className="ce-filter-actions__group">
              <button type="submit" className="fx-btn fx-btn-accent">
                <i className="fas fa-search"></i> {t('common:searchBtn')}
              </button>
              {(search || resNo || status !== 'all') && (
                <button type="button" className="fx-btn fx-btn-secondary" onClick={handleClear}>
                  {t('pages:expiryClear')}
                </button>
              )}
            </div>
            <button type="button" className="fx-btn fx-btn-secondary ce-btn-export" onClick={handleExportExcel}>
              <i className="fas fa-file-excel"></i> {t('pages:expiryExport')}
            </button>
          </div>
        </div>
      </form>

      {resSyncList.length > 0 && (
        <div className="res-sync-panel">
          <h3>
            <i className="fas fa-list-alt"></i>
            {t('pages:expiryResSyncTitle')}
          </h3>
          <p className="ce-res-sync-hint">
            {t('pages:expiryResSyncHintLong')}
          </p>
          <div className="res-sync-grid">
            {resSyncList.map((item) => {
              const isDone = syncedResHighlight === item.resNo;
              const isActive = normalizeResNo(resNo) === item.resNo;
              let cardClass = 'res-sync-card';
              if (isDone) cardClass += ' is-done';
              else if (isActive) cardClass += ' is-active';

              const lastUpdDate = item.lastUpdated ? new Date(item.lastUpdated) : null;
              const lastUpdFmt = lastUpdDate && isValid(lastUpdDate) 
                ? format(lastUpdDate, 'dd/MM/yyyy HH:mm') 
                : t('pages:expiryNever');

              return (
                <div key={item.resNo} className={cardClass}>
                  <div className="res-sync-card__head">
                    <span className="res-sync-card__no" title={item.resNo}>{item.resNo}</span>
                    <button 
                      type="button" 
                      className="fx-btn fx-btn-secondary ce-res-sync-btn"
                      onClick={() => void runCentralSync(item.resNo)}
                      disabled={resSyncLoading === item.resNo}
                    >
                      {resSyncLoading === item.resNo ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-sync-alt"></i>} {t('common:sync')}
                    </button>
                  </div>
                  <div className="res-sync-card__meta">{item.puidCount} PUID</div>
                  <div className="res-sync-card__upd res-last-upd">
                    {t('pages:expiryUpdatedPrefix')} <span>{lastUpdFmt}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="ce-status-legend">
        <span className="ce-legend-item ce-legend-item--expired">
          <i className="fas fa-times-circle" style={{ color: '#ef4444' }}></i> {t('pages:expired')}
        </span>
        <span className="ce-legend-item ce-legend-item--soon">
          <i className="fas fa-exclamation-triangle" style={{ color: '#c2410c' }}></i> {t('pages:expirySoonLegend')}
        </span>
        <span className="ce-legend-item ce-legend-item--normal">
          <i className="fas fa-check-circle" style={{ color: '#15803d' }}></i> {t('pages:expiryNormalLegend')}
        </span>
      </div>

      <div className="table-container ce-table-wrap">
        <table className="ce-expiration-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'center', width: 60 }}>#</th>
              <th>{t('common:products')}</th>
              <th style={{ textAlign: 'center' }}>{t('pages:expiryPuidCount')}</th>
              <th>{t('pages:expiryLotNumbers')}</th>
              <th style={{ textAlign: 'center' }}>{t('pages:expiryTotalQty')}</th>
              <th>{t('common:expiryDate')}</th>
              <th className="col-status">{t('common:status')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>
                  <i className="fas fa-circle-notch fa-spin" style={{ fontSize: '3rem', marginBottom: 15 }}></i>
                  <p>{t('common:loading')}</p>
                </td>
              </tr>
            ) : rows.length > 0 ? (
              rows.map((row, index) => {
                const i = (page - 1) * limit + index + 1;
                
                let rowClass = 'row-normal';
                let statusClass = 'status-normal';
                let icon = 'fa-check-circle';
                let daysColor = 'days-left--normal';
                let daysText = t('pages:expiryDaysLeft', { count: row.daysLeft });

                if (row.daysLeft === undefined || row.daysLeft === null) {
                  rowClass = 'row-normal';
                  icon = 'fa-minus-circle';
                  daysText = '-';
                } else if (row.daysLeft < 0) {
                  rowClass = 'row-expired';
                  statusClass = 'status-expired';
                  icon = 'fa-times-circle';
                  daysColor = 'days-left--expired';
                  daysText = t('pages:expiryDaysAgo', { count: Math.abs(row.daysLeft) });
                } else if (row.daysLeft <= 7) {
                  rowClass = 'row-soon';
                  statusClass = 'status-soon';
                  icon = 'fa-exclamation-triangle';
                  daysColor = 'days-left--soon';
                }

                const expDateStr = row.expirationDate ? format(new Date(row.expirationDate), 'dd/MM/yyyy') : '—';

                return (
                  <tr key={`${row.hanaPart}-${row.im}`} className={rowClass}>
                    <td style={{ textAlign: 'center', color: '#94a3b8' }}>{i}</td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{row.hanaPart}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>{row.im}</div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>
                      {row.puidCount?.toLocaleString()}
                    </td>
                    <td style={{ fontSize: '0.9rem' }}>
                      {row.lotsRaw || '-'}
                    </td>
                    <td style={{ fontWeight: 700, fontSize: '1rem', textAlign: 'center' }}>
                      {row.totalQty?.toLocaleString()}
                    </td>
                    <td>
                      {row.expirationDate ? (
                        <div className="date-display">
                          <span className="ce-exp-date">{expDateStr}</span>
                          <span className={`days-left ${daysColor}`}>{daysText}</span>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>
                    <td className="col-status">
                      <span className={`status-badge ${statusClass}`}>
                        <i className={`fas ${icon}`}></i> {row.statusText}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>
                  <i className="fas fa-boxes" style={{ fontSize: '3rem', marginBottom: 15, opacity: 0.3 }}></i>
                  <p>{t('common:noData')}</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!loading && totalPages > 1 && (
        <div className="pagination">
          <button
            type="button"
            className={`page-link${page <= 1 ? ' is-disabled' : ''}`}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            <i className="fas fa-chevron-left" />
          </button>
          {pageNums.map((p, i) =>
            p === 0 ? (
              <span key={`ellipsis-${i}`} className="page-ellipsis">…</span>
            ) : (
              <button
                key={p}
                type="button"
                className={`page-link${p === page ? ' active' : ''}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            )
          )}
          <button
            type="button"
            className={`page-link${page >= totalPages ? ' is-disabled' : ''}`}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >
            <i className="fas fa-chevron-right" />
          </button>
        </div>
      )}
      {!loading && totalRows > 0 && (
        <div className="ce-pagination-meta">
          {t('pages:expiryPageMeta', {
            page,
            totalPages,
            totalRows: totalRows,
          })}
        </div>
      )}
    </>
  );
}
