import type { UserRole } from '../types/roles';
export declare const MENU_KEYS: readonly ["dashboard", "search", "receiveReservation", "receiveReturn", "picklist", "rackOverview", "expiryCheck", "layout3d", "tvDisplay", "stockReports", "userManagement", "systemAdmin", "handheld"];
export type MenuKey = (typeof MENU_KEYS)[number];
export declare const ROLE_MENU_ACCESS: Record<UserRole, readonly MenuKey[]>;
export declare function canAccessMenu(role: UserRole, menu: MenuKey): boolean;
