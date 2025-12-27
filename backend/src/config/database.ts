import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDatabase(): Promise<Db> {
  if (db) {
    return db;
  }

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.DB_NAME;

  if (!uri || !dbName) {
    throw new Error('MONGODB_URI and DB_NAME must be defined in environment variables');
  }

  try {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db(dbName);
    console.log('✅ Connected to MongoDB');
    
    // Ensure collections exist and have indexes
    await ensureUsersCollection();
    await ensureTeamsCollection();
    await ensureCompaniesCollection();
    await ensureInvitesCollection();
    await ensureCredsCollection();
    await ensureActionsCollection();
    await ensureVerificationCodesCollection();
    
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

async function ensureUsersCollection(): Promise<void> {
  if (!db) return;

  try {
    const usersCollection = db.collection('users');
    
    // Create indexes
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await usersCollection.createIndex({ uid: 1 }, { unique: true });
    await usersCollection.createIndex({ username: 1 }, { unique: true, sparse: true });
    await usersCollection.createIndex({ removed: 1 });
    
    console.log('✅ Users collection indexes created');
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
}

async function ensureTeamsCollection(): Promise<void> {
  if (!db) return;

  try {
    const teamsCollection = db.collection('teams');
    
    // Create indexes
    await teamsCollection.createIndex({ teamId: 1 }, { unique: true });
    await teamsCollection.createIndex({ createdBy: 1 });
    await teamsCollection.createIndex({ removed: 1 });
    
    console.log('✅ Teams collection indexes created');
  } catch (error) {
    console.error('Error creating team indexes:', error);
  }
}

async function ensureCompaniesCollection(): Promise<void> {
  if (!db) return;

  try {
    const companiesCollection = db.collection('companies');
    
    // Create indexes
    await companiesCollection.createIndex({ companyId: 1 }, { unique: true });
    await companiesCollection.createIndex({ createdBy: 1 });
    await companiesCollection.createIndex({ 'members.uid': 1 });
    await companiesCollection.createIndex({ removed: 1 });
    
    console.log('✅ Companies collection indexes created');
  } catch (error) {
    console.error('Error creating company indexes:', error);
  }
}

async function ensureInvitesCollection(): Promise<void> {
  if (!db) return;

  try {
    const invitesCollection = db.collection('invites');
    
    // Create indexes
    await invitesCollection.createIndex({ inviteId: 1 }, { unique: true });
    await invitesCollection.createIndex({ email: 1 });
    await invitesCollection.createIndex({ companyId: 1 });
    await invitesCollection.createIndex({ status: 1 });
    await invitesCollection.createIndex({ email: 1, status: 1 });
    
    console.log('✅ Invites collection indexes created');
  } catch (error) {
    console.error('Error creating invite indexes:', error);
  }
}

async function ensureCredsCollection(): Promise<void> {
  if (!db) return;

  try {
    const credsCollection = db.collection('creds');
    
    // Create indexes
    await credsCollection.createIndex({ uid: 1, companyId: 1 }, { unique: true });
    await credsCollection.createIndex({ uid: 1 });
    await credsCollection.createIndex({ companyId: 1 });
    await credsCollection.createIndex({ status: 1 });
    await credsCollection.createIndex({ role: 1 });
    
    console.log('✅ Creds collection indexes created');
  } catch (error) {
    console.error('Error creating creds indexes:', error);
  }
}

export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('MongoDB connection closed');
  }
}

async function ensureActionsCollection(): Promise<void> {
  if (!db) return;

  try {
    const actionsCollection = db.collection('actions');
    
    // Create indexes for better query performance
    await actionsCollection.createIndex({ created: -1 });
    await actionsCollection.createIndex({ uid: 1 });
    await actionsCollection.createIndex({ companyId: 1 });
    // Compound index for billing queries (companyId + created date range)
    await actionsCollection.createIndex({ companyId: 1, created: -1 });
    await actionsCollection.createIndex({ removed: 1 });
    
    console.log('✅ Actions collection indexes created');
  } catch (error) {
    console.error('Error creating actions indexes:', error);
  }
}

async function ensureVerificationCodesCollection(): Promise<void> {
  if (!db) return;

  try {
    const verificationCodesCollection = db.collection('verificationCodes');
    
    // Create indexes
    await verificationCodesCollection.createIndex({ email: 1 });
    await verificationCodesCollection.createIndex({ code: 1 });
    await verificationCodesCollection.createIndex({ email: 1, code: 1 });
    await verificationCodesCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
    await verificationCodesCollection.createIndex({ verified: 1 });
    
    console.log('✅ VerificationCodes collection indexes created');
  } catch (error) {
    console.error('Error creating verificationCodes indexes:', error);
  }
}

export function getDatabase(): Db {
  if (!db) {
    throw new Error('Database not connected. Call connectDatabase() first.');
  }
  return db;
}

