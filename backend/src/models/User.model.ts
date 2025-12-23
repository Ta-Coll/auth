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

    // Explicitly set default role to 'Member' - this is the ONLY valid default role
    const defaultRole: UserRole = 'Member';

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
      role: defaultRole, // ALWAYS set to 'Member' for new signups
    };

    // Force role to be 'Member' - double check
    if (user.role !== 'Member') {
      user.role = 'Member';
      console.warn('⚠️ Role was not Member, forcing it to Member');
    }

    // Log before insert to verify role
    console.log('📝 Creating user - Role before insert:', user.role);
    console.log('📝 User object role field:', user.role);
    
    // CRITICAL: Ensure role is explicitly 'Member' before insert
    user.role = 'Member';
    
    const result = await this.collection.insertOne(user);
    
    if (!result.insertedId) {
      throw new Error('Failed to create user');
    }

    // Immediately update the role in database to ensure it's 'Member'
    // This is a safety measure in case something went wrong
    const updateResult = await this.collection.updateOne(
      { uid: user.uid },
      { $set: { role: 'Member' } }
    );
    
    console.log('✅ User inserted and role explicitly set to Member in database');
    console.log('📋 Update result:', updateResult.modifiedCount > 0 ? 'Role updated' : 'Role already correct');

    // Verify the inserted document from database
    const insertedUser = await this.collection.findOne({ uid: user.uid });
    if (insertedUser) {
      console.log('📋 Final user role from DB:', insertedUser.role);
      if (insertedUser.role !== 'Member') {
        console.error('⚠️ CRITICAL ERROR: Database still has wrong role! Expected Member, got:', insertedUser.role);
        throw new Error(`Database role mismatch: Expected 'Member', got '${insertedUser.role}'`);
      }
    }
    
    // Ensure returned user has correct role
    user.role = 'Member';

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
        $set: { role: 'Member' } // Ensure user is Member when joining team
      }
    );
    return result.modifiedCount > 0;
  }

  async addCompanyMembership(uid: string, companyId: string, role: 'Member' | 'Creator' | 'Admin'): Promise<boolean> {
    const membership = {
      companyId,
      role,
      joinedAt: Date.now(),
    };

    const result = await this.collection.updateOne(
      { uid },
      { 
        $addToSet: { companies: membership }
      }
    );
    return result.modifiedCount > 0;
  }

  async getUserWithoutPassword(user: User): Promise<Omit<User, 'pw'>> {
    const { pw, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}

