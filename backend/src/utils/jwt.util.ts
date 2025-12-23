import jwt, { SignOptions } from 'jsonwebtoken';
import { JWTPayload } from '../types/user.types';

const JWT_SECRET = (process.env.JWT_SECRET || 'default-secret-change-in-production') as string;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export function generateToken(payload: JWTPayload): string {
  const tokenPayload = {
    uid: payload.uid,
    email: payload.email,
    ...(payload.role && { role: payload.role }),
  };
  // Use type assertion for the entire options object to bypass strict type checking
  const options = {
    expiresIn: JWT_EXPIRES_IN,
  } as SignOptions;
  // Type assertion to help TypeScript with overload resolution
  return (jwt.sign as (payload: object, secret: string, options: SignOptions) => string)(
    tokenPayload,
    JWT_SECRET,
    options
  );
}

export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw new Error('Token verification failed');
  }
}

export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

