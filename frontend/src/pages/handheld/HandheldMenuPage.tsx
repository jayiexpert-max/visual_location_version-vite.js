import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { HandheldTopBar } from '../../components/handheld/HandheldTopBar';

export function HandheldMenuPage() {
  const { t } = useTranslation(['pages', 'menu']);
  const { user, logout, canAccess } = useAuth();

  const canReceive = canAccess('receiveReservation') || canAccess('receiveReturn');
  const canPicklist = canAccess('picklist');

  const handleLogout = () => {
    if (!window.confirm(t('pages:handheldLogoutConfirm'))) return;
    void logout().then(() => {
      window.location.assign('/handheld/login');
    });
  };

  return (
    <>
      <HandheldTopBar
        mode="menu"
        title={t('pages:handheldTitle')}
        user={user?.username}
      />

      <nav className="hh-menu-grid" aria-label={t('pages:handheldMenuAria')}>
        {canReceive && canAccess('receiveReturn') ? (
          <Link className="hh-menu-button hh-add" to="/handheld/add-stock">
            <span className="hh-button-title">{t('pages:handheldAddStock')}</span>
            <span className="hh-button-subtitle">{t('pages:handheldAddStockDesc')}</span>
          </Link>
        ) : null}

        {canPicklist ? (
          <Link className="hh-menu-button hh-picklist" to="/handheld/picklist">
            <span className="hh-button-title">{t('pages:handheldPicklist')}</span>
            <span className="hh-button-subtitle">{t('pages:handheldPicklistDesc')}</span>
          </Link>
        ) : null}

        {canReceive && canAccess('receiveReservation') ? (
          <Link className="hh-menu-button hh-reserve" to="/handheld/receive-reservation">
            <span className="hh-button-title">{t('pages:handheldReceiveRes')}</span>
            <span className="hh-button-subtitle">{t('pages:handheldReceiveResDesc')}</span>
          </Link>
        ) : null}

        <button type="button" className="hh-menu-button hh-logout-card" onClick={handleLogout}>
          <span className="hh-button-title">{t('common:logout')}</span>
        </button>
      </nav>
    </>
  );
}
