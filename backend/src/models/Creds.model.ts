import { Collection } from 'mongodb';
import { getDatabase } from '../config/database';
import { Creds, TeamRole } from '../types/creds.types';

export class CredsModel {
  private collection: Collection<Creds>;

  constructor(uid: string) {
    // Creds is a sub-collection under users: users/{uid}/creds
    // In MongoDB, we'll store it as a separate collection with uid as part of the document
    this.collection = getDatabase().collection<Creds>(`users_${uid}_creds`);
  }

  // Alternative: Store all creds in a single collection with uid and companyId as compound key
  static getCredsCollection() {
    return getDatabase().collection<Creds>('creds');
  }

  async createCreds(uid: string, companyId: string, data: Partial<Creds>): Promise<Creds> {
    const now = Date.now();
    
    // Validate role - only 3 roles allowed (admin, member, creator)
    const validRoles: Array<'admin' | 'member' | 'creator'> = ['admin', 'member', 'creator'];
    const role = (data.role && validRoles.includes(data.role)) ? data.role : 'member';
    
    const creds: Creds = {
      companyId,
      id: companyId, // Same as companyId (as per client spec)
      uid,
      status: data.status || 'accepted',
      invitedBy: data.invitedBy,
      startDate: now,
      lastLogin: undefined, // Will be updated on first login
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      storeName: data.storeName,
      role,
      storeNum: data.storeNum,
      notify: data.notify,
      active: data.active !== undefined ? data.active : true,
      enabled: data.enabled || {},
      ...data, // Allow additional fields from client spec
    };

    const collection = CredsModel.getCredsCollection();
    const result = await collection.insertOne(creds);
    
    if (!result.insertedId) {
      throw new Error('Failed to create creds');
    }

    return creds;
  }

  async findByCompanyId(uid: string, companyId: string): Promise<Creds | null> {
    const collection = CredsModel.getCredsCollection();
    return await collection.findOne({ 
      uid,
      companyId,
      status: { $ne: 'removed' }
    });
  }

  async findByUid(uid: string): Promise<Creds[]> {
    const collection = CredsModel.getCredsCollection();
    return await collection
      .find({ 
        uid,
        status: { $ne: 'removed' }
      })
      .toArray();
  }

  async updateRole(uid: string, companyId: string, role: TeamRole): Promise<boolean> {
    const collection = CredsModel.getCredsCollection();
    const result = await collection.updateOne(
      { uid, companyId },
      { $set: { role } }
    );
    return result.modifiedCount > 0;
  }

  async updateStatus(uid: string, companyId: string, status: Creds['status']): Promise<boolean> {
    const collection = CredsModel.getCredsCollection();
    const result = await collection.updateOne(
      { uid, companyId },
      { $set: { status } }
    );
    return result.modifiedCount > 0;
  }

  async updateLastLogin(uid: string, companyId: string): Promise<boolean> {
    const collection = CredsModel.getCredsCollection();
    const result = await collection.updateOne(
      { uid, companyId },
      { $set: { lastLogin: Date.now() } }
    );
    return result.modifiedCount > 0;
  }

  async removeCreds(uid: string, companyId: string): Promise<boolean> {
    const collection = CredsModel.getCredsCollection();
    const result = await collection.updateOne(
      { uid, companyId },
      { $set: { status: 'removed', active: false } }
    );
    return result.modifiedCount > 0;
  }

  /**
   * Get user's creds for a specific company
   * Useful for permission checks
   */
  static async getUserCredsForCompany(uid: string, companyId: string): Promise<Creds | null> {
    const collection = CredsModel.getCredsCollection();
    return await collection.findOne({
      uid,
      companyId,
      status: { $ne: 'removed' },
      active: true,
    });
  }

  /**
   * Get all active companies for a user
   */
  static async getUserCompanies(uid: string): Promise<Creds[]> {
    const collection = CredsModel.getCredsCollection();
    return await collection
      .find({
        uid,
        status: 'accepted',
        active: true,
      })
      .toArray();
  }
}

