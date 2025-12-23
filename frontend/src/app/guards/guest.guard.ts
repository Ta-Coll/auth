import { Injectable } from '@angular/core';
import { Router, CanActivate } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class GuestGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): boolean {
    if (this.authService.isAuthenticated()) {
      // If user is authenticated, redirect based on role
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.role === 'superadmin') {
            this.router.navigate(['/admin'], { replaceUrl: true });
          } else {
            this.router.navigate(['/dashboard'], { replaceUrl: true });
          }
        } catch (e) {
          this.router.navigate(['/dashboard'], { replaceUrl: true });
        }
      } else {
        this.router.navigate(['/dashboard'], { replaceUrl: true });
      }
      return false;
    }
    return true;
  }
}

