import type { UserRole } from '../types/roles';

export const MENU_KEYS = [
  'dashboard',
  'search',
  'receiveReservation',
  'receiveReturn',
  'picklist',
  'rackOverview',
  'expiryCheck',
  'layout3d',
  'tvDisplay',
  'stockReports',
  'userManagement',
  'systemAdmin',
  'handheld',
] as const;

export type MenuKey = (typeof MENU_KEYS)[number];

export const ROLE_MENU_ACCESS: Record<UserRole, readonly MenuKey[]> = {
  user: [
    'dashboard',
    'search',
    'rackOverview',
    'expiryCheck',
    'stockReports',
    'handheld',
  ],
  material_prep: [
    'dashboard',
    'search',
    'receiveReservation',
    'receiveReturn',
    'picklist',
    'rackOverview',
    'expiryCheck',
    'stockReports',
    'handheld',
  ],
  admin: [
    'dashboard',
    'search',
    'receiveReservation',
    'receiveReturn',
    'picklist',
    'rackOverview',
    'expiryCheck',
    'layout3d',
    'tvDisplay',
    'stockReports',
    'userManagement',
    'systemAdmin',
    'handheld',
  ],
};

export function canAccessMenu(role: UserRole, menu: MenuKey): boolean {
  return ROLE_MENU_ACCESS[role].includes(menu);
}
