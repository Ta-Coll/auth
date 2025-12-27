export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetVerifyRequest {
  email: string;
  code: string;
  newPassword: string;
}

export interface PasswordResetResponse {
  success: boolean;
  message?: string;
  error?: string;
  code?: string;
  data?: {
    email: string;
  };
}

