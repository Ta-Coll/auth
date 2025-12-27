import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-verify-code',
  templateUrl: './verify-code.component.html',
  styleUrls: ['./verify-code.component.css']
})
export class VerifyCodeComponent implements OnInit {
  verifyForm: FormGroup;
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
    this.verifyForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]]
    });
  }

  ngOnInit(): void {
    // Get email from query params
    this.route.queryParams.subscribe(params => {
      this.email = params['email'] || '';
      if (!this.email) {
        // If no email, redirect to signup
        this.router.navigate(['/signup'], { replaceUrl: true });
      }
    });
  }

  onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, ''); // Remove non-digits
    this.verifyForm.patchValue({ code: value }, { emitEvent: false });
  }

  onSubmit(): void {
    if (this.verifyForm.valid && this.email) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const code = this.verifyForm.get('code')?.value;
      this.authService.verifyCode({ email: this.email, code }).subscribe({
        next: (response) => {
          if (response.success) {
            this.successMessage = response.message || 'Email verified successfully! Please check your email for your password.';
            // Redirect to login after 3 seconds
            setTimeout(() => {
              this.router.navigate(['/login'], { replaceUrl: true });
            }, 3000);
          }
          this.isLoading = false;
        },
        error: (error) => {
          this.errorMessage = error.error?.error || 'Verification failed. Please try again.';
          this.isLoading = false;
        }
      });
    }
  }

  goToSignup(): void {
    this.router.navigate(['/signup'], { replaceUrl: true });
  }

  getErrorMessage(): string {
    const codeField = this.verifyForm.get('code');
    if (codeField?.hasError('required')) {
      return 'Verification code is required';
    }
    if (codeField?.hasError('pattern')) {
      return 'Verification code must be 4 digits';
    }
    return '';
  }

  resendEmail(): void {
    // Resend validation email using resend verification endpoint
    if (!this.email) return;
    
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    this.authService.resendVerificationCode(this.email).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage = 'Validation email has been resent. Please check your email.';
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.error?.error || 'Failed to resend email. Please try again.';
        this.isLoading = false;
      }
    });
  }
}

