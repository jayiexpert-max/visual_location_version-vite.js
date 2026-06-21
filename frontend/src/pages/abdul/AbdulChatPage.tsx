import BoltIcon from '@mui/icons-material/Bolt';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CodeIcon from '@mui/icons-material/Code';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SearchIcon from '@mui/icons-material/Search';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { askAbdulChat, getAbdulChatErrorMessage, type AbdulChatResponse } from '../../services/abdulChatService';
import { formatFactoryDate, parseFactoryDate } from '../../utils/dateTime';

const INTENT_KEYS = [
  'find_location',
  'stock_check',
  'expired_material',
  'near_expiry',
  'find_puid',
  'rack_items',
  'search_item',
  'list_all',
] as const;

const COLUMN_KEYS = [
  'HanaPart',
  'Description',
  'QtyRemain',
  'QtyOriginal',
  'Shelf',
  'Level',
  'Box',
  'Block',
  'ExpirationDate',
  'DaysRemaining',
  'DaysOverdue',
  'StatusName',
  'PUID',
  'LotNo',
  'DateCode',
] as const;

type ColumnKey = (typeof COLUMN_KEYS)[number];

function getExpiryStatus(row: Record<string, string | number | null | undefined>) {
  const explicitStatus = String(row.ExpiryStatus ?? '');
  if (explicitStatus === 'Expired') {
    return { label: 'Expired', kind: 'danger' as const };
  }
  if (explicitStatus === 'Near expiry') {
    return { label: 'Near expiry', kind: 'warning' as const };
  }
  if (explicitStatus === 'Normal') {
    return { label: 'Normal', kind: 'success' as const };
  }

  const daysRemaining = row.DaysRemaining;
  const daysOverdue = row.DaysOverdue;

  const overdueNum = Number(daysOverdue);
  if (!Number.isNaN(overdueNum) && overdueNum > 0) {
    return { label: 'Expired', kind: 'danger' as const };
  }

  const remainingNum = Number(daysRemaining);
  if (!Number.isNaN(remainingNum)) {
    if (remainingNum <= 7) {
      return { label: 'Near expiry', kind: 'warning' as const };
    }
    return { label: 'Normal', kind: 'success' as const };
  }

  return { label: 'Unknown', kind: 'info' as const };
}

function renderCell(key: string, val: string | number | null | undefined) {
  if (key === 'DaysRemaining') {
    const n = parseInt(String(val), 10);
    if (Number.isNaN(n)) return '—';
    if (n <= 3) {
      return <span className="abdul-badge abdul-badge--danger">{n} วัน</span>;
    }
    if (n <= 7) {
      return <span className="abdul-badge abdul-badge--warning">{n} วัน</span>;
    }
    if (n <= 14) {
      return <span className="abdul-badge abdul-badge--warning">{n} วัน</span>;
    }
    return <span className="abdul-badge abdul-badge--success">{n} วัน</span>;
  }

  if (key === 'DaysOverdue') {
    return (
      <span className="abdul-badge abdul-badge--danger">+{val} วัน</span>
    );
  }

  if (key === 'QtyRemain' || key === 'QtyOriginal') {
    const n = parseInt(String(val), 10);
    if (Number.isNaN(n)) return '—';
    if (n === 0) {
      return <span className="abdul-qty abdul-qty--zero">0</span>;
    }
    if (n <= 100) {
      return <span className="abdul-qty abdul-qty--low">{n.toLocaleString()}</span>;
    }
    return <span className="abdul-qty abdul-qty--ok">{n.toLocaleString()}</span>;
  }

  if (key === 'Shelf' || key === 'Level' || key === 'Box' || key === 'Block') {
    return (
      <span className="abdul-badge abdul-badge--info">
        <LocationOnIcon sx={{ fontSize: 12 }} /> {val || '-'}
      </span>
    );
  }

  if (key === 'ExpirationDate') {
    if (!val) return <span className="abdul-muted">—</span>;
    const dateStr = formatFactoryDate(val) ?? String(val);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = parseFactoryDate(val) ?? new Date(`${dateStr}T00:00:00`);
    exp.setHours(0, 0, 0, 0);
    if (exp < today) {
      return <span className="abdul-badge abdul-badge--danger">{dateStr}</span>;
    }
    return dateStr;
  }

  if (key === 'StatusName') {
    const s = String(val ?? '').toLowerCase();
    if (s.includes('withdrawn') || s.includes('empty')) {
      return <span className="abdul-badge abdul-badge--danger">{val}</span>;
    }
    if (s.includes('blocked')) {
      return <span className="abdul-badge abdul-badge--warning">{val}</span>;
    }
    return <span className="abdul-badge abdul-badge--success">{val}</span>;
  }

  if (key === 'ExpiryStatus') {
    const status = String(val ?? '');
    if (status === 'Expired') {
      return <span className="abdul-badge abdul-badge--danger">หมดอายุ</span>;
    }
    if (status === 'Near expiry') {
      return <span className="abdul-badge abdul-badge--warning">ใกล้หมดอายุ</span>;
    }
    if (status === 'Normal') {
      return <span className="abdul-badge abdul-badge--success">ปกติ</span>;
    }
    return <span className="abdul-badge abdul-badge--info">{status || '—'}</span>;
  }

  if (val === null || val === undefined) {
    return <span className="abdul-muted">—</span>;
  }

  return String(val);
}

export function AbdulChatPage() {
  const { t } = useTranslation(['pages', 'common']);
  const inputRef = useRef<HTMLInputElement>(null);

  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<AbdulChatResponse | null>(null);
  const [showSql, setShowSql] = useState(false);

  const chips = useMemo(
    () => [
      { label: t('pages:abdulChipLocation'), query: '8041ISTC150J101 อยู่ไหน' },
      { label: t('pages:abdulChipExpired'), query: 'สินค้าที่หมดอายุ' },
      { label: t('pages:abdulChipNearExpiry'), query: 'สินค้าใกล้หมดอายุ' },
      { label: t('pages:abdulChipRack'), query: 'ชั้น 3' },
      { label: t('pages:abdulChipStock'), query: 'เช็คสต็อก 1051IST' },
      { label: t('pages:abdulChipPuid'), query: 'PUID 083B6N' },
      { label: t('pages:abdulChipAll'), query: 'ดูสินค้าทั้งหมด' },
    ],
    [t],
  );

  const intentLabel = useCallback(
    (intent: string) => {
      if ((INTENT_KEYS as readonly string[]).includes(intent)) {
        return t(`pages:abdulIntent_${intent}`);
      }
      return intent;
    },
    [t],
  );

  const columnLabel = useCallback(
    (key: string) => {
      if ((COLUMN_KEYS as readonly string[]).includes(key as ColumnKey)) {
        return t(`pages:abdulCol_${key}`);
      }
      return key;
    },
    [t],
  );

  const askQuestion = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;

      setLoading(true);
      setError(null);
      setResponse(null);
      setShowSql(false);

      try {
        const data = await askAbdulChat(trimmed);
        if (data.error) {
          setError(data.error);
          return;
        }
        setResponse(data);
      } catch (err) {
        setError(getAbdulChatErrorMessage(err, t('pages:abdulApiErrorGeneric')));
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  const handleSubmit = () => {
    void askQuestion(question);
  };

  const tableKeys =
    response?.data && response.data.length > 0
      ? ['ExpiryStatus', ...Object.keys(response.data[0]).filter((key) => key !== 'DaysRemaining' && key !== 'DaysOverdue' && key !== 'ExpiryStatus')]
      : [];

  return (
    <div className="abdul-chat-page">
      <div className="abdul-chat-page__inner">
        <header className="abdul-header">
          <div className="abdul-header-badge">
            <BoltIcon sx={{ fontSize: 14 }} />
            {t('pages:abdulBadge')}
          </div>
          <div className="abdul-logo-container">
            <div className="abdul-logo-icon-wrapper">
              <img
                src="/assets/img/abdul_ai_2.png"
                alt="Abdul Chat"
                className="abdul-logo-icon"
              />
            </div>
            <h1>{t('pages:abdulTitle')}</h1>
          </div>
          <p>{t('pages:abdulSubtitle')}</p>
        </header>

        <div className="abdul-search-box">
          <input
            ref={inputRef}
            type="text"
            className="abdul-search-input"
            placeholder={t('pages:abdulPlaceholder')}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
            autoComplete="off"
          />
          <button type="button" className="abdul-search-btn" onClick={handleSubmit} disabled={loading}>
            <BoltIcon sx={{ fontSize: 18 }} />
            <span>{t('pages:abdulSearch')}</span>
          </button>
        </div>

        <div className="abdul-chips">
          {chips.map((chip) => (
            <button
              key={chip.query}
              type="button"
              className="abdul-chip"
              onClick={() => {
                setQuestion(chip.query);
                void askQuestion(chip.query);
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="abdul-response-area">
          {loading && (
            <div className="abdul-loader-container abdul-loader-container--show">
              <div className="abdul-pulse-loader">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}

          {!loading && !response && !error && (
            <div className="abdul-empty-state">
              <ChatBubbleOutlineIcon sx={{ fontSize: 48, opacity: 0.3 }} />
              <p>{t('pages:abdulEmpty')}</p>
            </div>
          )}

          {!loading && error && (
            <div className="abdul-empty-state">
              <ErrorOutlineIcon sx={{ fontSize: 48, color: 'var(--abdul-danger)' }} />
              <p className="abdul-error-text">{error}</p>
            </div>
          )}

          {!loading && response && (
            <>
              <div className="abdul-intent-bar abdul-intent-bar--show">
                <div className="abdul-intent-left">
                  <span className="abdul-intent-label">{intentLabel(response.intent)}</span>
                  <span className="abdul-perf-badge">
                    <BoltIcon sx={{ fontSize: 14 }} />
                    <span className="abdul-ms-val">{response.response_ms}</span>ms
                  </span>
                  <button
                    type="button"
                    className="abdul-toggle-sql"
                    onClick={() => setShowSql((v) => !v)}
                  >
                    <CodeIcon sx={{ fontSize: 14 }} /> SQL
                  </button>
                </div>
                <span className="abdul-result-count">
                  <strong>{response.count}</strong> {t('pages:abdulResultCount')}
                </span>
              </div>

              {showSql && response.sql_debug && (
                <pre className="abdul-sql-debug abdul-sql-debug--show">{response.sql_debug}</pre>
              )}

              <div className="abdul-table-wrapper abdul-table-wrapper--show">
                <table>
                  <thead>
                    <tr>
                      {tableKeys.map((key) => (
                        <th key={key}>{columnLabel(key)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {!response.data || response.data.length === 0 ? (
                      <tr>
                        <td colSpan={100}>
                          <div className="abdul-no-results">
                            <SearchIcon sx={{ fontSize: 40, opacity: 0.4 }} />
                            <p>{t('pages:abdulNoResults')}</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      response.data.map((row, idx) => {
                        const expiryStatus = getExpiryStatus(row);
                        const displayRow: Record<string, string | number | null | undefined> = {
                          ExpiryStatus: row.ExpiryStatus ?? expiryStatus.label,
                          ...row,
                        };

                        return (
                        <tr key={idx}>
                          {tableKeys.map((key) => (
                            <td key={key}>{renderCell(key, displayRow[key])}</td>
                          ))}
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
