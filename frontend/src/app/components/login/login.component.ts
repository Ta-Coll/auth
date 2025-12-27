import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CompanyService } from '../../services/company.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage: string = '';
  isLoading: boolean = false;
  showResendVerification: boolean = false;
  resendEmail: string = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private companyService: CompanyService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const formData = this.loginForm.value;
      this.authService.login(formData).subscribe({
        next: (response) => {
          if (response.success) {
            // Redirect based on role and email verification
            // Use replaceUrl to prevent back button from going to login
            const userRole = response.data.user.role;
            // Check for both 'Super Admin' (new) and 'superadmin' (old) for backward compatibility
            if (userRole === 'Super Admin' || userRole === 'superadmin') {
              this.router.navigate(['/admin'], { replaceUrl: true });
              this.isLoading = false;
            } else if (!response.data.user.emailVerified) {
              this.router.navigate(['/unverified'], { replaceUrl: true });
              this.isLoading = false;
            } else {
              // Check if user is admin in any company
              this.checkAndRedirectToCompanyAdmin(response.data.user.uid);
            }
          }
        },
        error: (error) => {
          const errorCode = error.error?.code;
          const errorMsg = error.error?.error || 'Login failed. Please check your credentials.';
          
          // Check if user is unverified
          if (errorCode === 'EMAIL_NOT_VERIFIED') {
            this.errorMessage = errorMsg;
            this.showResendVerification = true;
            this.resendEmail = this.loginForm.get('email')?.value || '';
          } else {
            this.errorMessage = errorMsg;
            this.showResendVerification = false;
          }
          this.isLoading = false;
        }
      });
    }
  }

  checkAndRedirectToCompanyAdmin(userUid: string): void {
    // Check if user is admin in any company
    this.companyService.getMyCompanies().subscribe({
      next: (response) => {
        if (response.success && response.data.companies) {
          // Find first company where user is admin
          const adminCompany = response.data.companies.find((company: any) => {
            const member = company.members?.find((m: any) => m.uid === userUid);
            return member?.role === 'admin';
          });

          if (adminCompany) {
            // Redirect to company admin page
            this.router.navigate(['/company', adminCompany.companyId, 'admin'], { replaceUrl: true });
          } else {
            // No admin role, go to general dashboard
            this.router.navigate(['/dashboard'], { replaceUrl: true });
          }
        } else {
          // No companies, go to general dashboard
          this.router.navigate(['/dashboard'], { replaceUrl: true });
        }
        this.isLoading = false;
      },
      error: () => {
        // On error, go to general dashboard
        this.router.navigate(['/dashboard'], { replaceUrl: true });
        this.isLoading = false;
      }
    });
  }

  onResendVerification(): void {
    if (!this.resendEmail) return;
    
    this.isLoading = true;
    this.errorMessage = '';
    
    this.authService.resendVerificationCode(this.resendEmail).subscribe({
      next: (response) => {
        if (response.success) {
          // Redirect to verify code page
          this.router.navigate(['/verify-code'], { 
            replaceUrl: true,
            queryParams: { email: this.resendEmail }
          });
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.error?.error || 'Failed to resend verification code. Please try again.';
        this.isLoading = false;
      }
    });
  }
}

