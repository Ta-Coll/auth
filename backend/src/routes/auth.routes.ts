import { Router, Request, Response } from 'express';
import { UserModel } from '../models/User.model';
import { generateToken } from '../utils/jwt.util';
import { validateSignup, validateLogin, validateEmail } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { SignupRequest, LoginRequest, AuthResponse } from '../types/user.types';

const router = Router();

// Helper function to get UserModel instance (lazy initialization)
function getUserModel(): UserModel {
  return new UserModel();
}

// Signup endpoint
router.post('/signup', validateSignup, async (req: Request, res: Response): Promise<void> => {
  try {
    const userModel = getUserModel();
    const data: SignupRequest = {
      email: req.body.email,
      username: req.body.username,
      password: req.body.password,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      timeZone: req.body.timeZone,
    };

    const user = await userModel.createUser(data);

    // Generate JWT token
    const token = generateToken({
      uid: user.uid,
      email: user.email,
      role: user.role,
    });

    const response: AuthResponse = {
      token,
      user: {
        uid: user.uid,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified,
        role: user.role,
        teams: user.teams,
      },
    };

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: response,
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

    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register user',
      code: 'REGISTRATION_FAILED',
    });
  }
});

// Login endpoint
router.post('/login', validateLogin, async (req: Request, res: Response): Promise<void> => {
  try {
    const userModel = getUserModel();
    const data: LoginRequest = {
      email: req.body.email,
      password: req.body.password,
    };

    const user = await userModel.findByEmail(data.email);

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      });
      return;
    }

    const isPasswordValid = await userModel.verifyPassword(user, data.password);

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      });
      return;
    }

    // Generate JWT token
    const token = generateToken({
      uid: user.uid,
      email: user.email,
      role: user.role,
    });

    const response: AuthResponse = {
      token,
      user: {
        uid: user.uid,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified,
        role: user.role,
        teams: user.teams,
      },
    };

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: response,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to login',
      code: 'LOGIN_FAILED',
    });
  }
});

// Validate email endpoint
router.post('/validate-email', validateEmail, async (req: Request, res: Response): Promise<void> => {
  try {
    const userModel = getUserModel();
    const { email } = req.body;
    const verified = req.body.verified !== undefined ? req.body.verified : true;

    const user = await userModel.findByEmail(email);

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    const updated = await userModel.updateEmailVerified(user.uid, verified);

    if (!updated) {
      res.status(500).json({
        success: false,
        error: 'Failed to update email verification status',
        code: 'UPDATE_FAILED',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Email verification status updated to ${verified}`,
      data: {
        email: user.email,
        emailVerified: verified,
      },
    });
  } catch (error) {
    console.error('Email validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate email',
      code: 'VALIDATION_FAILED',
    });
  }
});

// Get current user endpoint (protected)
router.get('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userModel = getUserModel();
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    const user = await userModel.findByUid(req.user.uid);

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    const userWithoutPassword = await userModel.getUserWithoutPassword(user);

    res.status(200).json({
      success: true,
      data: userWithoutPassword,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user',
      code: 'GET_USER_FAILED',
    });
  }
});

export default router;

