import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import { Box, CircularProgress } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAuthHydrated } from '../hooks/useAuthHydrated';
import { getErrorMessage } from '../services/apiClient';

export function LoginPage() {
  const { t, i18n } = useTranslation(['common', 'pages']);
  const hydrated = useAuthHydrated();
  const { login, isAuthenticated, changeLanguage } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/app';

  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  useEffect(() => {
    if (searchParams.get('timeout') === '1') {
      setError(t('common:sessionExpired'));
      setSearchParams({}, { replace: true });
    } else if (searchParams.get('shift') === '1') {
      setError(t('common:shiftLogout'));
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, t]);

  if (!hydrated) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
        <CircularProgress sx={{ color: '#fff' }} />
      </Box>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username.trim(), password);
      sessionStorage.setItem('vl-login-at', String(Date.now()));
      navigate(from, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, t('common:error'), t));
    } finally {
      setLoading(false);
    }
  };

  const handleUsernameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    passwordRef.current?.focus();
  };

  const handlePasswordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    formRef.current?.requestSubmit();
  };

  return (
    <div className="login-card">
      <div className="login-header">
        <div className="brand-icon-wrapper">
          <ViewInArIcon className="brand-icon" sx={{ fontSize: '2.2rem', color: 'white' }} />
        </div>
        <h1>{t('pages:loginTitle')}</h1>
        <p>{t('pages:loginSubtitle')}</p>
      </div>

      {error && (
        <div className="error-message" role="alert">
          <ErrorOutlineIcon />
          <span>{error}</span>
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit}>
        <div className="input-group">
          <label htmlFor="username">{t('common:username')}</label>
          <div className="input-wrapper">
            <PersonIcon className="input-icon" sx={{ fontSize: 18 }} />
            <input
              ref={usernameRef}
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleUsernameKeyDown}
              placeholder={t('pages:usernamePlaceholder')}
              autoComplete="username"
              autoFocus
              required
            />
          </div>
        </div>
        <div className="input-group">
          <label htmlFor="password">{t('common:password')}</label>
          <div className="input-wrapper">
            <LockIcon className="input-icon" sx={{ fontSize: 18 }} />
            <input
              ref={passwordRef}
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handlePasswordKeyDown}
              placeholder={t('pages:passwordPlaceholder')}
              autoComplete="current-password"
              required
            />
          </div>
        </div>
        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? t('common:loading') : t('common:login')}
          <ArrowForwardIcon sx={{ fontSize: 20 }} />
        </button>
      </form>

      <div className="lang-switch-login">
        <button
          type="button"
          className={i18n.language === 'th' ? 'active' : ''}
          onClick={() => void changeLanguage('th')}
        >
          {t('common:thai')}
        </button>
        <span className="lang-divider">|</span>
        <button
          type="button"
          className={i18n.language === 'en' ? 'active' : ''}
          onClick={() => void changeLanguage('en')}
        >
          {t('common:english')}
        </button>
      </div>

      <div className="footer-text">
        &copy; {new Date().getFullYear()} {t('pages:systemName')}
      </div>
    </div>
  );
}
