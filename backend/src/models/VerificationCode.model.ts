import { Collection } from 'mongodb';
import { getDatabase } from '../config/database';
import { VerificationCode } from '../types/verification.types';

export class VerificationCodeModel {
  private collection: Collection<VerificationCode>;

  constructor() {
    this.collection = getDatabase().collection<VerificationCode>('verificationCodes');
  }

  async createVerificationCode(email: string, code: string, plainPassword: string, hashedPassword: string): Promise<VerificationCode> {
    const now = Date.now();
    const expiresAt = now + (10 * 60 * 1000); // 10 minutes from now

    // Delete any existing verification codes for this email
    await this.collection.deleteMany({ email: email.toLowerCase().trim() });

    const verificationCode: VerificationCode = {
      email: email.toLowerCase().trim(),
      code,
      password: plainPassword, // Store plain password for email
      hashedPassword, // Store hashed password for user update
      createdAt: now,
      expiresAt,
      verified: false,
    };

    const result = await this.collection.insertOne(verificationCode);
    
    if (!result.insertedId) {
      throw new Error('Failed to create verification code');
    }

    return verificationCode;
  }

  async findByEmailAndCode(email: string, code: string): Promise<VerificationCode | null> {
    const now = Date.now();
    
    return await this.collection.findOne({
      email: email.toLowerCase().trim(),
      code,
      expiresAt: { $gt: now }, // Not expired
      verified: false, // Not yet verified
    });
  }

  async markAsVerified(email: string, code: string): Promise<boolean> {
    const result = await this.collection.updateOne(
      { email: email.toLowerCase().trim(), code },
      { $set: { verified: true } }
    );
    return result.modifiedCount > 0;
  }

  async deleteExpiredCodes(): Promise<number> {
    const now = Date.now();
    const result = await this.collection.deleteMany({
      expiresAt: { $lt: now }
    });
    return result.deletedCount;
  }

  async createPasswordResetCode(email: string, code: string): Promise<VerificationCode> {
    const now = Date.now();
    const expiresAt = now + (30 * 60 * 1000); // 30 minutes from now

    // Delete any existing password reset codes for this email
    await this.collection.deleteMany({ 
      email: email.toLowerCase().trim(),
      type: 'password-reset'
    });

    const resetCode: VerificationCode = {
      email: email.toLowerCase().trim(),
      code,
      password: '', // Not used for password reset
      hashedPassword: '', // Not used for password reset
      createdAt: now,
      expiresAt,
      verified: false,
      type: 'password-reset', // Mark as password reset code
    } as VerificationCode & { type: string };

    const result = await this.collection.insertOne(resetCode as any);
    
    if (!result.insertedId) {
      throw new Error('Failed to create password reset code');
    }

    return resetCode;
  }

  async findByEmailAndCodeForReset(email: string, code: string): Promise<VerificationCode | null> {
    const now = Date.now();
    
    return await this.collection.findOne({
      email: email.toLowerCase().trim(),
      code,
      expiresAt: { $gt: now }, // Not expired
      verified: false, // Not yet verified
      type: 'password-reset', // Must be password reset code
    } as any);
  }
}

