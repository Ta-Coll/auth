import { Component, OnInit } from '@angular/core';
import { AuthService, User } from '../../services/auth.service';
import { CompanyService } from '../../services/company.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  user: User | null = null;
  isLoading: boolean = true;
  showCreateCompanyModal: boolean = false;
  showInviteModal: boolean = false;
  isCreatingCompany: boolean = false;
  isInviting: boolean = false;
  newCompany: {
    name: string;
    description: string;
  } = {
    name: '',
    description: ''
  };
  inviteData: {
    email: string;
    companyId: string;
  } = {
    email: '',
    companyId: ''
  };
  userCompanies: any[] = [];

  constructor(
    private authService: AuthService,
    private companyService: CompanyService,
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
          // Redirect super admins to admin panel (bypass email verification)
          // Check for both 'Super Admin' (new) and 'superadmin' (old) for backward compatibility
          const userRole = this.user?.role;
          if (userRole === 'Super Admin' || userRole === 'superadmin') {
            this.router.navigate(['/admin'], { replaceUrl: true });
            return;
          }
          
          // Redirect unverified users to unverified page
          if (!this.user?.emailVerified) {
            this.router.navigate(['/unverified'], { replaceUrl: true });
            return;
          }

          // Check if user is admin in any company and redirect (admins should not see dashboard)
          this.checkAndRedirectToCompanyAdmin();
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

  checkAndRedirectToCompanyAdmin(): void {
    // Check if user is admin in any company
    this.companyService.getMyCompanies().subscribe({
      next: (response) => {
        if (response.success && response.data.companies) {
          // Find first company where user is admin
          const adminCompany = response.data.companies.find((company: any) => {
            const member = company.members?.find((m: any) => m.uid === this.user?.uid);
            return member?.role === 'admin';
          });

          if (adminCompany) {
            // Redirect to company admin page
            this.router.navigate(['/company', adminCompany.companyId, 'admin'], { replaceUrl: true });
            return;
          }
        }
        // Not an admin in any company, load companies for display
        this.loadCompanies();
      },
      error: (error) => {
        console.error('Error loading companies:', error);
        // On error, still load companies for display
        this.loadCompanies();
      }
    });
  }

  loadCompanies(): void {
    this.companyService.getMyCompanies().subscribe({
      next: (response) => {
        if (response.success) {
          this.userCompanies = response.data.companies || [];
        }
      },
      error: (error) => {
        console.error('Error loading companies:', error);
      }
    });
  }

  openCreateCompanyModal(): void {
    this.newCompany = {
      name: '',
      description: ''
    };
    this.showCreateCompanyModal = true;
  }

  closeCreateCompanyModal(): void {
    this.showCreateCompanyModal = false;
    this.newCompany = {
      name: '',
      description: ''
    };
  }

  createCompany(): void {
    if (!this.newCompany.name || this.newCompany.name.trim().length === 0) {
      return;
    }

    this.isCreatingCompany = true;

    this.companyService.createCompany({
      name: this.newCompany.name,
      description: this.newCompany.description || undefined
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.closeCreateCompanyModal();
          this.isCreatingCompany = false;
          // Redirect to company admin page
          this.router.navigate(['/company', response.data.companyId, 'admin'], { replaceUrl: true });
        }
      },
      error: (error) => {
        console.error('Error creating company:', error);
        alert(error.error?.error || 'Failed to create company');
        this.isCreatingCompany = false;
      }
    });
  }

  openInviteModal(companyId: string): void {
    this.inviteData = {
      email: '',
      companyId: companyId
    };
    this.showInviteModal = true;
  }

  closeInviteModal(): void {
    this.showInviteModal = false;
    this.inviteData = {
      email: '',
      companyId: ''
    };
  }

  inviteUser(): void {
    if (!this.inviteData.email || !this.inviteData.email.trim()) {
      alert('Please enter an email address');
      return;
    }

    if (!this.inviteData.companyId) {
      alert('Company ID is missing');
      return;
    }

    this.isInviting = true;

    this.companyService.inviteUser({
      email: this.inviteData.email,
      companyId: this.inviteData.companyId
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.closeInviteModal();
          this.isInviting = false;
          alert(response.message || 'Invite sent successfully!');
        }
      },
      error: (error) => {
        console.error('Error sending invite:', error);
        alert(error.error?.error || 'Failed to send invite');
        this.isInviting = false;
      }
    });
  }

  hasAdminRole(): boolean {
    return this.userCompanies.some((company: any) => {
      const member = company.members?.find((m: any) => m.uid === this.user?.uid);
      return member?.role === 'admin';
    });
  }

  getUserRoleInCompany(company: any): string | null {
    if (!this.user || !company.members) return null;
    const member = company.members.find((m: any) => m.uid === this.user?.uid);
    return member?.role || null;
  }

  canInviteInCompany(company: any): boolean {
    const role = this.getUserRoleInCompany(company);
    return role === 'admin'; // Only admins can invite
  }

  goToCompanyAdmin(companyId: string): void {
    this.router.navigate(['/company', companyId, 'admin'], { replaceUrl: true });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}

