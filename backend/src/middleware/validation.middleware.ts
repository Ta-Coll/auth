import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';

export const validateSignup = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be between 1 and 100 characters'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be between 1 and 100 characters'),
  body('timeZone')
    .trim()
    .notEmpty()
    .withMessage('Time zone is required'),
  (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ 
        success: false,
        error: 'Validation failed', 
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
      return;
    }
    next();
  },
];

export const validateVerifyCode = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Verification code is required')
    .isLength({ min: 4, max: 4 })
    .withMessage('Verification code must be 4 digits')
    .matches(/^\d{4}$/)
    .withMessage('Verification code must be 4 digits'),
  (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ 
        success: false,
        error: 'Validation failed', 
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
      return;
    }
    next();
  },
];

export const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ 
        success: false,
        error: 'Validation failed', 
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
      return;
    }
    next();
  },
];

export const validateEmail = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ 
        success: false,
        error: 'Validation failed', 
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
      return;
    }
    next();
  },
];

export const validatePasswordReset = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ 
        success: false,
        error: 'Validation failed', 
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
      return;
    }
    next();
  },
];

export const validatePasswordResetVerify = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Reset code is required')
    .isLength({ min: 4, max: 4 })
    .withMessage('Reset code must be 4 digits')
    .matches(/^\d{4}$/)
    .withMessage('Reset code must be 4 digits'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ 
        success: false,
        error: 'Validation failed', 
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
      return;
    }
    next();
  },
];
