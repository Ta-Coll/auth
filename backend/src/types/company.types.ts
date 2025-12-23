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
  role: CompanyRole;
  joinedAt: number;
}

export type CompanyRole = 'Member' | 'Creator' | 'Admin';

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
}

export interface Invite {
  inviteId: string;
  companyId: string;
  email: string;
  invitedBy: string; // user uid
  invitedAt: number;
  status: 'pending' | 'accepted' | 'declined';
  acceptedAt?: number;
}

