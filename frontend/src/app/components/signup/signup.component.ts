import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent {
  signupForm: FormGroup;
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.signupForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      firstName: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(100)]],
      lastName: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(100)]],
      timeZone: ['America/New_York', [Validators.required]]
    });
  }

  onSubmit(): void {
    if (this.signupForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const formData = this.signupForm.value;
      this.authService.signup(formData).subscribe({
        next: (response) => {
          if (response.success) {
            // Redirect to verify code page with email
            this.router.navigate(['/verify-code'], { 
              replaceUrl: true,
              queryParams: { email: formData.email }
            });
          }
          this.isLoading = false;
        },
        error: (error) => {
          this.errorMessage = error.error?.error || 'Signup failed. Please try again.';
          this.isLoading = false;
        }
      });
    }
  }

  getErrorMessage(fieldName: string): string {
    const field = this.signupForm.get(fieldName);
    if (field?.hasError('required')) {
      return `${fieldName} is required`;
    }
    if (field?.hasError('email')) {
      return 'Invalid email format';
    }
    if (field?.hasError('minlength')) {
      return `${fieldName} is too short`;
    }
    if (field?.hasError('maxlength')) {
      return `${fieldName} is too long`;
    }
    return '';
  }
}

