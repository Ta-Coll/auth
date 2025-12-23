import { Collection } from 'mongodb';
import { User, SignupRequest, UserRole } from '../types/user.types';
import { getDatabase } from '../config/database';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export class UserModel {
  private collection: Collection<User>;

  constructor() {
    this.collection = getDatabase().collection<User>('users');
  }

  async createUser(data: SignupRequest, createdBy?: string): Promise<User> {
    // Check if email already exists
    const existingEmail = await this.collection.findOne({ email: data.email.toLowerCase().trim() });
    if (existingEmail) {
      throw new Error('Email already in use');
    }

    // Check if username already exists
    const existingUsername = await this.collection.findOne({ username: data.username.toLowerCase().trim() });
    if (existingUsername) {
      throw new Error('Username already in use');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create user document
    const now = Date.now();
    const uid = uuidv4();

    const user: User = {
      uid,
      removed: false,
      pw: hashedPassword,
      created: now,
      createdBy: createdBy || uid, // Self-created if no createdBy provided
      email: data.email.toLowerCase().trim(),
      emailVerified: false,
      firstName: data.firstName,
      lastName: data.lastName,
      timeZone: data.timeZone,
      username: data.username.toLowerCase().trim(),
      role: 'registered', // Default to registered after signup
    };

    const result = await this.collection.insertOne(user);
    
    if (!result.insertedId) {
      throw new Error('Failed to create user');
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.collection.findOne({ 
      email: email.toLowerCase().trim(),
      removed: false 
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return await this.collection.findOne({ 
      username: username.toLowerCase().trim(),
      removed: false 
    });
  }

  async findByUid(uid: string): Promise<User | null> {
    return await this.collection.findOne({ 
      uid,
      removed: false 
    });
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    return await bcrypt.compare(password, user.pw);
  }

  async updateEmailVerified(uid: string, verified: boolean): Promise<boolean> {
    const result = await this.collection.updateOne(
      { uid },
      { $set: { emailVerified: verified } }
    );
    return result.modifiedCount > 0;
  }

  async updateRole(uid: string, role: UserRole): Promise<boolean> {
    const result = await this.collection.updateOne(
      { uid },
      { $set: { role } }
    );
    return result.modifiedCount > 0;
  }

  async addTeamMembership(uid: string, teamId: string, role: 'Member' | 'Creator' | 'Admin'): Promise<boolean> {
    const membership = {
      teamId,
      role,
      joinedAt: Date.now(),
    };

    const result = await this.collection.updateOne(
      { uid },
      { 
        $addToSet: { teams: membership },
        $set: { role: 'registered' } // Ensure user is registered when joining team
      }
    );
    return result.modifiedCount > 0;
  }

  async getUserWithoutPassword(user: User): Promise<Omit<User, 'pw'>> {
    const { pw, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}

