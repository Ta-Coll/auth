import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface Team {
  teamId: string;
  name: string;
  description?: string;
  created: number;
  createdBy: string;
  members?: any[];
}

export interface CreateTeamRequest {
  name: string;
  description?: string;
}

export interface TeamResponse {
  success: boolean;
  message?: string;
  data: Team;
}

export interface TeamsResponse {
  success: boolean;
  data: {
    teams: Team[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class TeamService {
  private apiUrl = 'http://localhost:3000/api/teams';

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

  createTeam(teamData: CreateTeamRequest): Observable<TeamResponse> {
    return this.http.post<TeamResponse>(`${this.apiUrl}`, teamData, {
      headers: this.getHeaders()
    });
  }

  getMyTeams(): Observable<TeamsResponse> {
    return this.http.get<TeamsResponse>(`${this.apiUrl}/my-teams`, {
      headers: this.getHeaders()
    });
  }
}

