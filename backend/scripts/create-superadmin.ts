import dotenv from 'dotenv';
import path from 'path';
import { existsSync } from 'fs';

// Load .env file - try current directory first, then backend directory
const envPath = path.resolve(process.cwd(), '.env');
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  // Try backend directory (when running from project root)
  const backendEnvPath = path.resolve(process.cwd(), 'backend', '.env');
  if (existsSync(backendEnvPath)) {
    dotenv.config({ path: backendEnvPath });
  } else {
    // Just try default dotenv.config() which looks in current directory
    dotenv.config();
  }
}

// Check if required env vars are set
if (!process.env.MONGODB_URI || !process.env.DB_NAME) {
  console.error('❌ Error: MONGODB_URI and DB_NAME must be defined in environment variables');
  console.error('\nPlease create a .env file in the backend directory with:');
  console.error('MONGODB_URI=mongodb+srv://...');
  console.error('DB_NAME=napkinevents');
  console.error('\nOr set them as environment variables before running the script.');
  process.exit(1);
}

import { connectDatabase, closeDatabase } from '../src/config/database';
import { UserModel } from '../src/models/User.model';
import { User } from '../src/types/user.types';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { getDatabase } from '../src/config/database';

async function createSuperAdmin(): Promise<void> {
  try {
    // Connect to database
    await connectDatabase();
    const db = getDatabase();
    const usersCollection = db.collection<User>('users');

    // Super admin credentials (you can change these)
    const superAdminEmail = process.env.SUPERADMIN_EMAIL || 'admin@napkin.com';
    const superAdminPassword = process.env.SUPERADMIN_PASSWORD || 'Admin123!';
    const superAdminUsername = process.env.SUPERADMIN_USERNAME || 'superadmin';
    const superAdminFirstName = process.env.SUPERADMIN_FIRSTNAME || 'Super';
    const superAdminLastName = process.env.SUPERADMIN_LASTNAME || 'Admin';

    // Check if super admin already exists
    const existingAdmin = await usersCollection.findOne({ 
      $or: [
        { email: superAdminEmail.toLowerCase() },
        { username: superAdminUsername.toLowerCase() },
        { role: 'superadmin' }
      ]
    });

    if (existingAdmin) {
      console.log('⚠️  Super admin already exists!');
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Username: ${existingAdmin.username}`);
      console.log(`   Role: ${existingAdmin.role}`);
      await closeDatabase();
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(superAdminPassword, 10);
    const now = Date.now();
    const uid = uuidv4();

    // Create super admin user
    const superAdmin: User = {
      uid,
      removed: false,
      pw: hashedPassword,
      created: now,
      createdBy: uid,
      email: superAdminEmail.toLowerCase(),
      emailVerified: true,
      firstName: superAdminFirstName,
      lastName: superAdminLastName,
      timeZone: 'America/New_York',
      username: superAdminUsername.toLowerCase(),
      role: 'superadmin',
    };

    const result = await usersCollection.insertOne(superAdmin);

    if (result.insertedId) {
      console.log('✅ Super admin created successfully!');
      console.log(`   UID: ${uid}`);
      console.log(`   Email: ${superAdminEmail}`);
      console.log(`   Username: ${superAdminUsername}`);
      console.log(`   Password: ${superAdminPassword}`);
      console.log(`   Role: superadmin`);
      console.log('\n⚠️  Please change the password after first login!');
    } else {
      throw new Error('Failed to create super admin');
    }

    await closeDatabase();
  } catch (error) {
    console.error('❌ Error creating super admin:', error);
    await closeDatabase();
    process.exit(1);
  }
}

createSuperAdmin();

