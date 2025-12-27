import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CompanyService } from '../../services/company.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-company-admin',
  templateUrl: './company-admin.component.html',
  styleUrls: ['./company-admin.component.css']
})
export class CompanyAdminComponent implements OnInit {
  companyId: string = '';
  company: any = null;
  userCreds: any = null;
  userRole: 'member' | 'creator' | 'admin' | null = null;
  isLoading: boolean = true;
  errorMessage: string = '';
  activeTab: string = 'admin'; // Default tab

  // Permission flags based on role
  canInvite: boolean = false;
  canViewEventLogs: boolean = false;
  canAccessAdminTools: boolean = false;
  canAccessCreationTools: boolean = false;
  canAccessContentTools: boolean = false;
  canAccessTeamChat: boolean = false;

  constructor(
    private companyService: CompanyService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.companyId = params['companyId'];
      if (this.companyId) {
        this.loadCompanyData();
      } else {
        this.errorMessage = 'Company ID is required';
        this.isLoading = false;
      }
    });
  }

  loadCompanyData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    // First get current user to get their UID
    this.authService.getCurrentUser().subscribe({
      next: (userResponse) => {
        if (!userResponse.success) {
          this.errorMessage = 'Failed to load user data';
          this.isLoading = false;
          return;
        }

        const currentUser = userResponse.data;
        
        // Get user's companies to find their role
        this.companyService.getMyCompanies().subscribe({
          next: (response) => {
            if (response.success) {
              const company = response.data.companies.find((c: any) => c.companyId === this.companyId);
              if (company) {
                this.company = company;
                // Find user's role in this company
                const userMember = company.members?.find((m: any) => m.uid === currentUser.uid);

                if (userMember) {
                  this.userRole = userMember.role as 'member' | 'creator' | 'admin';
                  this.setPermissions(this.userRole);
                } else {
                  this.errorMessage = 'You are not a member of this company';
                }
              } else {
                this.errorMessage = 'Company not found';
              }
            }
            this.isLoading = false;
          },
          error: (error) => {
            this.errorMessage = error.error?.error || 'Failed to load company data';
            this.isLoading = false;
          }
        });
      },
      error: () => {
        this.errorMessage = 'Failed to load user data';
        this.isLoading = false;
      }
    });
  }

  setPermissions(role: 'member' | 'creator' | 'admin'): void {
    // Admin: Full permissions
    if (role === 'admin') {
      this.canInvite = true;
      this.canViewEventLogs = true;
      this.canAccessAdminTools = true;
      this.canAccessCreationTools = true;
      this.canAccessContentTools = true;
      this.canAccessTeamChat = true;
      this.activeTab = 'admin'; // Default to admin tab for admins
    }
    // Creator: Creation tools + content + chat
    else if (role === 'creator') {
      this.canInvite = false;
      this.canViewEventLogs = false;
      this.canAccessAdminTools = false;
      this.canAccessCreationTools = true;
      this.canAccessContentTools = true;
      this.canAccessTeamChat = true;
      this.activeTab = 'creation'; // Default to creation tab for creators
    }
    // Member: Content tools + chat only
    else if (role === 'member') {
      this.canInvite = false;
      this.canViewEventLogs = false;
      this.canAccessAdminTools = false;
      this.canAccessCreationTools = false;
      this.canAccessContentTools = true;
      this.canAccessTeamChat = true;
      this.activeTab = 'content'; // Default to content tab for members
    }
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  openInvitePage(): void {
    // Navigate to invite page
    this.router.navigate(['/company', this.companyId, 'invite'], { replaceUrl: true });
  }

  openLogsPage(): void {
    // Navigate to logs page for this company
    this.router.navigate(['/company', this.companyId, 'logs'], { replaceUrl: true });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login'], { replaceUrl: true });
  }

}

