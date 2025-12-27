import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface User {
  uid: string;
  email: string;
  username?: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  role?: string;
  teams?: any[];
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data: {
    token: string;
    user: User;
  };
}

export interface SignupData {
  email: string;
  firstName: string;
  lastName: string;
  timeZone: string;
}

export interface VerifyCodeData {
  email: string;
  code: string;
}

export interface SignupResponse {
  success: boolean;
  message?: string;
  data?: {
    email: string;
    emailVerified: boolean;
  };
  error?: string;
  code?: string;
}

export interface VerifyCodeResponse {
  success: boolean;
  message?: string;
  data?: {
    email: string;
    emailVerified: boolean;
  };
  error?: string;
  code?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api/auth';
  private currentUserSubject = new BehaviorSubject<User | null>(null);

  constructor(private http: HttpClient) {
    this.loadUserFromStorage();
  }

  signup(data: SignupData): Observable<SignupResponse> {
    return this.http.post<SignupResponse>(`${this.apiUrl}/signup`, data);
  }

  verifyCode(data: VerifyCodeData): Observable<VerifyCodeResponse> {
    return this.http.post<VerifyCodeResponse>(`${this.apiUrl}/verify-code`, data);
  }

  resendVerificationCode(email: string): Observable<SignupResponse> {
    return this.http.post<SignupResponse>(`${this.apiUrl}/resend-verification`, { email });
  }

  forgotPassword(email: string): Observable<SignupResponse> {
    return this.http.post<SignupResponse>(`${this.apiUrl}/forgot-password`, { email });
  }

  resetPassword(email: string, code: string, newPassword: string): Observable<SignupResponse> {
    return this.http.post<SignupResponse>(`${this.apiUrl}/reset-password`, { email, code, newPassword });
  }

  login(data: LoginData): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, data).pipe(
      tap(response => {
        if (response.success) {
          this.setAuthData(response.data.token, response.data.user);
        }
      })
    );
  }

  getCurrentUser(): Observable<any> {
    const token = this.getToken();
    if (!token) {
      return new Observable(observer => {
        observer.next({ success: false });
        observer.complete();
      });
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get<any>(`${this.apiUrl}/me`, { headers }).pipe(
      tap(response => {
        if (response.success) {
          this.currentUserSubject.next(response.data);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  private setAuthData(token: string, user: User): void {
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  private loadUserFromStorage(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.currentUserSubject.next(user);
      } catch (e) {
        console.error('Error loading user from storage:', e);
      }
    }
  }
}

