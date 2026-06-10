import type { MenuKey } from '@visual-location/shared';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SearchIcon from '@mui/icons-material/Search';
import InventoryIcon from '@mui/icons-material/Inventory';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import TvIcon from '@mui/icons-material/Tv';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import type { SvgIconComponent } from '@mui/icons-material';

export interface MenuItemConfig {
  key: MenuKey;
  path: string;
  icon: SvgIconComponent;
  external?: boolean;
}

export const MENU_ITEMS: MenuItemConfig[] = [
  { key: 'dashboard', path: '/app', icon: DashboardIcon },
  { key: 'search', path: '/app/search', icon: SearchIcon },
  { key: 'receiveReservation', path: '/app/receive-reservation', icon: InventoryIcon },
  { key: 'receiveReturn', path: '/app/receive-return', icon: AssignmentReturnIcon },
  { key: 'picklist', path: '/app/picklist', icon: PlaylistAddCheckIcon },
  { key: 'rackOverview', path: '/app/rack', icon: WarehouseIcon },
  { key: 'expiryCheck', path: '/app/expiry', icon: EventBusyIcon },
  { key: 'layout3d', path: '/layout-3d', icon: ViewInArIcon, external: true },
  { key: 'tvDisplay', path: '/tv', icon: TvIcon, external: true },
  { key: 'stockReports', path: '/app/reports', icon: AssessmentIcon },
  { key: 'userManagement', path: '/app/users', icon: PeopleIcon },
  { key: 'systemAdmin', path: '/app/admin', icon: SettingsIcon },
];
