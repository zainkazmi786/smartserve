/**
 * RBAC Permission Utilities
 * Check user permissions based on backend role permissions
 * Permissions are fetched from backend API, not hardcoded
 */

import { User } from '@/services/authService';

export type Resource = 
  | 'users'
  | 'cafes'
  | 'menus'
  | 'menuItems'
  | 'orders'
  | 'reviews'
  | 'roles'
  | 'settings';

export type Action = 
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'approve'
  | 'manage';

export interface Permission {
  resource: Resource;
  actions: Action[];
}

/**
 * Fallback permission matrix (only used if backend permissions are missing)
 * This should rarely be needed as backend always returns permissions
 */
const DEFAULT_PERMISSIONS: Record<string, Permission[]> = {
  superadmin: [
    { resource: 'users', actions: ['create', 'read', 'update', 'delete', 'manage'] },
    { resource: 'cafes', actions: ['create', 'read', 'update', 'delete', 'manage'] },
    { resource: 'menus', actions: ['create', 'read', 'update', 'delete', 'manage'] },
    { resource: 'menuItems', actions: ['create', 'read', 'update', 'delete', 'manage'] },
    { resource: 'orders', actions: ['create', 'read', 'update', 'delete', 'approve', 'manage'] },
    { resource: 'reviews', actions: ['read', 'update', 'delete', 'manage'] },
    { resource: 'roles', actions: ['read', 'update', 'manage'] },
    { resource: 'settings', actions: ['read', 'update', 'manage'] },
  ],
  manager: [
    { resource: 'users', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'cafes', actions: ['read', 'update'] },
    { resource: 'menus', actions: ['create', 'read', 'update', 'delete', 'manage'] },
    { resource: 'menuItems', actions: ['create', 'read', 'update', 'delete', 'manage'] },
    { resource: 'orders', actions: ['read', 'update', 'approve'] },
    { resource: 'reviews', actions: ['read', 'update'] },
    { resource: 'settings', actions: ['read', 'update'] },
  ],
  receptionist: [
    { resource: 'cafes', actions: ['read'] },
    { resource: 'menus', actions: ['create', 'read', 'update', 'delete', 'manage'] },
    { resource: 'menuItems', actions: ['create', 'read', 'update', 'delete', 'manage'] },
    { resource: 'orders', actions: ['read', 'update', 'approve'] },
    { resource: 'reviews', actions: ['read'] },
    { resource: 'settings', actions: ['read'] },
  ],
  customer: [
    { resource: 'orders', actions: ['create', 'read'] },
    { resource: 'reviews', actions: ['create', 'read'] },
  ],
};

/**
 * Check if a user has permission for a specific resource and action
 * Uses permissions from backend (user.role.permissions)
 * Falls back to DEFAULT_PERMISSIONS only if backend permissions are missing
 * 
 * @param user - User object from AuthContext (includes role.permissions from backend)
 * @param resource - Resource to check access for
 * @param action - Action to check permission for
 * @returns true if user has permission, false otherwise
 */
export function hasPermission(
  user: User | null | undefined,
  resource: Resource,
  action: Action
): boolean {
  if (!user || !user.role) {
    return false;
  }

  // Primary: Use permissions from backend (user.role.permissions)
  // Fallback: Use default permissions if backend permissions are missing
  const permissions = user.role.permissions && user.role.permissions.length > 0
    ? user.role.permissions
    : DEFAULT_PERMISSIONS[user.role.name] || [];

  // Find permission for the resource
  const resourcePermission = permissions.find(
    (p) => p.resource === resource
  );

  if (!resourcePermission) {
    return false;
  }

  // Check if the action is allowed
  // 'manage' permission grants all actions
  return (
    resourcePermission.actions.includes(action) ||
    resourcePermission.actions.includes('manage')
  );
}

/**
 * Check if a user has any of the specified permissions
 * 
 * @param user - User object from AuthContext
 * @param permissionChecks - Array of { resource, action } objects to check
 * @returns true if user has at least one permission, false otherwise
 */
export function hasAnyPermission(
  user: User | null | undefined,
  permissionChecks: Array<{ resource: Resource; action: Action }>
): boolean {
  return permissionChecks.some(({ resource, action }) =>
    hasPermission(user, resource, action)
  );
}

/**
 * Check if a user has all of the specified permissions
 * 
 * @param user - User object from AuthContext
 * @param permissionChecks - Array of { resource, action } objects to check
 * @returns true if user has all permissions, false otherwise
 */
export function hasAllPermissions(
  user: User | null | undefined,
  permissionChecks: Array<{ resource: Resource; action: Action }>
): boolean {
  return permissionChecks.every(({ resource, action }) =>
    hasPermission(user, resource, action)
  );
}
