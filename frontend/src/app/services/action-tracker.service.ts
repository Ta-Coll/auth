import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Action, ActionResponse, ActionsResponse, BillingSummaryResponse } from '../models/action.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ActionTrackerService {
  private apiUrl = 'http://localhost:3000/api/actions';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Save a new action
  saveAction(action: Action): Observable<ActionResponse> {
    return this.http.post<ActionResponse>(this.apiUrl, action, {
      headers: this.getHeaders()
    });
  }

  // Get all actions with optional filters
  getActions(params?: {
    page?: number;
    limit?: number;
    uid?: string;
    companyId?: string;
    type?: string;
    collection?: string;
    removed?: boolean;
    since?: number; // Timestamp for real-time updates
    fromDate?: number; // Start date for date range filtering (Unix timestamp)
    toDate?: number; // End date for date range filtering (Unix timestamp)
    aggregate?: boolean; // Use aggregation pipeline
    groupBy?: string; // Field to group by (e.g., 'companyId')
    sum?: string; // Field to sum (e.g., 'count')
  }): Observable<ActionsResponse | BillingSummaryResponse> {
    let httpParams = new HttpParams();
    
    if (params) {
      if (params.page) httpParams = httpParams.set('page', params.page.toString());
      if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
      if (params.uid) httpParams = httpParams.set('uid', params.uid);
      if (params.companyId) httpParams = httpParams.set('companyId', params.companyId);
      if (params.type) httpParams = httpParams.set('type', params.type);
      if (params.collection) httpParams = httpParams.set('collection', params.collection);
      if (params.removed !== undefined) httpParams = httpParams.set('removed', params.removed.toString());
      if (params.fromDate) httpParams = httpParams.set('fromDate', params.fromDate.toString());
      if (params.toDate) httpParams = httpParams.set('toDate', params.toDate.toString());
      if (params.aggregate) httpParams = httpParams.set('aggregate', 'true');
      if (params.groupBy) httpParams = httpParams.set('groupBy', params.groupBy);
      if (params.sum) httpParams = httpParams.set('sum', params.sum);
      if (params.since && !params.fromDate && !params.toDate && !params.aggregate) {
        // Only use 'since' if date range and aggregation are not specified
        httpParams = httpParams.set('since', params.since.toString());
      }
    }

    return this.http.get<ActionsResponse | BillingSummaryResponse>(this.apiUrl, {
      params: httpParams,
      headers: this.getHeaders()
    });
  }

  // Get action by ID
  getActionById(id: string): Observable<ActionResponse> {
    return this.http.get<ActionResponse>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders()
    });
  }

  // Update action
  updateAction(id: string, action: Partial<Action>): Observable<ActionResponse> {
    return this.http.put<ActionResponse>(`${this.apiUrl}/${id}`, action, {
      headers: this.getHeaders()
    });
  }

  // Delete action (hard delete)
  deleteAction(id: string): Observable<ActionResponse> {
    return this.http.delete<ActionResponse>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders()
    });
  }

  // Delete all actions (hard delete)
  deleteAllActions(): Observable<{ success: boolean; message: string; deletedCount: number }> {
    return this.http.delete<{ success: boolean; message: string; deletedCount: number }>(this.apiUrl, {
      headers: this.getHeaders()
    });
  }

  // Get distinct company IDs
  getCompanyIds(): Observable<{ success: boolean; data: string[] }> {
    return this.http.get<{ success: boolean; data: string[] }>(`${this.apiUrl}/companies`, {
      headers: this.getHeaders()
    });
  }

  // Get distinct collections
  getCollections(): Observable<{ success: boolean; data: string[] }> {
    return this.http.get<{ success: boolean; data: string[] }>(`${this.apiUrl}/collections`, {
      headers: this.getHeaders()
    });
  }
}

