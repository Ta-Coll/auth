import { Collection } from 'mongodb';
import { getDatabase } from '../config/database';
import { Action, CreateActionRequest } from '../types/action.types';

export class ActionModel {
  private collection: Collection<Action>;

  constructor() {
    this.collection = getDatabase().collection<Action>('actions');
  }

  async createAction(data: CreateActionRequest): Promise<Action> {
    const now = Date.now();
    
    const action: Action = {
      type: data.type,
      collection: data.collection,
      readType: data.readType || 'docChange',
      uid: data.uid,
      companyId: data.companyId,
      count: data.count || 0,
      host: data.host,
      id: data.id,
      created: data.created || now,
      removed: data.removed || false,
    };

    const result = await this.collection.insertOne(action);
    
    if (!result.insertedId) {
      throw new Error('Failed to create action');
    }

    // MongoDB returns _id as ObjectId, convert to string for response
    return {
      ...action,
      _id: result.insertedId.toString()
    };
  }

  async findById(_id: string): Promise<Action | null> {
    const { ObjectId } = await import('mongodb');
    try {
      const action = await this.collection.findOne({ _id: new ObjectId(_id) });
      if (!action) return null;
      // Convert MongoDB _id (ObjectId) to string
      return {
        ...action,
        _id: action._id?.toString() || undefined
      };
    } catch (error) {
      // If _id is not a valid ObjectId, return null
      return null;
    }
  }

  async findMany(query: any, options?: {
    page?: number;
    limit?: number;
    sort?: any;
  }): Promise<{ actions: Action[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;
    const sort = options?.sort || { created: -1 };

    const actions = await this.collection
      .find(query)
      .sort(sort)
      .limit(limit)
      .skip(skip)
      .toArray();

    // Convert MongoDB _id (ObjectId) to string
    const actionsWithStringId = actions.map(action => ({
      ...action,
      _id: action._id?.toString() || undefined
    }));

    const total = await this.collection.countDocuments(query);

    return { actions: actionsWithStringId, total };
  }

  async updateAction(_id: string, updates: Partial<Action>): Promise<boolean> {
    const { ObjectId } = await import('mongodb');
    try {
      const result = await this.collection.updateOne(
        { _id: new ObjectId(_id) },
        { $set: updates }
      );
      return result.modifiedCount > 0;
    } catch (error) {
      return false;
    }
  }

  async deleteAction(_id: string): Promise<boolean> {
    const { ObjectId } = await import('mongodb');
    try {
      const result = await this.collection.deleteOne({ _id: new ObjectId(_id) });
      return result.deletedCount > 0;
    } catch (error) {
      return false;
    }
  }

  async deleteAll(): Promise<number> {
    const result = await this.collection.deleteMany({});
    return result.deletedCount;
  }

  async distinct(field: string, query?: any): Promise<string[]> {
    return await this.collection.distinct(field, query || {});
  }

  async aggregate(pipeline: any[]): Promise<any[]> {
    return await this.collection.aggregate(pipeline).toArray();
  }
}

