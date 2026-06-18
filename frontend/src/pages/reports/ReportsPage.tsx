import '../../styles/report-stock.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { PageHeader } from '../../components/layout/PageHeader';
import * as reportsService from '../../services/reportsService';
import { getErrorMessage } from '../../services/apiClient';
import type { TFunction } from 'i18next';

interface StockMovementRow {
  id: number;
  productId: number;
  productName: string | null;
  action: string;
  quantity: number;
  userId: number;
  username: string | null;
  createdAt: string;
  remark?: string | null;
}

const PAGE_SIZE = 10;

function parseActionLog(actionStr: string, t: TFunction, remark?: string | null) {
  let puid = '-';
  let kind = 'picklist_issue';
  let subQty = 0;
  let picklistLabel = '';
  let resLabel = '';

  if (remark) {
    const plMatch = remark.match(/\[Picklist:\s*([^\]]+)\]/);
    if (plMatch) picklistLabel = plMatch[1].trim();

    const resMatch = remark.match(/\[RES:\s*([^\]]+)\]/);
    if (resMatch) resLabel = resMatch[1].trim();
  }

  if (actionStr.includes('|')) {
    const parts = actionStr.split('|');
    const head = parts[0];

    if (head === 'add') {
      kind = resLabel ? 'res_receive' : 'add';
      subQty = parseInt(parts[1], 10) || 0;
      puid = parts[2] || '-';
    } else if (head === 'res_receive') {
      kind = 'res_receive';
      subQty = parseInt(parts[1], 10) || 0;
      puid = parts[2] || '-';
    } else if (head.startsWith('booking_out_')) {
      kind = 'booking_out';
      subQty = parseInt(parts[1], 10) || 0;
      puid = parts[2] || '-';
      const dest = head.substring('booking_out_'.length).toUpperCase();
      const actionText = t('pages:reportActionBookingOutDest', { dest });
      return { kind, actionText, puid, subQty };
    } else if (
      head === 'picklist_issue' ||
      head === 'withdraw' ||
      head === 'order_withdraw' ||
      head === 'withdraw_bom_scan' ||
      head === 'withdraw_bom_box'
    ) {
      kind = 'picklist_issue';
      if (head === 'order_withdraw') {
        puid = parts[1] || '-';
      } else {
        subQty = parseInt(parts[1], 10) || 0;
        puid = parts[2] || '-';
      }
    } else {
      kind = head;
      subQty = parseInt(parts[1], 10) || 0;
      puid = parts[2] || '-';
    }
  } else if (actionStr.includes('_')) {
    const parts = actionStr.split('_');
    kind = parts[0] === 'add' ? 'add' : 'picklist_issue';
    subQty = parseInt(parts[1], 10) || 0;
  } else if (actionStr === 'add') {
    kind = 'add';
  }

  let actionText = '';
  const resSuffix = resLabel ? ` (${resLabel})` : '';
  const plSuffix = picklistLabel ? ` (${picklistLabel})` : '';
  if (kind === 'add') {
    actionText = t('pages:reportActionReceive');
  } else if (kind === 'res_receive') {
    actionText = t('pages:reportActionReceiveRes', { label: resSuffix });
  } else if (kind === 'booking_out') {
    actionText = t('pages:reportActionBookingOut');
  } else {
    kind = 'picklist_issue';
    actionText = t('pages:reportActionPicklistLabel', { label: plSuffix });
  }

  return { kind, actionText, puid, subQty };
}

export function ReportsPage() {
  const { t } = useTranslation(['pages', 'common']);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [rowCount, setRowCount] = useState(0);
  const [rows, setRows] = useState<StockMovementRow[]>([]);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await reportsService.getStockMovements({
        page,
        limit: PAGE_SIZE,
        search: search.trim() || undefined,
        actionFilter: actionFilter || undefined,
      });
      setRows(result.items as StockMovementRow[]);
      setRowCount(result.total);
    } catch (err) {
      setError(getErrorMessage(err, t('common:error'), t));
      setRows([]);
      setRowCount(0);
    } finally {
      setLoading(false);
    }
  }, [page, search, actionFilter, t]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    void loadReport();
  };

  const handleClear = () => {
    setSearch('');
    setActionFilter('');
    setPage(1);
  };

  const totalPages = Math.ceil(rowCount / PAGE_SIZE);

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

  return (
    <>
      <PageHeader title={t('pages:reportsTitle')} />

      <p style={{ color: '#64748b', margin: '0 0 1.5rem' }}>
        {t('pages:reportsSubtitle')}
      </p>

      {/* Filter */}
      <form onSubmit={handleSearch} className="filter-card fade-in">
        <div className="form-group" style={{ flex: 2 }}>
          <input
            type="text"
            placeholder={`🔍 ${t('common:searchPlaceholder')}`}
            value={search}
            onChange={(e) => setSearch(e.target.value.toUpperCase().replace(/^VL/, ''))}
          />
        </div>
        <div className="form-group">
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
            <option value="">📂 {t('pages:reportFilterAll')}</option>
            <option value="add">📥 {t('pages:reportFilterAdd')}</option>
            <option value="res_receive">📋 {t('pages:reportFilterResReceive')}</option>
            <option value="picklist_issue">📋 {t('pages:reportFilterPicklist')}</option>
            <option value="booking_out">📦 {t('pages:reportFilterBookingOut')}</option>
          </select>
        </div>
        <button type="submit" className="btn">{t('common:searchBtn')}</button>
        {(search || actionFilter) && (
          <button type="button" className="btn-outline" style={{ border: 'none', textDecoration: 'underline' }} onClick={handleClear}>
            {t('pages:reportClearSearch')}
          </button>
        )}
      </form>

      {error && (
        <div className="message warning" style={{ marginBottom: '1rem' }}>
          {error}
          <button type="button" style={{ marginLeft: 8 }} onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Table */}
      <div className="table-container fade-in" style={{ animationDelay: '0.1s' }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 60, textAlign: 'center' }}>#</th>
              <th>{t('common:products')}</th>
              <th>PUID</th>
              <th>{t('common:type')}</th>
              <th>{t('common:quantity')}</th>
              <th>{t('common:user')}</th>
              <th>{t('common:timestamp')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  <i className="fas fa-circle-notch fa-spin" style={{ fontSize: '2rem' }} />
                  <p style={{ marginTop: 12 }}>{t('common:loading')}</p>
                </td>
              </tr>
            ) : rows.length > 0 ? (
              rows.map((row, index) => {
                const i = (page - 1) * PAGE_SIZE + index + 1;
                const prodName = row.productName || t('pages:reportUnknownProduct');
                const userName = row.username || t('pages:reportUnknownUser');

                const parsed = parseActionLog(row.action, t, row.remark);
                const { kind, actionText, puid, subQty } = parsed;

                let badgeClass = 'badge-picklist';
                let badgeIcon = 'fa-list-check';
                if (kind === 'add') { badgeClass = 'badge-add'; badgeIcon = 'fa-arrow-down'; }
                else if (kind === 'res_receive') { badgeClass = 'badge-res-receive'; badgeIcon = 'fa-file-invoice'; }
                else if (kind === 'booking_out') { badgeClass = 'badge-booking-out'; badgeIcon = 'fa-dolly'; }

                const dateStr = row.createdAt ? format(new Date(row.createdAt), 'dd/MM/yyyy') : '—';
                const timeStr = row.createdAt ? format(new Date(row.createdAt), 'HH:mm') : '—';
                const timeSuffix = t('pages:reportTimeSuffix');

                return (
                  <tr key={row.id} className="stagger-row hover-glow" style={{ animationDelay: `${0.1 + (index % 10) * 0.05}s` }}>
                    <td style={{ textAlign: 'center', color: '#94a3b8', fontWeight: 'bold' }}>{i}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#334155' }}>
                        {row.productName === null ? (
                          <span style={{ color: '#ef4444', fontStyle: 'italic' }}>
                            {t('pages:reportProductDeleted')} (ID: {row.productId})
                          </span>
                        ) : prodName}
                      </div>
                    </td>
                    <td>
                      {puid !== '-' ? (
                        <span className="puid-tag">{puid}</span>
                      ) : (
                        <span style={{ color: '#cbd5e1' }}>-</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${badgeClass}`}>
                        <i className={`fas ${badgeIcon}`} /> {actionText}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#334155' }}>
                        {row.quantity.toLocaleString()}
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'normal', marginLeft: 4 }}>
                          ({t('pages:reportTransaction')})
                        </span>
                      </div>
                      {subQty > 0 && (
                        <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 2 }}>
                          <i className="fas fa-box-open" style={{ fontSize: '0.8rem', marginRight: 4 }} />
                          {t('pages:expiryTotalQty')} <b>{subQty.toLocaleString()}</b>
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.9rem' }}>{userName}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{dateStr}</div>
                      <div className="item-meta">{timeStr}{timeSuffix}</div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="empty-state">
                  <i className="fas fa-clipboard-list" style={{ fontSize: '3rem', marginBottom: 15, opacity: 0.3 }} />
                  <p>{t('common:noData')}</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination & Summary */}
      {!loading && rowCount > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ color: '#64748b', fontSize: '0.9rem' }}>
            {t('pages:reportPagination', {
              from: (page - 1) * PAGE_SIZE + 1,
              to: Math.min(rowCount, page * PAGE_SIZE),
              total: rowCount.toLocaleString(),
            })}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                type="button"
                className={`page-link${page <= 1 ? ' disabled' : ''}`}
                disabled={page <= 1}
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
                className={`page-link${page >= totalPages ? ' disabled' : ''}`}
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                <i className="fas fa-chevron-right" />
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
