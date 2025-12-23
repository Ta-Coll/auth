import { Collection } from 'mongodb';
import { getDatabase } from '../config/database';
import { Team, CreateTeamRequest, TeamMember } from '../types/team.types';
import { v4 as uuidv4 } from 'uuid';

export class TeamModel {
  private collection: Collection<Team>;

  constructor() {
    this.collection = getDatabase().collection<Team>('teams');
  }

  async createTeam(data: CreateTeamRequest, createdBy: string): Promise<Team> {
    const now = Date.now();
    const teamId = uuidv4();

    const team: Team = {
      teamId,
      name: data.name.trim(),
      description: data.description?.trim(),
      created: now,
      createdBy,
      removed: false,
      members: [],
    };

    const result = await this.collection.insertOne(team);
    
    if (!result.insertedId) {
      throw new Error('Failed to create team');
    }

    return team;
  }

  async findByTeamId(teamId: string): Promise<Team | null> {
    return await this.collection.findOne({ 
      teamId,
      removed: false 
    });
  }

  async findByCreator(createdBy: string): Promise<Team[]> {
    return await this.collection
      .find({ createdBy, removed: false })
      .toArray();
  }

  async addMember(teamId: string, member: TeamMember): Promise<boolean> {
    const result = await this.collection.updateOne(
      { teamId },
      { $addToSet: { members: member } }
    );
    return result.modifiedCount > 0;
  }

  async removeMember(teamId: string, uid: string): Promise<boolean> {
    const result = await this.collection.updateOne(
      { teamId },
      { $pull: { members: { uid } } }
    );
    return result.modifiedCount > 0;
  }

  async deleteTeam(teamId: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ teamId });
    return result.deletedCount > 0;
  }
}

