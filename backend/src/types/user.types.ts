export interface User {
  uid: string;
  removed: boolean;
  pw: string; // hashed password
  created: number; // timestamp
  createdBy: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  timeZone: string;
  username?: string; // Added username field
  // Optional fields
  phone?: string;
  photoURL?: string;
  unsub?: string[];
  notify?: Notify;
  userFeature?: UserFeatures;
  optIn?: boolean;
  channels?: Channel[];
  badges?: string[];
  // Platform-level role (Super Admin only, separate from team roles)
  role?: UserRole;
  // Legacy fields - keeping for backward compatibility
  teams?: TeamMembership[];
  companies?: CompanyMembership[];
}

export interface Notify {
  [key: string]: boolean;
}

export interface UserFeatures {
  [key: string]: any;
}

export interface Channel {
  [key: string]: any;
}

// Legacy interfaces - keeping for backward compatibility
// Team roles are now managed via Creds sub-collection
export interface TeamMembership {
  teamId: string;
  role: string; // Team role from creds
  joinedAt: number;
}

export interface CompanyMembership {
  companyId: string;
  role: string; // Team role from creds
  joinedAt: number;
}

// User role can be:
// - Platform-level: 'Super Admin' (for platform admins)
// - Team roles: 'admin' | 'creator' | 'member' (for team/company roles)
// - null (for regular users without a team role)
export type UserRole = 'Super Admin' | 'admin' | 'creator' | 'member' | null;

// Team roles are also handled via Creds sub-collection (see creds.types.ts)
// Team roles: 'member' | 'creator' | 'admin' (3 roles only)

export interface SignupRequest {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  timeZone: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    uid: string;
    email: string;
    username?: string;
    firstName: string;
    lastName: string;
    emailVerified: boolean;
    role?: UserRole;
    teams?: TeamMembership[];
  };
}

export interface JWTPayload {
  uid: string;
  email: string;
  role?: UserRole;
}

