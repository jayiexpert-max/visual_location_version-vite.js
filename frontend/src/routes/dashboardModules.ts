import { buildKioskUrl } from '../utils/kioskUrl';
import type { MenuKey, UserRole } from '@visual-location/shared';
import type { SvgIconComponent } from '@mui/icons-material';
import SearchIcon from '@mui/icons-material/Search';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import ListAltIcon from '@mui/icons-material/ListAlt';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CalculateIcon from '@mui/icons-material/Calculate';
import TvIcon from '@mui/icons-material/Tv';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import AssessmentIcon from '@mui/icons-material/Assessment';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import InventoryIcon from '@mui/icons-material/Inventory';
import PeopleIcon from '@mui/icons-material/People';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import SettingsIcon from '@mui/icons-material/Settings';

export interface DashboardModule {
  key: MenuKey;
  path: string;
  external?: boolean;
  icon: SvgIconComponent;
  hoverColor: string;
  iconBg: string;
  iconColor: string;
  badgeKey?: 'picklist';
  /** When set, dashboard card is shown only for these roles (handheld UI stays open to all). */
  dashboardRoles?: readonly UserRole[];
}

const HANA_URL =
  import.meta.env.VITE_HANA_PICKLIST_URL ??
  'http://194.10.10.15/hana_report/Default.aspx';

const ABDUL_CHAT_PATH = '/app/abdul-chat';

export const DASHBOARD_MODULES: DashboardModule[] = [
  {
    key: 'search',
    path: '/app/search',
    icon: SearchIcon,
    hoverColor: '#f59e0b',
    iconBg: '#ffedd5',
    iconColor: '#d97706',
  },
  {
    key: 'receiveReservation',
    path: '/app/receive-reservation',
    icon: ReceiptLongIcon,
    hoverColor: '#10b981',
    iconBg: '#dcfce7',
    iconColor: '#10b981',
  },
  {
    key: 'receiveReturn',
    path: '/app/receive-return',
    icon: AddCircleIcon,
    hoverColor: '#10b981',
    iconBg: '#dcfce7',
    iconColor: '#10b981',
  },
  {
    key: 'hanaPicklist',
    path: HANA_URL,
    external: true,
    icon: ListAltIcon,
    hoverColor: '#7c3aed',
    iconBg: '#ede9fe',
    iconColor: '#6d28d9',
  },
  {
    key: 'picklist',
    path: '/app/picklist',
    icon: PlaylistAddCheckIcon,
    hoverColor: '#ea580c',
    iconBg: '#ffedd5',
    iconColor: '#c2410c',
    badgeKey: 'picklist',
  },
  {
    key: 'bookingOut',
    path: '/app/booking-out',
    icon: LocalShippingIcon,
    hoverColor: '#0891b2',
    iconBg: '#cffafe',
    iconColor: '#0e7490',
  },
  {
    key: 'woMaterialCalc',
    path: '/app/wo-material-calc',
    icon: CalculateIcon,
    hoverColor: '#0284c7',
    iconBg: '#e0f2fe',
    iconColor: '#0284c7',
  },
  {
    key: 'tvDisplay',
    path: buildKioskUrl('/tv'),
    external: true,
    icon: TvIcon,
    hoverColor: '#0ea5e9',
    iconBg: '#e0f2fe',
    iconColor: '#0ea5e9',
  },
  {
    key: 'layout3d',
    path: buildKioskUrl('/layout-3d'),
    external: true,
    icon: ViewInArIcon,
    hoverColor: '#0891b2',
    iconBg: '#cffafe',
    iconColor: '#0e7490',
  },
  {
    key: 'abdulAi',
    path: ABDUL_CHAT_PATH,
    icon: SmartToyIcon,
    hoverColor: '#2563eb',
    iconBg: '#eff6ff',
    iconColor: '#1d4ed8',
  },
  {
    key: 'stockReports',
    path: '/app/reports',
    icon: AssessmentIcon,
    hoverColor: '#2563eb',
    iconBg: '#dbeafe',
    iconColor: '#1d4ed8',
  },
  {
    key: 'expiryCheck',
    path: '/app/expiry',
    icon: HourglassBottomIcon,
    hoverColor: '#f97316',
    iconBg: '#ffedd5',
    iconColor: '#c2410c',
  },
  {
    key: 'materials',
    path: '/app/materials',
    icon: InventoryIcon,
    hoverColor: '#ec4899',
    iconBg: '#fce7f3',
    iconColor: '#db2777',
  },
  {
    key: 'userManagement',
    path: '/app/users',
    icon: PeopleIcon,
    hoverColor: '#0f172a',
    iconBg: '#f1f5f9',
    iconColor: '#334155',
  },
  {
    key: 'receiveList',
    path: '/app/receive-list',
    icon: WarehouseIcon,
    hoverColor: '#14b8a6',
    iconBg: '#ccfbf1',
    iconColor: '#0d9488',
  },
  {
    key: 'handheld',
    path: '/handheld',
    external: true,
    dashboardRoles: ['manage'],
    icon: PhoneAndroidIcon,
    hoverColor: '#38bdf8',
    iconBg: '#0f172a',
    iconColor: '#38bdf8',
  },
  {
    key: 'systemAdmin',
    path: '/app/admin',
    icon: SettingsIcon,
    hoverColor: '#0f172a',
    iconBg: '#f1f5f9',
    iconColor: '#0f172a',
  },
];
