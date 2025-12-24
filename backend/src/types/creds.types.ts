import { Notify } from './user.types';

export interface Enabled {
  [key: string]: boolean;
}

/**
 * Creds interface - One document per user-company relationship
 * Stored as a sub-collection under users, with companyId as the id
 * 
 * Role Permissions:
 * - admin: Full permissions (invite, event log viewer, team admin tools, database scaling, security, AI account management, Policy Manager, team chat, etc.)
 * - creator: Access to creation tools (App Builder, UI, Reports, Chat)
 * - member: Access only to content tools and team chat
 */
/**
 * Creds interface - One document per user-company relationship
 * Stored in MongoDB 'creds' collection with companyId as the id
 * Each invited member has information about the company
 */
export interface Creds {
  [key: string]: any;
  companyId?: string; // Company/team ID (used as id)
  id?: string; // Same as companyId
  uid?: string; // User ID (optional for invited users who haven't registered yet)
  status?: 'invited' | 'accepted' | 'inactive' | 'removed';
  invitedBy?: string; // UID of the inviter
  startDate?: number; // Created timestamp in milliseconds
  lastLogin?: number; // Last login timestamp in milliseconds
  email?: string; // User email
  firstName?: string; // User first name
  lastName?: string; // User last name
  storeName?: string; // Store/company name (optional)
  role: 'admin' | 'member' | 'creator'; // Team role (3 roles only)
  storeNum?: string; // Store number (optional)
  notify?: Notify; // Notification preferences
  active?: boolean; // Whether the user is active in this company
  enabled?: Enabled; // Feature flags/enabled settings
}

export type TeamRole = 'member' | 'creator' | 'admin'; // Only 3 team roles

/**
 * Role Permissions Summary:
 * 
 * admin:
 *   - Invite users
 *   - Event Log viewer
 *   - Team Admin tools (database scaling, security, AI account management, Policy Manager)
 *   - All creation tools (App Builder, UI, Reports)
 *   - Team chat
 *   - Content tools
 * 
 * creator:
 *   - App Builder
 *   - UI tools
 *   - Reports
 *   - Team chat
 *   - Content tools
 * 
 * member:
 *   - Content tools
 *   - Team chat
 */

