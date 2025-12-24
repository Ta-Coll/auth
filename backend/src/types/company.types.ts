export interface Company {
  companyId: string;
  name: string;
  description?: string;
  created: number; // timestamp
  createdBy: string; // user uid who created the company
  removed: boolean;
  members?: CompanyMember[];
}

export interface CompanyMember {
  uid: string;
  email: string;
  username?: string;
  firstName: string;
  lastName: string;
  role: CompanyRole; // 'member' | 'creator' | 'admin' (3 roles only)
  joinedAt: number;
}

// Team roles for company membership (3 roles only)
export type CompanyRole = 'member' | 'creator' | 'admin';

export interface CreateCompanyRequest {
  name: string;
  description?: string;
}

export interface CompanyResponse {
  companyId: string;
  name: string;
  description?: string;
  created: number;
  createdBy: string;
  members?: CompanyMember[];
}

export interface InviteRequest {
  email: string;
  companyId: string;
  role?: 'member' | 'creator'; // Team role to assign (only member or creator, admin cannot be invited)
}

export interface Invite {
  inviteId: string;
  companyId: string;
  email: string;
  invitedBy: string; // user uid
  invitedAt: number;
  status: 'pending' | 'accepted' | 'declined';
  acceptedAt?: number;
  role?: 'member' | 'creator' | 'admin'; // Team role to assign (3 roles only)
}

