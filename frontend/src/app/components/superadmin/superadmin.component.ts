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
  newEmailVerified: boolean = false;
  showRoleModal: boolean = false;
  showInsertModal: boolean = false;
  isCreating: boolean = false;
  newUser: {
    email: string;
    username: string;
    password: string;
    firstName: string;
    lastName: string;
    timeZone: string;
    role: string;
    emailVerified: boolean;
  } = {
    email: '',
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    timeZone: 'America/New_York',
    role: 'Member',
    emailVerified: false
  };

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
    this.newRole = user.role || 'Member';
    this.newEmailVerified = user.emailVerified || false;
    this.showRoleModal = true;
  }

  closeRoleModal(): void {
    this.showRoleModal = false;
    this.selectedUser = null;
    this.newRole = '';
    this.newEmailVerified = false;
  }

  updateUserRole(): void {
    if (!this.selectedUser || !this.newRole) return;

    this.adminService.updateUser(this.selectedUser.uid, this.newRole, this.newEmailVerified).subscribe({
      next: (response) => {
        if (response.success) {
          // Update user in list
          const index = this.users.findIndex(u => u.uid === this.selectedUser!.uid);
          if (index !== -1) {
            this.users[index].role = this.newRole;
            this.users[index].emailVerified = this.newEmailVerified;
          }
          this.closeRoleModal();
        }
      },
      error: (error) => {
        this.errorMessage = error.error?.error || 'Failed to update user';
        console.error('Error updating user:', error);
      }
    });
  }

  getRoleBadgeClass(role: string | undefined): string {
    switch (role) {
      case 'Super Admin':
        return 'badge-superadmin';
      case 'Creator':
        return 'badge-creator';
      case 'Member':
        return 'badge-member';
      default:
        return 'badge-default';
    }
  }

  openInsertModal(): void {
    this.newUser = {
      email: '',
      username: '',
      password: '',
      firstName: '',
      lastName: '',
      timeZone: 'America/New_York',
      role: 'Member',
      emailVerified: false
    };
    this.showInsertModal = true;
    this.errorMessage = '';
  }

  closeInsertModal(): void {
    this.showInsertModal = false;
    this.newUser = {
      email: '',
      username: '',
      password: '',
      firstName: '',
      lastName: '',
      timeZone: 'America/New_York',
      role: 'Member',
      emailVerified: false
    };
  }

  createUser(): void {
    if (!this.newUser.email || !this.newUser.username || !this.newUser.password || 
        !this.newUser.firstName || !this.newUser.lastName || !this.newUser.role) {
      this.errorMessage = 'Please fill in all required fields';
      return;
    }

    this.isCreating = true;
    this.errorMessage = '';

    this.adminService.createUser(this.newUser).subscribe({
      next: (response) => {
        if (response.success) {
          // Reload users list
          this.loadUsers();
          this.closeInsertModal();
          this.isCreating = false;
        }
      },
      error: (error) => {
        this.errorMessage = error.error?.error || 'Failed to create user';
        console.error('Error creating user:', error);
        this.isCreating = false;
      }
    });
  }

  deleteUser(user: User): void {
    if (!confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName} (${user.email})?`)) {
      return;
    }

    this.adminService.deleteUser(user.uid).subscribe({
      next: (response) => {
        if (response.success) {
          // Reload users list
          this.loadUsers();
        }
      },
      error: (error) => {
        this.errorMessage = error.error?.error || 'Failed to delete user';
        console.error('Error deleting user:', error);
      }
    });
  }

  logout(): void {
    this.authService.logout();
    // Navigate to login and replace current history entry
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}

