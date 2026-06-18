import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import HomeIcon from '@mui/icons-material/Home';
import LogoutIcon from '@mui/icons-material/Logout';

interface AppFactoryBarProps {
  title?: string;
  isDashboard?: boolean;
  pageIcon?: React.ReactNode;
  showHome?: boolean;
}

export function AppFactoryBar({
  title,
  isDashboard = false,
  pageIcon,
  showHome = true,
}: AppFactoryBarProps) {
  const { t, i18n } = useTranslation(['menu', 'common', 'pages']);
  const { user, logout, changeLanguage } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const setLang = (lang: 'th' | 'en') => {
    void changeLanguage(lang);
  };

  const handleLogout = () => {
    if (window.confirm(t('common:confirmLogout'))) {
      void logout();
      navigate('/login');
    }
  };

  return (
    <header className="fx-appbar">
      <div className="fx-appbar__brand">
        {pageIcon ?? <WarehouseIcon sx={{ color: '#34d399', fontSize: 22 }} />}
        {isDashboard ? (
          <span>{t('pages:systemName')}</span>
        ) : (
          <h1 className="fx-appbar__title">{title ?? t('menu:dashboard')}</h1>
        )}
      </div>
      <div className="fx-appbar__actions">
        <div className="fx-lang">
          <button
            type="button"
            className={i18n.language === 'th' ? 'is-active' : ''}
            onClick={() => setLang('th')}
          >
            TH
          </button>
          <span>|</span>
          <button
            type="button"
            className={i18n.language === 'en' ? 'is-active' : ''}
            onClick={() => setLang('en')}
          >
            EN
          </button>
        </div>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: 16, gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 8, flexShrink: 0 }}>
                {user.username.length === 6 && /^\d+$/.test(user.username) && (
                  <img 
                    src={`http://199.10.10.170/Allpic/${user.username}.jpg`} 
                    alt={user.username}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                    onError={(e) => { 
                      e.currentTarget.style.display = 'none'; 
                      const iconEl = e.currentTarget.nextElementSibling;
                      if (iconEl) (iconEl as HTMLElement).style.display = 'block';
                    }}
                  />
                )}
                <i 
                  className="fas fa-user" 
                  style={{ color: '#94a3b8', fontSize: '0.9rem', display: user.username.length === 6 && /^\d+$/.test(user.username) ? 'none' : 'block' }}
                ></i>
              </div>
              <span className="fx-appbar__user" style={{ margin: 0 }}>
                {user.username} ({user.role})
              </span>
            </div>
            {isDashboard && (
              <button type="button" className="fx-btn-ghost" onClick={handleLogout} style={{ padding: '6px 10px' }}>
                <LogoutIcon sx={{ fontSize: 18 }} />
              </button>
            )}
          </div>
        )}
        {showHome && !isDashboard && location.pathname !== '/app' && (
          <RouterLink to="/app" className="fx-btn-ghost" style={{ marginLeft: 8 }}>
            <HomeIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
            {t('common:backToHome')}
          </RouterLink>
        )}
      </div>
    </header>
  );
}
