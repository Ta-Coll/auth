import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface User {
  uid: string;
  email: string;
  username?: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  role?: string;
  teams?: any[];
  created?: number;
  timeZone?: string;
}

export interface UsersResponse {
  success: boolean;
  data: {
    users: User[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = 'http://localhost:3000/api/admin';

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

  getUsers(page: number = 1, limit: number = 20): Observable<UsersResponse> {
    return this.http.get<UsersResponse>(`${this.apiUrl}/users?page=${page}&limit=${limit}`, {
      headers: this.getHeaders()
    });
  }

  updateUserRole(uid: string, role: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/users/${uid}/role`, { role }, {
      headers: this.getHeaders()
    });
  }
}

