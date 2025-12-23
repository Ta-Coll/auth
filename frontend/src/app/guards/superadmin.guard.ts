import { Injectable } from '@angular/core';
import { Router, CanActivate } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SuperAdminGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> | boolean {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return false;
    }

    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        // Check for both 'Super Admin' (new) and 'superadmin' (old) for backward compatibility
        const userRole = user.role;
        if (userRole === 'Super Admin' || userRole === 'superadmin') {
          return true;
        }
      } catch (e) {
        console.error('Error parsing user:', e);
      }
    }

    // If user not in storage, fetch from API
    return this.authService.getCurrentUser().pipe(
      map(response => {
        // Check for both 'Super Admin' (new) and 'superadmin' (old) for backward compatibility
        const userRole = response.data.role;
        if (response.success && (userRole === 'Super Admin' || userRole === 'superadmin')) {
          return true;
        } else {
          this.router.navigate(['/dashboard']);
          return false;
        }
      })
    );
  }
}

