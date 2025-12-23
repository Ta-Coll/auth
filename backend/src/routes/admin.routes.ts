import { Router, Request, Response } from 'express';
import { authenticate, requireSuperAdmin } from '../middleware/auth.middleware';
import { UserModel } from '../models/User.model';
import { getDatabase } from '../config/database';
import { User } from '../types/user.types';

const router = Router();

// Helper function to get UserModel instance (lazy initialization)
function getUserModel(): UserModel {
  return new UserModel();
}

// All admin routes require super admin authentication
router.use(authenticate);
router.use(requireSuperAdmin());

// Get all users
router.get('/users', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDatabase();
    const usersCollection = db.collection<User>('users');
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const users = await usersCollection
      .find({ removed: false })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await usersCollection.countDocuments({ removed: false });

    // Remove passwords from response
    const usersWithoutPasswords = users.map(user => {
      const { pw, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    res.status(200).json({
      success: true,
      data: {
        users: usersWithoutPasswords,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get users',
      code: 'GET_USERS_FAILED',
    });
  }
});

// Update user role
router.patch('/users/:uid/role', async (req: Request, res: Response): Promise<void> => {
  try {
    const { uid } = req.params;
    const { role } = req.body;

    if (!role || !['anonymous', 'registered', 'superadmin'].includes(role)) {
      res.status(400).json({
        success: false,
        error: 'Invalid role. Must be: anonymous, registered, or superadmin',
        code: 'INVALID_ROLE',
      });
      return;
    }

    const userModel = getUserModel();
    
    // Prevent removing superadmin role from the last superadmin
    if (role !== 'superadmin') {
      const user = await userModel.findByUid(uid);
      if (user?.role === 'superadmin') {
        const db = getDatabase();
        const usersCollection = db.collection<User>('users');
        const superAdminCount = await usersCollection.countDocuments({ 
          role: 'superadmin', 
          removed: false 
        });
        
        if (superAdminCount <= 1) {
          res.status(400).json({
            success: false,
            error: 'Cannot remove superadmin role from the last superadmin',
            code: 'LAST_SUPERADMIN',
          });
          return;
        }
      }
    }

    const updated = await userModel.updateRole(uid, role);

    if (!updated) {
      res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `User role updated to ${role}`,
      data: { uid, role },
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user role',
      code: 'UPDATE_ROLE_FAILED',
    });
  }
});

export default router;

