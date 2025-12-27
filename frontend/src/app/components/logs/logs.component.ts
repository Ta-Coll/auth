import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ActionTrackerService } from '../../services/action-tracker.service';
import { Action, ActionsResponse, BillingSummaryResponse, BillingSummary } from '../../models/action.model';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-logs',
  templateUrl: './logs.component.html',
  styleUrls: ['./logs.component.css']
})
export class LogsComponent implements OnInit {
  actions: Action[] = [];
  loading = false;
  pagination = {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  };
  
  filters = {
    type: '',
    collection: '',
    uid: '',
    companyId: '',
    removed: undefined as boolean | undefined
  };

  // Date range filters for billing
  dateRangeFilters = {
    fromDate: null as number | null,
    toDate: null as number | null
  };

  editForm: any = {};

  // Billing summary properties
  billingFilters = {
    companyId: '',
    fromDate: '',
    toDate: ''
  };
  billingSummary: BillingSummary | null = null;
  billingLoading = false;
  billingError: string | null = null;
  companyId: string = '';

  constructor(
    private actionTracker: ActionTrackerService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Get companyId from route if available
    this.route.params.subscribe(params => {
      this.companyId = params['companyId'] || '';
      if (this.companyId) {
        this.filters.companyId = this.companyId;
      }
      this.loadLogs();
    });
  }

  loadLogs(): void {
    this.loading = true;
    const params: any = {
      page: this.pagination.page,
      limit: this.pagination.limit
    };

    if (this.filters.type) params.type = this.filters.type;
    if (this.filters.collection) params.collection = this.filters.collection;
    if (this.filters.uid) params.uid = this.filters.uid;
    if (this.filters.companyId) params.companyId = this.filters.companyId;
    if (this.filters.removed !== undefined) params.removed = this.filters.removed;
    
    // Add date range filters if set (from billing summary)
    if (this.dateRangeFilters.fromDate) params.fromDate = this.dateRangeFilters.fromDate;
    if (this.dateRangeFilters.toDate) params.toDate = this.dateRangeFilters.toDate;

    this.actionTracker.getActions(params).subscribe({
      next: (response) => {
        // Type guard: check if it's ActionsResponse (has pagination) or BillingSummaryResponse
        if ('pagination' in response) {
          // It's ActionsResponse
          const actionsResponse = response as ActionsResponse;
          this.actions = actionsResponse.data || [];
          this.pagination = actionsResponse.pagination || { page: 1, limit: 20, total: 0, pages: 0 };
        } else {
          // It's BillingSummaryResponse - shouldn't happen in loadLogs, but handle it
          this.actions = [];
          this.pagination = { page: 1, limit: 20, total: 0, pages: 0 };
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading logs:', error);
        this.actions = [];
        this.loading = false;
      }
    });
  }

  clearFilters(): void {
    this.filters = {
      type: '',
      collection: '',
      uid: '',
      companyId: this.companyId || '', // Keep companyId if set from route
      removed: undefined
    };
    this.dateRangeFilters = {
      fromDate: null,
      toDate: null
    };
    this.billingSummary = null;
    this.billingError = null;
    this.pagination.page = 1;
    this.loadLogs();
  }

  previousPage(): void {
    if (this.pagination.page > 1) {
      this.pagination.page--;
      this.loadLogs();
    }
  }

  nextPage(): void {
    if (this.pagination.page < this.pagination.pages) {
      this.pagination.page++;
      this.loadLogs();
    }
  }

  startEdit(action: Action): void {
    this.editForm = { ...action };
  }

  cancelEdit(): void {
    this.editForm = {};
  }

  saveEdit(): void {
    if (!this.editForm._id) return;

    const payload: Partial<Action> = { ...this.editForm };
    delete (payload as any)._id;

    this.actionTracker.updateAction(this.editForm._id, payload).subscribe({
      next: () => {
        alert('Action updated');
        this.editForm = {};
        this.loadLogs();
      },
      error: (error) => {
        console.error('Error updating action:', error);
        alert('Error updating action');
      }
    });
  }

  deleteAction(action: Action): void {
    if (!action._id) return;
    
    if (confirm('Are you sure you want to delete this action?')) {
      this.actionTracker.deleteAction(action._id).subscribe({
        next: () => {
          this.loadLogs();
        },
        error: (error) => {
          console.error('Error deleting action:', error);
          alert('Error deleting action');
        }
      });
    }
  }

  clearAllLogs(): void {
    const confirmed = confirm(
      'Are you sure you want to delete ALL logs from the database? This action cannot be undone!'
    );
    
    if (confirmed) {
      this.loading = true;
      this.actionTracker.deleteAllActions().subscribe({
        next: (response) => {
          alert(`Successfully deleted ${response.deletedCount} logs from the database.`);
          this.loadLogs(); // Refresh the list
        },
        error: (error) => {
          console.error('Error clearing all logs:', error);
          alert('Error clearing all logs. Please try again.');
          this.loading = false;
        }
      });
    }
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }

  getBillingSummary(): void {
    if (!this.billingFilters.companyId || !this.billingFilters.fromDate || !this.billingFilters.toDate) {
      this.billingError = 'Please fill in all fields: Company ID, From Date, and To Date';
      return;
    }

    // Convert date strings to Unix timestamps (milliseconds)
    const fromDate = new Date(this.billingFilters.fromDate).getTime();
    const toDate = new Date(this.billingFilters.toDate).getTime();

    // Validate dates
    if (isNaN(fromDate) || isNaN(toDate)) {
      this.billingError = 'Invalid date format';
      return;
    }

    if (fromDate >= toDate) {
      this.billingError = 'From Date must be before To Date';
      return;
    }

    // Set end of day for toDate
    const toDateEndOfDay = new Date(this.billingFilters.toDate);
    toDateEndOfDay.setHours(23, 59, 59, 999);
    const toDateTimestamp = toDateEndOfDay.getTime();

    this.billingLoading = true;
    this.billingError = null;
    this.billingSummary = null;

    // Filter logs by company ID and date range
    this.filters.companyId = this.billingFilters.companyId;
    this.dateRangeFilters.fromDate = fromDate;
    this.dateRangeFilters.toDate = toDateTimestamp;
    this.pagination.page = 1; // Reset to first page

    // Use aggregation pipeline directly
    this.fetchBillingSummary(fromDate, toDateTimestamp);
  }

  private fetchBillingSummary(fromDate: number, toDate: number): void {
    this.actionTracker.getActions({
      companyId: this.billingFilters.companyId,
      fromDate,
      toDate,
      aggregate: true,
      groupBy: 'companyId',
      sum: 'count'
    }).subscribe({
      next: (response) => {
        // Type guard: check if it's BillingSummaryResponse (aggregation result)
        if (response.success && 'data' in response && !('pagination' in response)) {
          // It's BillingSummaryResponse from aggregation pipeline
          const billingResponse = response as BillingSummaryResponse;
          // Handle both single and array responses - logs component expects single
          if (Array.isArray(billingResponse.data)) {
            // If array, take first item (shouldn't happen in logs since companyId is required)
            this.billingSummary = billingResponse.data.length > 0 ? billingResponse.data[0] : null;
          } else {
            this.billingSummary = billingResponse.data;
          }
          // Reload logs with the company ID and date range filters applied
          this.loadLogs();
        } else {
          this.billingError = 'No data found for the specified criteria';
        }
        this.billingLoading = false;
      },
      error: (error) => {
        console.error('Error getting billing summary:', error);
        this.billingError = error.error?.error || error.message || 'Failed to get billing summary';
        this.billingLoading = false;
      }
    });
  }

  goBack(): void {
    if (this.companyId) {
      this.router.navigate(['/company', this.companyId, 'admin'], { replaceUrl: true });
    } else {
      this.router.navigate(['/dashboard'], { replaceUrl: true });
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}

