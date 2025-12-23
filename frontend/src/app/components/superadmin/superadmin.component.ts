import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AdminService, User } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-superadmin',
  templateUrl: './superadmin.component.html',
  styleUrls: ['./superadmin.component.css']
})
export class SuperadminComponent implements OnInit {
  users: User[] = [];
  currentPage: number = 1;
  limit: number = 20;
  totalPages: number = 1;
  totalUsers: number = 0;
  isLoading: boolean = false;
  errorMessage: string = '';
  selectedUser: User | null = null;
  newRole: string = '';
  showRoleModal: boolean = false;

  constructor(
    private adminService: AdminService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.adminService.getUsers(this.currentPage, this.limit).subscribe({
      next: (response) => {
        if (response.success) {
          this.users = response.data.users;
          this.totalPages = response.data.pagination.totalPages;
          this.totalUsers = response.data.pagination.total;
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.error?.error || 'Failed to load users';
        this.isLoading = false;
        if (error.status === 403) {
          this.errorMessage = 'Access denied. Super admin privileges required.';
        }
      }
    });
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadUsers();
    }
  }

  openRoleModal(user: User): void {
    this.selectedUser = user;
    this.newRole = user.role || 'registered';
    this.showRoleModal = true;
  }

  closeRoleModal(): void {
    this.showRoleModal = false;
    this.selectedUser = null;
    this.newRole = '';
  }

  updateUserRole(): void {
    if (!this.selectedUser || !this.newRole) return;

    this.adminService.updateUserRole(this.selectedUser.uid, this.newRole).subscribe({
      next: (response) => {
        if (response.success) {
          // Update user in list
          const index = this.users.findIndex(u => u.uid === this.selectedUser!.uid);
          if (index !== -1) {
            this.users[index].role = this.newRole;
          }
          this.closeRoleModal();
        }
      },
      error: (error) => {
        this.errorMessage = error.error?.error || 'Failed to update user role';
        console.error('Error updating role:', error);
      }
    });
  }

  getRoleBadgeClass(role: string | undefined): string {
    switch (role) {
      case 'superadmin':
        return 'badge-superadmin';
      case 'registered':
        return 'badge-registered';
      case 'anonymous':
        return 'badge-anonymous';
      default:
        return 'badge-default';
    }
  }

  logout(): void {
    this.authService.logout();
    // Navigate to login and replace current history entry
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}

