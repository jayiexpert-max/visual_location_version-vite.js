import '../../styles/receive-list.css';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { useExport } from '../../hooks/useExport';
import * as reportsService from '../../services/reportsService';
import { getErrorMessage } from '../../services/apiClient';

interface ReceiveRow {
  id: number;
  receiveDate: string | null;
  puid: string | null;
  reservationNo: string | null;
  im: string | null;
  hanaPart: string | null;
  description: string | null;
  mnfPartNo: string | null;
  customer: string | null;
  lotNo: string | null;
  dateCode: string | null;
  binSize: string | null;
  qty: number | null;
  qtyRemain: number | null;
  statusName: string | null;
  expirationDate: string | null;
  expireDateRoomTemp: string | null;
  machineName: string | null;
  oldIm: string | null;
  remark: string | null;
  locShelf: string | null;
  locLevel: string | null;
  locBox: string | null;
}

const PAGE_SIZE = 20;

function fmtDate(val: string | null | undefined, includeTime = false) {
  if (!val) return null;
  try {
    return format(new Date(val), includeTime ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy');
  } catch {
    return val;
  }
}

function daysLeft(val: string | null | undefined): number | null {
  if (!val) return null;
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const exp = new Date(val); exp.setHours(0, 0, 0, 0);
    return Math.round((exp.getTime() - today.getTime()) / 86400000);
  } catch { return null; }
}

export function ReceiveListPage() {
  const { t } = useTranslation(['pages', 'common']);
  const { exportExcel, exportCsv } = useExport();

  // Filters
  const [puid, setPuid] = useState('');
  const [im, setIm] = useState('');
  const [hanaPart, setHanaPart] = useState('');
  const [dateCode, setDateCode] = useState('');
  const [expDate, setExpDate] = useState('');

  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ReceiveRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (pg = page) => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = { page: pg, limit: PAGE_SIZE };
      if (puid.trim()) params.puid = puid.trim();
      if (im.trim()) params.im = im.trim();
      if (hanaPart.trim()) params.hanaPart = hanaPart.trim();
      if (dateCode.trim()) params.dateCode = dateCode.trim();
      if (expDate) params.expDate = expDate;
      const result = await reportsService.getInventoryReceiveReport(params);
      setRows((result.items ?? []) as ReceiveRow[]);
      setTotal(result.total ?? 0);
    } catch (err) {
      setError(getErrorMessage(err, t('common:error'), t));
    } finally {
      setLoading(false);
    }
  }, [page, puid, im, hanaPart, dateCode, expDate, t]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    void fetchData(1);
  };

  const handleClear = () => {
    setPuid(''); setIm(''); setHanaPart(''); setDateCode(''); setExpDate('');
    setPage(1);
  };

  const isFiltered = !!(puid || im || hanaPart || dateCode || expDate);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const pageNums = useMemo(() => {
    if (totalPages <= 1) return [];
    const nums: (number | 0)[] = [];
    const r = 2;
    const s = Math.max(1, page - r);
    const e = Math.min(totalPages, page + r);
    if (s > 1) { nums.push(1); if (s > 2) nums.push(0); }
    for (let i = s; i <= e; i++) nums.push(i);
    if (e < totalPages) { if (e < totalPages - 1) nums.push(0); nums.push(totalPages); }
    return nums;
  }, [page, totalPages]);

  const exportRows = rows.map(r => ({
    ReceiveDate: fmtDate(r.receiveDate, true) ?? '',
    PUID: r.puid ?? '',
    ReservationNo: r.reservationNo ?? '',
    IM: r.im ?? '',
    HanaPart: r.hanaPart ?? '',
    Description: r.description ?? '',
    MnfPartNo: r.mnfPartNo ?? '',
    Customer: r.customer ?? '',
    LotNo: r.lotNo ?? '',
    DateCode: r.dateCode ?? '',
    BinSize: r.binSize ?? '',
    Qty: r.qty ?? '',
    QtyRemain: r.qtyRemain ?? '',
    Status: r.statusName ?? '',
    ExpirationDate: fmtDate(r.expirationDate) ?? '',
    ExpireDateRoomTemp: fmtDate(r.expireDateRoomTemp) ?? '',
    Machine: r.machineName ?? '',
    OldIM: r.oldIm ?? '',
    Location: [r.locShelf, r.locLevel, r.locBox].filter(Boolean).join('-'),
    Remark: r.remark ?? '',
  }));

  const statusClass = (s: string | null) => {
    const v = (s ?? '').toLowerCase();
    if (v.includes('store') || v.includes('in') || v === 'stored') return 'rl-status-stored';
    if (v.includes('issue') || v.includes('out') || v.includes('withdraw')) return 'rl-status-issued';
    return 'rl-status-default';
  };

  return (
    <div className="rl-page">
      <div className="rl-header">
        <div className="rl-header-left">
          <h1>{t('pages:receiveListTitle')}</h1>
          <p>{t('pages:receiveListSubtitle')}</p>
        </div>
        <div className="rl-header-actions">
          <button type="button" className="fx-btn fx-btn-secondary" onClick={() => exportExcel(exportRows, 'receive-list')}>
            <i className="fas fa-file-excel"></i> {t('common:exportExcel')}
          </button>
          <button type="button" className="fx-btn fx-btn-secondary" onClick={() => exportCsv(exportRows, 'receive-list')}>
            <i className="fas fa-file-csv"></i> {t('common:exportCsv')}
          </button>
        </div>
      </div>

      {error && (
        <div className="fx-alert fx-alert-danger" style={{ marginBottom: 16 }}>
          <span><i className="fas fa-exclamation-triangle"></i> {error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Filters */}
      <form className="rl-filters" onSubmit={handleSearch}>
        <div className="rl-filter-grid">
          <div className="rl-filter-field">
            <span className="rl-filter-label">PUID</span>
            <input className="rl-filter-input" value={puid} onChange={e => setPuid(e.target.value)} placeholder="VL-XXXXXXXX" />
          </div>
          <div className="rl-filter-field">
            <span className="rl-filter-label">IM</span>
            <input className="rl-filter-input" value={im} onChange={e => setIm(e.target.value)} placeholder="IM No." />
          </div>
          <div className="rl-filter-field">
            <span className="rl-filter-label">HanaPart</span>
            <input className="rl-filter-input" value={hanaPart} onChange={e => setHanaPart(e.target.value)} placeholder="Part No." />
          </div>
          <div className="rl-filter-field">
            <span className="rl-filter-label">Date Code</span>
            <input className="rl-filter-input" value={dateCode} onChange={e => setDateCode(e.target.value)} placeholder="e.g. 2410" />
          </div>
          <div className="rl-filter-field">
            <span className="rl-filter-label">{t('common:expiryDate')}</span>
            <input className="rl-filter-input" type="date" value={expDate} onChange={e => setExpDate(e.target.value)} />
          </div>
          <div className="rl-filter-actions">
            <button type="submit" className="fx-btn fx-btn-accent">
              <i className="fas fa-search"></i> {t('common:searchBtn')}
            </button>
            {isFiltered && (
              <button type="button" className="fx-btn fx-btn-secondary" onClick={handleClear}>
                {t('common:clear')}
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Stats */}
      {!loading && total > 0 && (
        <div className="rl-stats">
          <span className="rl-stat-chip">
            <i className="fas fa-boxes"></i>
            <strong>{total.toLocaleString()}</strong> {t('pages:receiveListRecords')}
          </span>
          <span className="rl-stat-chip">
            <i className="fas fa-layer-group"></i>
            {t('pages:receiveListPage')} <strong>{page}</strong> / {totalPages}
          </span>
          {isFiltered && (
            <span className="rl-stat-chip" style={{ borderColor: '#bfdbfe', color: '#2563eb' }}>
              <i className="fas fa-filter" style={{ color: '#2563eb' }}></i>
              {t('pages:receiveListFiltered')}
            </span>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rl-table-card">
        <div className="rl-table-wrap">
          <table className="rl-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{t('pages:receiveListReceived')}</th>
                <th>PUID</th>
                <th>RES No.</th>
                <th>IM</th>
                <th>HanaPart</th>
                <th>Description</th>
                <th>MnfPartNo</th>
                <th>Customer</th>
                <th>Lot No.</th>
                <th>Date Code</th>
                <th>Bin Size</th>
                <th>{t('pages:receiveListQty')}</th>
                <th>{t('pages:receiveListRemain')}</th>
                <th>{t('common:status')}</th>
                <th>{t('pages:receiveListExpiry')}</th>
                <th>{t('pages:receiveListExpiryRoom')}</th>
                <th>Machine</th>
                <th>Old IM</th>
                <th>{t('common:location')}</th>
                <th>{t('common:remark')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={21} className="rl-loading-cell">
                    <i className="fas fa-circle-notch fa-spin" style={{ fontSize: '2.5rem', marginBottom: 12, display: 'block' }}></i>
                    {t('common:loading')}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={21} className="rl-empty-cell">
                    <i className="fas fa-inbox" style={{ fontSize: '3rem', marginBottom: 12, display: 'block', opacity: 0.3 }}></i>
                    {t('common:noData')}
                  </td>
                </tr>
              ) : rows.map((row, idx) => {
                const exp = row.expirationDate ? daysLeft(row.expirationDate) : null;
                const expClass = exp === null ? 'rl-muted' : exp < 0 ? 'rl-exp-expired' : exp <= 7 ? 'rl-exp-soon' : 'rl-exp-normal';
                const expLabel = exp === null ? '—' : exp < 0 ? `${Math.abs(exp)}d ago` : `${exp}d left`;
                const loc = [row.locShelf, row.locLevel, row.locBox].filter(Boolean);

                return (
                  <tr key={row.id}>
                    <td style={{ textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>
                      {(page - 1) * PAGE_SIZE + idx + 1}
                    </td>
                    <td>
                      <div className="rl-date">
                        <strong>{fmtDate(row.receiveDate) ?? '—'}</strong>
                        {row.receiveDate && <span>{format(new Date(row.receiveDate), 'HH:mm')}</span>}
                      </div>
                    </td>
                    <td>
                      {row.puid ? <span className="rl-puid">{row.puid}</span> : <span className="rl-muted">—</span>}
                    </td>
                    <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {row.reservationNo ? `RES${row.reservationNo}` : <span className="rl-muted">—</span>}
                    </td>
                    <td style={{ fontWeight: 600 }}>{row.im ?? <span className="rl-muted">—</span>}</td>
                    <td>
                      <div className="rl-part-main">{row.hanaPart ?? '—'}</div>
                    </td>
                    <td>
                      <div className="rl-part-sub" style={{ maxWidth: 200, whiteSpace: 'normal' }}>{row.description ?? <span className="rl-muted">—</span>}</div>
                    </td>
                    <td className="rl-muted" style={{ fontSize: '0.82rem' }}>{row.mnfPartNo ?? '—'}</td>
                    <td className="rl-muted">{row.customer ?? '—'}</td>
                    <td style={{ fontSize: '0.85rem' }}>{row.lotNo ?? <span className="rl-muted">—</span>}</td>
                    <td style={{ fontWeight: 600 }}>{row.dateCode ?? <span className="rl-muted">—</span>}</td>
                    <td className="rl-muted">{row.binSize ?? '—'}</td>
                    <td>
                      <span className="rl-qty-badge">{row.qty?.toLocaleString() ?? '—'}</span>
                    </td>
                    <td>
                      {row.qtyRemain != null ? (
                        <span className={row.qtyRemain > 0 ? 'rl-qty-remain' : 'rl-qty-zero'}>
                          {row.qtyRemain.toLocaleString()}
                        </span>
                      ) : <span className="rl-muted">—</span>}
                    </td>
                    <td>
                      {row.statusName ? (
                        <span className={`rl-status-badge ${statusClass(row.statusName)}`}>
                          {row.statusName}
                        </span>
                      ) : <span className="rl-muted">—</span>}
                    </td>
                    <td>
                      {row.expirationDate ? (
                        <div>
                          <div className={expClass} style={{ whiteSpace: 'nowrap' }}>{fmtDate(row.expirationDate)}</div>
                          <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{expLabel}</div>
                        </div>
                      ) : <span className="rl-muted">—</span>}
                    </td>
                    <td className="rl-muted" style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                      {fmtDate(row.expireDateRoomTemp) ?? '—'}
                    </td>
                    <td className="rl-muted" style={{ fontSize: '0.82rem' }}>{row.machineName ?? '—'}</td>
                    <td className="rl-muted" style={{ fontSize: '0.82rem' }}>{row.oldIm ?? '—'}</td>
                    <td>
                      {loc.length > 0 ? (
                        <span className="rl-loc">
                          <i className="fas fa-map-marker-alt" style={{ color: '#94a3b8', fontSize: '0.75rem' }}></i>
                          {loc.join('-')}
                        </span>
                      ) : <span className="rl-muted">—</span>}
                    </td>
                    <td className="rl-muted" style={{ fontSize: '0.82rem', maxWidth: 150, whiteSpace: 'normal' }}>
                      {row.remark ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 0 && (
          <div className="rl-pagination">
            <span className="rl-pagination-meta">
              {t('pages:receiveListPagination', {
                from: ((page - 1) * PAGE_SIZE + 1).toLocaleString(),
                to: Math.min(page * PAGE_SIZE, total).toLocaleString(),
                total: total.toLocaleString(),
              })}
            </span>
            <div className="rl-page-btns">
              <button className="rl-page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <i className="fas fa-chevron-left" />
              </button>
              {pageNums.map((p, i) =>
                p === 0 ? (
                  <span key={`el-${i}`} className="rl-ellipsis">…</span>
                ) : (
                  <button key={p} className={`rl-page-btn${p === page ? ' active' : ''}`} onClick={() => setPage(p)}>
                    {p}
                  </button>
                )
              )}
              <button className="rl-page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <i className="fas fa-chevron-right" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
