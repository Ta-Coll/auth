import 'dotenv/config';
import { connectDatabase, closeDatabase, getDatabase } from '../src/config/database';
import { User } from '../src/types/user.types';

async function checkSuperAdmin(): Promise<void> {
  try {
    await connectDatabase();
    const db = getDatabase();
    const usersCollection = db.collection<User>('users');

    // Find all users with Super Admin role (checking for variations)
    const superAdmins = await usersCollection.find({
      $or: [
        { role: 'Super Admin' },
        { role: 'superadmin' },
        { role: 'SuperAdmin' },
        { role: 'SUPER_ADMIN' },
        { email: 'admin@napkin.com' } // Check by email too
      ]
    }).toArray();

    console.log('\n📊 Super Admin Users Found:');
    console.log('='.repeat(60));
    
    if (superAdmins.length === 0) {
      console.log('❌ No Super Admin users found!');
    } else {
      superAdmins.forEach((user, index) => {
        console.log(`\n${index + 1}. User Details:`);
        console.log(`   UID: ${user.uid}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Role: "${user.role}" (type: ${typeof user.role})`);
        console.log(`   Role JSON: ${JSON.stringify(user.role)}`);
        console.log(`   Email Verified: ${user.emailVerified}`);
        console.log(`   Removed: ${user.removed}`);
      });
    }

    // Check for admin@napkin.com specifically
    const adminUser = await usersCollection.findOne({ email: 'admin@napkin.com' });
    if (adminUser) {
      console.log('\n🔍 Admin User Details:');
      console.log(`   Current Role: "${adminUser.role}"`);
      console.log(`   Role Type: ${typeof adminUser.role}`);
      console.log(`   Is "Super Admin": ${adminUser.role === 'Super Admin'}`);
      
      if (adminUser.role !== 'Super Admin') {
        console.log('\n⚠️  Role mismatch detected!');
        console.log(`   Expected: "Super Admin"`);
        console.log(`   Actual: "${adminUser.role}"`);
        console.log('\n💡 To fix, run: npm run fix-superadmin');
      }
    }

    await closeDatabase();
  } catch (error) {
    console.error('❌ Error checking super admin:', error);
    await closeDatabase();
    process.exit(1);
  }
}

checkSuperAdmin();

