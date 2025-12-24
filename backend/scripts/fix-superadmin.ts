import 'dotenv/config';
import { connectDatabase, closeDatabase, getDatabase } from '../src/config/database';
import { User } from '../src/types/user.types';

async function fixSuperAdmin(): Promise<void> {
  try {
    await connectDatabase();
    const db = getDatabase();
    const usersCollection = db.collection<User>('users');

    // Find admin user
    const adminUser = await usersCollection.findOne({ email: 'admin@napkin.com' });
    
    if (!adminUser) {
      console.log('❌ Admin user not found!');
      await closeDatabase();
      return;
    }

    console.log('🔍 Current admin user role:', adminUser.role);
    
    // Update role to 'Super Admin'
    const result = await usersCollection.updateOne(
      { uid: adminUser.uid },
      { $set: { role: 'Super Admin' } }
    );

    if (result.modifiedCount > 0) {
      console.log('✅ Successfully updated admin role to "Super Admin"');
      
      // Verify the update
      const updatedUser = await usersCollection.findOne({ uid: adminUser.uid });
      console.log('🔍 Updated role:', updatedUser?.role);
    } else {
      console.log('⚠️  No changes made. Role might already be correct.');
    }

    await closeDatabase();
  } catch (error) {
    console.error('❌ Error fixing super admin:', error);
    await closeDatabase();
    process.exit(1);
  }
}

fixSuperAdmin();

