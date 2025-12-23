import { Component, OnInit } from '@angular/core';
import { AuthService, User } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-unverified',
  templateUrl: './unverified.component.html',
  styleUrls: ['./unverified.component.css']
})
export class UnverifiedComponent implements OnInit {
  user: User | null = null;
  isLoading: boolean = true;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUser();
  }

  loadUser(): void {
    this.isLoading = true;
    this.authService.getCurrentUser().subscribe({
      next: (response) => {
        if (response.success) {
          this.user = response.data;
          // Super Admins always go to admin panel (bypass email verification)
          if (this.user?.role === 'Super Admin') {
            this.router.navigate(['/admin'], { replaceUrl: true });
            return;
          }
          // If email is verified, redirect to dashboard
          if (this.user?.emailVerified) {
            this.router.navigate(['/dashboard'], { replaceUrl: true });
            return;
          }
        } else {
          this.router.navigate(['/login']);
        }
        this.isLoading = false;
      },
      error: () => {
        this.router.navigate(['/login']);
        this.isLoading = false;
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  resendVerification(): void {
    // TODO: Implement resend verification email functionality
    alert('Verification email resend functionality will be implemented soon.');
  }
}

