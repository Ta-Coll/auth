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

// Create new user
router.post('/users', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, username, password, firstName, lastName, timeZone, role, emailVerified } = req.body;

    // Validate required fields
    if (!email || !username || !password || !firstName || !lastName || !timeZone) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: email, username, password, firstName, lastName, timeZone',
        code: 'MISSING_FIELDS',
      });
      return;
    }

    // Validate role
    if (role && !['Member', 'Creator', 'Super Admin'].includes(role)) {
      res.status(400).json({
        success: false,
        error: 'Invalid role. Must be: Member, Creator, or Super Admin',
        code: 'INVALID_ROLE',
      });
      return;
    }

    const userModel = getUserModel();

    // Check if email already exists
    const existingEmail = await userModel.findByEmail(email);
    if (existingEmail) {
      res.status(409).json({
        success: false,
        error: 'Email already in use',
        code: 'EMAIL_IN_USE',
      });
      return;
    }

    // Check if username already exists
    const existingUsername = await userModel.findByUsername(username);
    if (existingUsername) {
      res.status(409).json({
        success: false,
        error: 'Username already in use',
        code: 'USERNAME_IN_USE',
      });
      return;
    }

    // Create user with admin-specified role and email verification status
    const signupData = {
      email,
      username,
      password,
      firstName,
      lastName,
      timeZone,
    };

    const user = await userModel.createUser(signupData, req.user?.uid);

    // Update role and emailVerified if provided
    const updates: any = {};
    if (role) {
      updates.role = role;
    }
    if (emailVerified !== undefined) {
      updates.emailVerified = Boolean(emailVerified);
    }

    if (Object.keys(updates).length > 0) {
      const db = getDatabase();
      const usersCollection = db.collection<User>('users');
      await usersCollection.updateOne(
        { uid: user.uid },
        { $set: updates }
      );
      // Update local user object
      Object.assign(user, updates);
    }

    // Get user without password for response
    const userWithoutPassword = await userModel.getUserWithoutPassword(user);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userWithoutPassword,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Email already in use') {
        res.status(409).json({
          success: false,
          error: error.message,
          code: 'EMAIL_IN_USE',
        });
        return;
      }
      if (error.message === 'Username already in use') {
        res.status(409).json({
          success: false,
          error: error.message,
          code: 'USERNAME_IN_USE',
        });
        return;
      }
    }

    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user',
      code: 'CREATE_USER_FAILED',
    });
  }
});

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

// Update user (role and email verified)
router.patch('/users/:uid', async (req: Request, res: Response): Promise<void> => {
  try {
    const { uid } = req.params;
    const { role, emailVerified } = req.body;

    const userModel = getUserModel();
    const updates: any = {};

    // Update role if provided
    if (role !== undefined) {
      if (!['Member', 'Creator', 'Super Admin'].includes(role)) {
        res.status(400).json({
          success: false,
          error: 'Invalid role. Must be: Member, Creator, or Super Admin',
          code: 'INVALID_ROLE',
        });
        return;
      }

      // Prevent removing Super Admin role from the last Super Admin
      if (role !== 'Super Admin') {
        const user = await userModel.findByUid(uid);
        if (user?.role === 'Super Admin' || user?.role === 'superadmin') {
          const db = getDatabase();
          const usersCollection = db.collection<User>('users');
          const superAdminCount = await usersCollection.countDocuments({ 
            $or: [
              { role: 'Super Admin' },
              { role: 'superadmin' }
            ],
            removed: false 
          });
          
          if (superAdminCount <= 1) {
            res.status(400).json({
              success: false,
              error: 'Cannot remove Super Admin role from the last Super Admin',
              code: 'LAST_SUPERADMIN',
            });
            return;
          }
        }
      }
      updates.role = role;
    }

    // Update email verified if provided
    if (emailVerified !== undefined) {
      updates.emailVerified = Boolean(emailVerified);
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({
        success: false,
        error: 'No valid fields to update',
        code: 'NO_UPDATES',
      });
      return;
    }

    // Update user in database
    const db = getDatabase();
    const usersCollection = db.collection<User>('users');
    const result = await usersCollection.updateOne(
      { uid },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: { uid, ...updates },
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user',
      code: 'UPDATE_USER_FAILED',
    });
  }
});

// Delete user (soft delete - sets removed: true)
router.delete('/users/:uid', async (req: Request, res: Response): Promise<void> => {
  try {
    const { uid } = req.params;
    const userModel = getUserModel();
    
    // Get user to check role
    const user = await userModel.findByUid(uid);
    
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    // Prevent deleting the last Super Admin
    if (user.role === 'Super Admin' || user.role === 'superadmin') {
      const db = getDatabase();
      const usersCollection = db.collection<User>('users');
      const superAdminCount = await usersCollection.countDocuments({ 
        $or: [
          { role: 'Super Admin' },
          { role: 'superadmin' }
        ],
        removed: false 
      });
      
      if (superAdminCount <= 1) {
        res.status(400).json({
          success: false,
          error: 'Cannot delete the last Super Admin',
          code: 'LAST_SUPERADMIN',
        });
        return;
      }
    }

    // Hard delete: actually remove the document from database
    const db = getDatabase();
    const usersCollection = db.collection<User>('users');
    const result = await usersCollection.deleteOne({ uid });

    if (result.deletedCount === 0) {
      res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      data: { uid },
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
      code: 'DELETE_USER_FAILED',
    });
  }
});

// Update user role (kept for backward compatibility)
router.patch('/users/:uid/role', async (req: Request, res: Response): Promise<void> => {
  try {
    const { uid } = req.params;
    const { role } = req.body;

    if (!role || !['Member', 'Creator', 'Super Admin'].includes(role)) {
      res.status(400).json({
        success: false,
        error: 'Invalid role. Must be: Member, Creator, or Super Admin',
        code: 'INVALID_ROLE',
      });
      return;
    }

    const userModel = getUserModel();
    
    // Prevent removing Super Admin role from the last Super Admin
    if (role !== 'Super Admin') {
      const user = await userModel.findByUid(uid);
      if (user?.role === 'Super Admin') {
        const db = getDatabase();
        const usersCollection = db.collection<User>('users');
        const superAdminCount = await usersCollection.countDocuments({ 
          role: 'Super Admin', 
          removed: false 
        });
        
        if (superAdminCount <= 1) {
          res.status(400).json({
            success: false,
            error: 'Cannot remove Super Admin role from the last Super Admin',
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

