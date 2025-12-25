import { Collection } from 'mongodb';
import { getDatabase } from '../config/database';
import { Invite } from '../types/company.types';
import { v4 as uuidv4 } from 'uuid';

export class InviteModel {
  private collection: Collection<Invite>;

  constructor() {
    this.collection = getDatabase().collection<Invite>('invites');
  }

  async createInvite(companyId: string, email: string, invitedBy: string, role?: Invite['role']): Promise<Invite> {
    const now = Date.now();
    const inviteId = uuidv4();

    const invite: Invite = {
      inviteId,
      companyId,
      email: email.toLowerCase().trim(),
      invitedBy,
      invitedAt: now,
      status: 'pending',
      role: role || 'member', // Default to 'member' if not specified
    };

    const result = await this.collection.insertOne(invite);
    
    if (!result.insertedId) {
      throw new Error('Failed to create invite');
    }

    return invite;
  }

  async findByInviteId(inviteId: string): Promise<Invite | null> {
    return await this.collection.findOne({ inviteId });
  }

  async findByEmail(email: string): Promise<Invite[]> {
    return await this.collection
      .find({ email: email.toLowerCase().trim() })
      .toArray();
  }

  async findByCompany(companyId: string): Promise<Invite[]> {
    return await this.collection
      .find({ companyId })
      .toArray();
  }

  async findByCompanyId(companyId: string): Promise<Invite[]> {
    return await this.collection
      .find({ companyId })
      .toArray();
  }

  async findPendingByEmail(email: string): Promise<Invite[]> {
    return await this.collection
      .find({ 
        email: email.toLowerCase().trim(),
        status: 'pending'
      })
      .toArray();
  }

  async acceptInvite(inviteId: string): Promise<boolean> {
    const result = await this.collection.updateOne(
      { inviteId },
      { 
        $set: { 
          status: 'accepted',
          acceptedAt: Date.now()
        } 
      }
    );
    return result.modifiedCount > 0;
  }

  async declineInvite(inviteId: string): Promise<boolean> {
    const result = await this.collection.updateOne(
      { inviteId },
      { $set: { status: 'declined' } }
    );
    return result.modifiedCount > 0;
  }

  async deleteInvite(inviteId: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ inviteId });
    return result.deletedCount > 0;
  }

  async updateInviteRole(companyId: string, email: string, role: Invite['role']): Promise<boolean> {
    const result = await this.collection.updateOne(
      { companyId, email: email.toLowerCase().trim(), status: 'pending' },
      { $set: { role } }
    );
    return result.modifiedCount > 0;
  }
}

