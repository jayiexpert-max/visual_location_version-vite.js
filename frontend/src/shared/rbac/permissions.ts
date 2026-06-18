import type { UserRole } from '../types/roles';

export const MENU_KEYS = [
  'dashboard',
  'search',
  'receiveReservation',
  'receiveReturn',
  'hanaPicklist',
  'picklist',
  'bookingOut',
  'woMaterialCalc',
  'rackOverview',
  'expiryCheck',
  'layout3d',
  'tvDisplay',
  'stockReports',
  'materials',
  'receiveList',
  'userManagement',
  'systemAdmin',
  'handheld',
  'abdulAi',
] as const;

export type MenuKey = (typeof MENU_KEYS)[number];

export const ROLE_MENU_ACCESS: Record<UserRole, readonly MenuKey[]> = {
  user: [
    'dashboard',
    'search',
    'hanaPicklist',
    'picklist',
    'rackOverview',
    'expiryCheck',
    'stockReports',
    'handheld',
    'abdulAi',
  ],
  material_prep: [
    'dashboard',
    'search',
    'receiveReservation',
    'receiveReturn',
    'hanaPicklist',
    'picklist',
    'bookingOut',
    'woMaterialCalc',
    'rackOverview',
    'expiryCheck',
    'stockReports',
    'handheld',
    'abdulAi',
  ],
  admin: [
    'dashboard',
    'search',
    'receiveReservation',
    'receiveReturn',
    'hanaPicklist',
    'picklist',
    'bookingOut',
    'woMaterialCalc',
    'rackOverview',
    'expiryCheck',
    'layout3d',
    'tvDisplay',
    'stockReports',
    'receiveList',
    'userManagement',
    'handheld',
    'abdulAi',
  ],
  manage: [
    'dashboard',
    'search',
    'receiveReservation',
    'receiveReturn',
    'hanaPicklist',
    'picklist',
    'bookingOut',
    'woMaterialCalc',
    'rackOverview',
    'expiryCheck',
    'layout3d',
    'tvDisplay',
    'stockReports',
    'materials',
    'receiveList',
    'userManagement',
    'systemAdmin',
    'handheld',
    'abdulAi',
  ],
};

export function canAccessMenu(role: UserRole, menu: MenuKey): boolean {
  return ROLE_MENU_ACCESS[role].includes(menu);
}

/** Abdul AI is available to all authenticated roles (matches PHP dashboard). */
export function canAccessAbdulAi(_role: UserRole): boolean {
  return true;
}
