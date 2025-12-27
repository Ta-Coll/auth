import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {
  resetPasswordForm: FormGroup;
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;
  email: string = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.resetPasswordForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
      newPassword: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    // Get email from query params
    this.route.queryParams.subscribe(params => {
      this.email = params['email'] || '';
      if (!this.email) {
        // If no email, redirect to forgot password
        this.router.navigate(['/forgot-password'], { replaceUrl: true });
      }
    });
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
    } else if (confirmPassword) {
      confirmPassword.setErrors(null);
    }
    
    return null;
  }

  onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, ''); // Remove non-digits
    this.resetPasswordForm.patchValue({ code: value }, { emitEvent: false });
  }

  onSubmit(): void {
    if (this.resetPasswordForm.valid && this.email) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const code = this.resetPasswordForm.get('code')?.value;
      const newPassword = this.resetPasswordForm.get('newPassword')?.value;
      
      this.authService.resetPassword(this.email, code, newPassword).subscribe({
        next: (response) => {
          if (response.success) {
            this.successMessage = response.message || 'Password has been reset successfully.';
            // Redirect to login after 2 seconds
            setTimeout(() => {
              this.router.navigate(['/login'], { replaceUrl: true });
            }, 2000);
          }
          this.isLoading = false;
        },
        error: (error) => {
          this.errorMessage = error.error?.error || 'Failed to reset password. Please try again.';
          this.isLoading = false;
        }
      });
    }
  }

  getErrorMessage(fieldName: string): string {
    const field = this.resetPasswordForm.get(fieldName);
    if (field?.hasError('required')) {
      return `${fieldName} is required`;
    }
    if (field?.hasError('pattern')) {
      if (fieldName === 'code') {
        return 'Reset code must be 4 digits';
      }
      if (fieldName === 'newPassword') {
        return 'Password must contain uppercase, lowercase, and number';
      }
    }
    if (field?.hasError('minlength')) {
      return 'Password must be at least 8 characters';
    }
    if (field?.hasError('passwordMismatch')) {
      return 'Passwords do not match';
    }
    return '';
  }
}

