import { Collection } from 'mongodb';
import { getDatabase } from '../config/database';
import { Company, CreateCompanyRequest, CompanyMember } from '../types/company.types';
import { v4 as uuidv4 } from 'uuid';

export class CompanyModel {
  private collection: Collection<Company>;

  constructor() {
    this.collection = getDatabase().collection<Company>('companies');
  }

  async createCompany(data: CreateCompanyRequest, createdBy: string): Promise<Company> {
    const now = Date.now();
    const companyId = uuidv4();

    const company: Company = {
      companyId,
      name: data.name.trim(),
      description: data.description?.trim(),
      created: now,
      createdBy,
      removed: false,
      members: [],
    };

    const result = await this.collection.insertOne(company);
    
    if (!result.insertedId) {
      throw new Error('Failed to create company');
    }

    return company;
  }

  async findByCompanyId(companyId: string): Promise<Company | null> {
    return await this.collection.findOne({ 
      companyId,
      removed: false 
    });
  }

  async findByCreator(createdBy: string): Promise<Company[]> {
    return await this.collection
      .find({ createdBy, removed: false })
      .toArray();
  }

  async findByMember(uid: string): Promise<Company[]> {
    return await this.collection
      .find({ 
        'members.uid': uid,
        removed: false 
      })
      .toArray();
  }

  async addMember(companyId: string, member: CompanyMember): Promise<boolean> {
    const result = await this.collection.updateOne(
      { companyId },
      { $addToSet: { members: member } }
    );
    return result.modifiedCount > 0;
  }

  async removeMember(companyId: string, uid: string): Promise<boolean> {
    const result = await this.collection.updateOne(
      { companyId },
      { $pull: { members: { uid } } }
    );
    return result.modifiedCount > 0;
  }

  async updateMemberRole(companyId: string, uid: string, role: CompanyMember['role']): Promise<boolean> {
    const result = await this.collection.updateOne(
      { companyId, 'members.uid': uid },
      { $set: { 'members.$.role': role } }
    );
    return result.modifiedCount > 0;
  }

  async deleteCompany(companyId: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ companyId });
    return result.deletedCount > 0;
  }
}

