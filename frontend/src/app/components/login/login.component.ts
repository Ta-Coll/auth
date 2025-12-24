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
          this.errorMessage = error.error?.error || 'Login failed. Please check your credentials.';
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
}

