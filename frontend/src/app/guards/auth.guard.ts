import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    if (this.authService.isAuthenticated()) {
      // Check if user is Super Admin
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          // If Super Admin tries to access dashboard or unverified, redirect to admin
          // Check for both 'Super Admin' (new) and 'superadmin' (old) for backward compatibility
          const userRole = user.role;
          if ((userRole === 'Super Admin' || userRole === 'superadmin') && 
              (route.routeConfig?.path === 'dashboard' || route.routeConfig?.path === 'unverified')) {
            this.router.navigate(['/admin'], { replaceUrl: true });
            return false;
          }
        } catch (e) {
          console.error('AuthGuard - Error parsing user:', e);
          // Continue with normal flow if parsing fails
        }
      }
      return true;
    } else {
      this.router.navigate(['/login'], { replaceUrl: true });
      return false;
    }
  }
}

