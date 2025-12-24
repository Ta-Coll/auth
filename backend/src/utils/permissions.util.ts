import { TeamRole } from '../types/creds.types';

/**
 * Permission utility functions for team roles
 * 
 * Role Hierarchy:
 * - admin: Full permissions (all features)
 * - creator: Creation tools + content + chat
 * - member: Content tools + chat only
 */

/**
 * Check if a role has permission to invite users
 * Only admins can invite users
 */
export function canInviteUsers(role: TeamRole): boolean {
  return role === 'admin';
}

/**
 * Check if a role has access to event log viewer
 * Only admins can view event logs
 */
export function canViewEventLogs(role: TeamRole): boolean {
  return role === 'admin';
}

/**
 * Check if a role has access to team admin tools
 * (database scaling, security, AI account management, Policy Manager)
 * Only admins have access
 */
export function canAccessAdminTools(role: TeamRole): boolean {
  return role === 'admin';
}

/**
 * Check if a role has access to creation tools
 * (App Builder, UI, Reports)
 * Admins and creators have access
 */
export function canAccessCreationTools(role: TeamRole): boolean {
  return role === 'admin' || role === 'creator';
}

/**
 * Check if a role has access to content tools
 * All roles have access to content tools
 */
export function canAccessContentTools(role: TeamRole): boolean {
  return true; // All roles: admin, creator, member
}

/**
 * Check if a role has access to team chat
 * All roles have access to team chat
 */
export function canAccessTeamChat(role: TeamRole): boolean {
  return true; // All roles: admin, creator, member
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: TeamRole): {
  canInvite: boolean;
  canViewEventLogs: boolean;
  canAccessAdminTools: boolean;
  canAccessCreationTools: boolean;
  canAccessContentTools: boolean;
  canAccessTeamChat: boolean;
} {
  return {
    canInvite: canInviteUsers(role),
    canViewEventLogs: canViewEventLogs(role),
    canAccessAdminTools: canAccessAdminTools(role),
    canAccessCreationTools: canAccessCreationTools(role),
    canAccessContentTools: canAccessContentTools(role),
    canAccessTeamChat: canAccessTeamChat(role),
  };
}

