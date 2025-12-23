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
  // Role management
  role?: UserRole;
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

export interface TeamMembership {
  teamId: string;
  role: TeamRole;
  joinedAt: number;
}

export interface CompanyMembership {
  companyId: string;
  role: CompanyRole;
  joinedAt: number;
}

export type UserRole = 'Member' | 'Creator' | 'Super Admin';
export type TeamRole = 'Member' | 'Creator' | 'Admin';
export type CompanyRole = 'Member' | 'Creator' | 'Admin';

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

