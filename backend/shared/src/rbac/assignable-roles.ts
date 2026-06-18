import { USER_ROLES, type UserRole } from '../types/roles';

/** Roles the actor may assign when creating or changing a user account. */
export function getAssignableRoles(actorRole: UserRole): UserRole[] {
  if (actorRole === 'manage') {
    return [...USER_ROLES];
  }
  if (actorRole === 'admin') {
    return ['admin', 'manage', 'material_prep', 'user'];
  }
  return [];
}

export function canAssignRole(actorRole: UserRole, targetRole: UserRole): boolean {
  return getAssignableRoles(actorRole).includes(targetRole);
}

/** Whether actor may edit, delete, or toggle active status of a target user. */
export function canManageUser(actorRole: UserRole, targetUserRole: UserRole): boolean {
  if (actorRole === 'manage') {
    return true;
  }
  if (actorRole === 'admin') {
    return targetUserRole !== 'manage';
  }
  return false;
}
