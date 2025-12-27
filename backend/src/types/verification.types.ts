export interface VerificationCode {
  _id?: string;
  email: string;
  code: string; // 4-digit code
  password: string; // Auto-generated password (plain text, for sending in email)
  hashedPassword: string; // Auto-generated password (hashed, for storing in user)
  createdAt: number; // Timestamp
  expiresAt: number; // Timestamp (10 minutes from creation for verification, 30 minutes for password reset)
  verified: boolean; // Whether code has been used
  type?: string; // 'password-reset' for password reset codes, undefined for verification codes
}

export interface VerifyCodeRequest {
  email: string;
  code: string;
}

export interface VerifyCodeResponse {
  success: boolean;
  message?: string;
  error?: string;
  code?: string;
}

