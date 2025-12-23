import { TeamRole } from './user.types';

export interface Team {
  teamId: string;
  name: string;
  description?: string;
  created: number; // timestamp
  createdBy: string; // user uid
  removed: boolean;
  members?: TeamMember[];
}

export interface TeamMember {
  uid: string;
  email: string;
  username?: string;
  firstName: string;
  lastName: string;
  role: TeamRole;
  joinedAt: number;
}

export interface CreateTeamRequest {
  name: string;
  description?: string;
}

export interface TeamResponse {
  teamId: string;
  name: string;
  description?: string;
  created: number;
  createdBy: string;
  members?: TeamMember[];
}

