import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../utils/jwt.util';
import { UserModel } from '../models/User.model';
import { UserRole, TeamRole } from '../types/user.types';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email: string;
        username?: string;
        role?: UserRole;
        teams?: Array<{ teamId: string; role: TeamRole }>;
      };
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      res.status(401).json({ error: 'No token provided', code: 'NO_TOKEN' });
      return;
    }

    const payload = verifyToken(token);
    const userModel = new UserModel();
    const user = await userModel.findByUid(payload.uid);

    if (!user || user.removed) {
      res.status(401).json({ error: 'User not found or removed', code: 'USER_NOT_FOUND' });
      return;
    }

    // Attach user info to request
    req.user = {
      uid: user.uid,
      email: user.email,
      username: user.username,
      role: user.role,
      teams: user.teams,
    };

    next();
  } catch (error) {
    if (error instanceof Error) {
      res.status(401).json({ error: error.message, code: 'INVALID_TOKEN' });
      return;
    }
    res.status(401).json({ error: 'Authentication failed', code: 'AUTH_FAILED' });
  }
}

export function requireRole(...allowedRoles: UserRole[]): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
      return;
    }

    if (!req.user.role || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({ 
        error: 'Insufficient permissions', 
        code: 'INSUFFICIENT_PERMISSIONS',
        required: allowedRoles,
        current: req.user.role
      });
      return;
    }

    next();
  };
}

export function requireSuperAdmin(): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
      return;
    }

    // Accept both 'Super Admin' (new) and 'superadmin' (old) for backward compatibility
    const userRole = req.user.role;
    if (userRole !== 'Super Admin' && userRole !== 'superadmin') {
      res.status(403).json({ 
        error: 'Super Admin access required', 
        code: 'SUPERADMIN_REQUIRED',
        current: req.user.role
      });
      return;
    }

    next();
  };
}

export function requireTeamRole(teamId: string, ...allowedRoles: TeamRole[]): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
      return;
    }

    const teamMembership = req.user.teams?.find(t => t.teamId === teamId);

    if (!teamMembership) {
      res.status(403).json({ 
        error: 'Not a member of this team', 
        code: 'NOT_TEAM_MEMBER' 
      });
      return;
    }

    if (!allowedRoles.includes(teamMembership.role)) {
      res.status(403).json({ 
        error: 'Insufficient team permissions', 
        code: 'INSUFFICIENT_TEAM_PERMISSIONS',
        required: allowedRoles,
        current: teamMembership.role
      });
      return;
    }

    next();
  };
}

