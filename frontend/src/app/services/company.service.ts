import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface Company {
  companyId: string;
  name: string;
  description?: string;
  created: number;
  createdBy: string;
  members?: any[];
}

export interface CreateCompanyRequest {
  name: string;
  description?: string;
}

export interface CompanyResponse {
  success: boolean;
  message?: string;
  data: Company;
}

export interface CompaniesResponse {
  success: boolean;
  data: {
    companies: Company[];
  };
}

export interface InviteRequest {
  email: string;
  companyId: string;
  role?: 'member' | 'creator';
}

export interface CompanyMembersResponse {
  success: boolean;
  data: {
    companyId: string;
    companyName: string;
    members: Array<{
      uid?: string;
      email: string;
      firstName?: string;
      lastName?: string;
      role: 'member' | 'creator' | 'admin';
      status: 'invited' | 'accepted' | 'inactive' | 'removed';
      invitedBy?: string;
      startDate?: number;
      lastLogin?: number;
    }>;
  };
}

export interface InviteResponse {
  success: boolean;
  message?: string;
  data: {
    inviteId: string;
    email: string;
    companyId: string;
    status: string;
  };
}

export interface PendingInvitesResponse {
  success: boolean;
  data: {
    invites: Array<{
      inviteId: string;
      companyId: string;
      companyName: string;
      invitedBy: string;
      invitedAt: number;
    }>;
  };
}

@Injectable({
  providedIn: 'root'
})
export class CompanyService {
  private apiUrl = 'http://localhost:3000/api/companies';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  createCompany(companyData: CreateCompanyRequest): Observable<CompanyResponse> {
    return this.http.post<CompanyResponse>(`${this.apiUrl}`, companyData, {
      headers: this.getHeaders()
    });
  }

  getMyCompanies(): Observable<CompaniesResponse> {
    return this.http.get<CompaniesResponse>(`${this.apiUrl}/my-companies`, {
      headers: this.getHeaders()
    });
  }

  inviteUser(inviteData: InviteRequest): Observable<InviteResponse> {
    return this.http.post<InviteResponse>(`${this.apiUrl}/invite`, inviteData, {
      headers: this.getHeaders()
    });
  }

  acceptInvite(inviteId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/invite/${inviteId}/accept`, {}, {
      headers: this.getHeaders()
    });
  }

  getPendingInvites(): Observable<PendingInvitesResponse> {
    return this.http.get<PendingInvitesResponse>(`${this.apiUrl}/invites/pending`, {
      headers: this.getHeaders()
    });
  }

  getCompanyMembers(companyId: string): Observable<CompanyMembersResponse> {
    return this.http.get<CompanyMembersResponse>(`${this.apiUrl}/${companyId}/members`, {
      headers: this.getHeaders()
    });
  }

  addMemberManually(companyId: string, memberData: {
    email: string;
    role: 'member' | 'creator';
    firstName?: string;
    lastName?: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/${companyId}/members/manual`, memberData, {
      headers: this.getHeaders()
    });
  }

  deleteMember(companyId: string, email: string, uid?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${companyId}/members/delete`, { email, uid }, {
      headers: this.getHeaders()
    });
  }
}

