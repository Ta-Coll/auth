import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CompanyService } from '../../services/company.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-company-invite',
  templateUrl: './company-invite.component.html',
  styleUrls: ['./company-invite.component.css']
})
export class CompanyInviteComponent implements OnInit {
  companyId: string = '';
  companyName: string = '';
  members: any[] = [];
  isLoading: boolean = true;
  errorMessage: string = '';
  isInviting: boolean = false;
  isAddingUser: boolean = false;
  showInviteModal: boolean = false;
  showInsertModal: boolean = false;
  
  inviteForm = {
    email: '',
    role: 'member' as 'member' | 'creator'
  };

  insertForm = {
    email: '',
    role: 'member' as 'member' | 'creator',
    firstName: '',
    lastName: ''
  };

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
        this.loadCompanyMembers();
      } else {
        this.errorMessage = 'Company ID is required';
        this.isLoading = false;
      }
    });
  }

  loadCompanyMembers(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.companyService.getCompanyMembers(this.companyId).subscribe({
      next: (response) => {
        if (response.success) {
          this.companyName = response.data.companyName;
          this.members = response.data.members || [];
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.error?.error || 'Failed to load company members';
        this.isLoading = false;
      }
    });
  }

  openInviteModal(): void {
    this.inviteForm = {
      email: '',
      role: 'member'
    };
    this.showInviteModal = true;
  }

  closeInviteModal(): void {
    this.showInviteModal = false;
    this.inviteForm = {
      email: '',
      role: 'member'
    };
  }

  openInsertModal(): void {
    this.insertForm = {
      email: '',
      role: 'member',
      firstName: '',
      lastName: ''
    };
    this.showInsertModal = true;
  }

  closeInsertModal(): void {
    this.showInsertModal = false;
    this.insertForm = {
      email: '',
      role: 'member',
      firstName: '',
      lastName: ''
    };
  }

  sendInvite(): void {
    if (!this.inviteForm.email || !this.inviteForm.email.trim()) {
      alert('Please enter an email address');
      return;
    }

    if (!this.inviteForm.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      alert('Please enter a valid email address');
      return;
    }

    this.isInviting = true;

    this.companyService.inviteUser({
      email: this.inviteForm.email,
      companyId: this.companyId,
      role: this.inviteForm.role
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.closeInviteModal();
          this.loadCompanyMembers();
          alert('Invite sent successfully!');
        }
        this.isInviting = false;
      },
      error: (error) => {
        alert(error.error?.error || 'Failed to send invite');
        this.isInviting = false;
      }
    });
  }

  addUserManually(): void {
    if (!this.insertForm.email || !this.insertForm.email.trim()) {
      alert('Please enter an email address');
      return;
    }

    if (!this.insertForm.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      alert('Please enter a valid email address');
      return;
    }

    this.isAddingUser = true;

    this.companyService.addMemberManually(this.companyId, {
      email: this.insertForm.email,
      role: this.insertForm.role,
      firstName: this.insertForm.firstName,
      lastName: this.insertForm.lastName
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.closeInsertModal();
          this.loadCompanyMembers();
          alert(response.message || 'User added successfully!');
        }
        this.isAddingUser = false;
      },
      error: (error) => {
        alert(error.error?.error || 'Failed to add user');
        this.isAddingUser = false;
      }
    });
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'accepted':
        return 'badge-success';
      case 'invited':
        return 'badge-warning';
      case 'inactive':
        return 'badge-secondary';
      case 'removed':
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  }

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'admin':
        return 'badge-admin';
      case 'creator':
        return 'badge-creator';
      case 'member':
        return 'badge-member';
      default:
        return 'badge-secondary';
    }
  }

  deleteMember(member: any): void {
    const memberName = member.firstName && member.lastName 
      ? `${member.firstName} ${member.lastName}` 
      : member.email;
    
    if (!confirm(`Are you sure you want to delete ${memberName} from this company?`)) {
      return;
    }

    this.companyService.deleteMember(this.companyId, member.email, member.uid).subscribe({
      next: (response) => {
        if (response.success) {
          // Reload members list
          this.loadCompanyMembers();
        }
      },
      error: (error) => {
        alert(error.error?.error || 'Failed to delete member');
        console.error('Error deleting member:', error);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/company', this.companyId, 'admin'], { replaceUrl: true });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}

