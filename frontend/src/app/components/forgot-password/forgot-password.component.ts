import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent {
  forgotPasswordForm: FormGroup;
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit(): void {
    if (this.forgotPasswordForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const email = this.forgotPasswordForm.get('email')?.value;
      this.authService.forgotPassword(email).subscribe({
        next: (response) => {
          if (response.success) {
            this.successMessage = response.message || 'Password reset code has been sent to your email.';
            // Redirect to reset password page after 2 seconds
            setTimeout(() => {
              this.router.navigate(['/reset-password'], { 
                replaceUrl: true,
                queryParams: { email }
              });
            }, 2000);
          }
          this.isLoading = false;
        },
        error: (error) => {
          const errorCode = error.error?.code;
          if (errorCode === 'EMAIL_NOT_VERIFIED') {
            this.errorMessage = error.error?.error || 'Please verify your email first.';
          } else {
            // For security, show success message even if user doesn't exist
            this.successMessage = 'If an account exists with this email, a password reset code has been sent.';
            setTimeout(() => {
              this.router.navigate(['/login'], { replaceUrl: true });
            }, 2000);
          }
          this.isLoading = false;
        }
      });
    }
  }
}

