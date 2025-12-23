import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

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
            // Redirect super admins directly to admin panel
            // Use replaceUrl to prevent back button from going to login
            if (response.data.user.role === 'superadmin') {
              this.router.navigate(['/admin'], { replaceUrl: true });
            } else {
              this.router.navigate(['/dashboard'], { replaceUrl: true });
            }
          }
          this.isLoading = false;
        },
        error: (error) => {
          this.errorMessage = error.error?.error || 'Login failed. Please check your credentials.';
          this.isLoading = false;
        }
      });
    }
  }
}

