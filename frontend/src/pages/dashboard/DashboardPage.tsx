import { Link as RouterLink } from 'react-router-dom';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ListAltIcon from '@mui/icons-material/ListAlt';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { DASHBOARD_MODULES } from '../../routes/dashboardModules';
import { type MenuKey } from '../../shared/rbac/permissions';
import { usePicklistNotify } from '../../hooks/usePicklistNotify';
import * as warehouseService from '../../services/warehouseService';

const VALOR_BI_URL = 'http://194.10.10.15/cust_report/login.aspx';

function useLiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export function DashboardPage() {
  const { t, i18n } = useTranslation(['pages', 'menu', 'common']);
  const { canAccess } = useAuth();
  const now = useLiveClock();

  const hierarchyQuery = useQuery({
    queryKey: ['dashboard', 'hierarchy-stats'],
    queryFn: () => warehouseService.getHierarchy(),
  });

  const picklistNotify = usePicklistNotify(canAccess('picklist'));
  const picklistPending = picklistNotify.pendingCount;

  const productCount = useMemo(() => {
    const hierarchy = hierarchyQuery.data;
    if (!hierarchy) return 0;
    let count = 0;
    for (const rack of hierarchy.racks) {
      for (const level of rack.levels) {
        for (const box of level.boxes) {
          for (const slot of box.slots) {
            if (slot.product) count += 1;
          }
        }
      }
    }
    return count;
  }, [hierarchyQuery.data]);

  const boxCount = useMemo(() => {
    const hierarchy = hierarchyQuery.data;
    if (!hierarchy) return 0;
    return hierarchy.racks.reduce(
      (sum, rack) => sum + rack.levels.reduce((ls, l) => ls + l.boxes.length, 0),
      0,
    );
  }, [hierarchyQuery.data]);

  const modules = DASHBOARD_MODULES.filter((mod) => canAccess(mod.key as MenuKey));

  const dateStr = now.toLocaleDateString(i18n.language === 'th' ? 'th-TH' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString(i18n.language === 'th' ? 'th-TH' : 'en-US', {
    hour12: false,
  });

  return (
    <>
      <div className="fx-dashboard-intro">
        <h2>{t('pages:systemDesc')}</h2>
        <div className="fx-dashboard-clock">
          <CalendarMonthIcon sx={{ fontSize: 18 }} />
          <span>{dateStr}</span>
          <span style={{ color: '#cbd5e1' }}>|</span>
          <AccessTimeIcon sx={{ fontSize: 18 }} />
          <span>{timeStr}</span>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon--products">
            <Inventory2Icon />
          </div>
          <div className="stat-info">
            <h3>{productCount.toLocaleString()}</h3>
            <p>{t('pages:statsProducts')}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon--boxes">
            <ViewModuleIcon />
          </div>
          <div className="stat-info">
            <h3>{boxCount.toLocaleString()}</h3>
            <p>{t('pages:statsBoxes')}</p>
          </div>
        </div>
        {canAccess('picklist') && (
          <RouterLink
            to="/app/picklist"
            className={`stat-card stat-card-link${picklistPending > 0 ? ' stat-card--picklist-alert' : ''}`}
          >
            <div className="stat-icon stat-icon--picklist">
              <ListAltIcon />
            </div>
            <div className="stat-info">
              <h3>{picklistNotify.isLoading ? '…' : picklistPending}</h3>
              <p>{t('pages:picklistPending')}</p>
            </div>
          </RouterLink>
        )}
      </div>

      <h2 className="section-title">{t('pages:mainMenu')}</h2>

      <div className="modules-grid">
        {modules.map((mod) => {
          const Icon = mod.icon;
          const badge =
            mod.badgeKey === 'picklist' && picklistPending > 0 ? picklistPending : 0;
          const cardClass =
            mod.badgeKey === 'picklist' && picklistPending > 0
              ? 'module-card module-card--picklist-pending'
              : 'module-card';
          const cardStyle = {
            '--hover-color': mod.hoverColor,
            '--icon-bg': mod.iconBg,
            '--icon-color': mod.iconColor,
          } as React.CSSProperties;

          const content = (
            <>
              {badge > 0 && (
                <span className="module-badge" aria-label={t('pages:picklistPending')}>
                  {badge}
                </span>
              )}
              <div className="module-icon">
                <Icon sx={{ fontSize: 22 }} />
              </div>
              <div className="module-title">{t(`menu:${mod.key}`)}</div>
              <div className="module-desc">{t(`menuDesc:${mod.key}`)}</div>
              <div className="card-action">
                {t('common:enter')}{' '}
                {mod.external ? (
                  <OpenInNewIcon sx={{ fontSize: 14 }} />
                ) : (
                  <ChevronRightIcon sx={{ fontSize: 14 }} />
                )}
              </div>
            </>
          );

          if (mod.external) {
            return (
              <a
                key={mod.key}
                href={mod.path}
                target="_blank"
                rel="noopener noreferrer"
                className={cardClass}
                style={cardStyle}
              >
                {content}
              </a>
            );
          }

          return (
            <RouterLink key={mod.key} to={mod.path} className={cardClass} style={cardStyle}>
              {content}
            </RouterLink>
          );
        })}
        <a
          href={VALOR_BI_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="module-card"
          style={
            {
              '--hover-color': '#0f766e',
              '--icon-bg': '#ccfbf1',
              '--icon-color': '#0f766e',
            } as React.CSSProperties
          }
        >
          <div className="module-icon">
            <MonitorHeartIcon sx={{ fontSize: 22 }} />
          </div>
          <div className="module-title">{t('pages:dashboardValorBiTitle')}</div>
          <div className="module-desc">{t('pages:dashboardValorBiDesc')}</div>
          <div className="card-action">
            {t('common:enter')} <OpenInNewIcon sx={{ fontSize: 14 }} />
          </div>
        </a>
      </div>
    </>
  );
}
