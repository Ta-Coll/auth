import { Component, OnInit } from '@angular/core';
import { AuthService, User } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
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
          // Redirect super admins to admin panel
          if (this.user?.role === 'superadmin') {
            this.router.navigate(['/admin'], { replaceUrl: true });
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
}

