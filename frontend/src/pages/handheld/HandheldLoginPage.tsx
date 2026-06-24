import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAuthHydrated } from '../../hooks/useAuthHydrated';
import { getErrorMessage } from '../../services/apiClient';
import '../../styles/handheld.css';

const ENTER_DEDUPE_MS = 300;

export function HandheldLoginPage() {
  const { t, i18n } = useTranslation(['pages', 'common']);
  const hydrated = useAuthHydrated();
  const { login, isAuthenticated, changeLanguage } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const lastEnterRef = useRef(0);

  const loadingRef = useRef(false);

  const [scanValue, setScanValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (searchParams.get('timeout') === '1') {
      setError(t('common:sessionExpired'));
      setSearchParams({}, { replace: true });
    } else if (searchParams.get('reason') === 'shift') {
      setError(t('common:shiftLogout'));
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, t]);

  const stripScanValue = useCallback((raw: string) => raw.replace(/[\r\n]+/g, '').trim(), []);

  const submitLogin = useCallback(
    async (raw?: string) => {
      const id = stripScanValue(raw ?? scanValue);
      if (!id || loadingRef.current) return;

      loadingRef.current = true;
      setScanValue(id);
      setError(null);
      setLoading(true);
      try {
        await login(id, id, 'handheld');
        navigate('/handheld', { replace: true });
      } catch (err) {
        setError(getErrorMessage(err, t('common:error'), t));
        setScanValue('');
        setTimeout(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        }, 50);
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [login, navigate, scanValue, stripScanValue, t],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitLogin();
  };

  const handleScanInput = (value: string, hadSuffix: boolean) => {
    const cleaned = stripScanValue(value);
    setScanValue(cleaned);

    if (hadSuffix && cleaned) {
      void submitLogin(cleaned);
    }
  };

  const handleEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const now = Date.now();
    if (now - lastEnterRef.current < ENTER_DEDUPE_MS) return;
    lastEnterRef.current = now;
    e.preventDefault();
    void submitLogin();
  };

  if (!hydrated) {
    return (
      <div className="handheld-app">
        <main className="handheld-main">
          <p className="fx-alert fx-alert-info">{t('common:loading')}</p>
        </main>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/handheld" replace />;
  }

  return (
    <div className="handheld-app">
      <main className="handheld-main">
        <div className="fx-hh-top fx-hh-top--menu">
          <span className="fx-hh-kicker">KEYENCE BT-A500</span>
          <span className="fx-hh-title">{t('pages:handheldTitle')}</span>
        </div>

        {error ? (
          <section className="fx-alert fx-alert-error" role="alert">
            {error}
          </section>
        ) : (
          <section className="fx-alert fx-alert-info" role="status">
            {t('pages:handheldLoginScanHint')}
          </section>
        )}

        <section className="handheld-login-panel">
          <form ref={formRef} onSubmit={handleSubmit} autoComplete="off">
            <label htmlFor="hh-scan">{t('pages:handheldLoginScanLabel')}</label>
            <input
              ref={inputRef}
              id="hh-scan"
              type="text"
              className="scan-field"
              inputMode="numeric"
              value={scanValue}
              onChange={(e) => {
                const raw = e.target.value;
                handleScanInput(raw, /[\r\n]/.test(raw));
              }}
              onKeyDown={handleEnter}
              autoComplete="off"
              autoFocus
              disabled={loading}
              required
            />

            <button type="submit" className="fx-btn fx-btn-primary" disabled={loading || !scanValue.trim()}>
              {loading ? t('common:loading') : t('common:login')}
            </button>
          </form>
        </section>

        <div className="hh-actions" style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button
            type="button"
            className="fx-btn fx-btn-secondary fx-btn--inline"
            style={{ opacity: i18n.language === 'th' ? 1 : 0.6 }}
            onClick={() => void changeLanguage('th')}
          >
            {t('common:thai')}
          </button>
          <button
            type="button"
            className="fx-btn fx-btn-secondary fx-btn--inline"
            style={{ opacity: i18n.language === 'en' ? 1 : 0.6 }}
            onClick={() => void changeLanguage('en')}
          >
            {t('common:english')}
          </button>
        </div>
      </main>
    </div>
  );
}
