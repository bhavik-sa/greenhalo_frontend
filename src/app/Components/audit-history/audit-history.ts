import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, DatePipe, NgClass, NgFor, NgIf, SlicePipe } from '@angular/common';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

declare const bootstrap: {
  Modal: new (element: HTMLElement) => {
    show: () => void;
    hide: () => void;
  };
};

// Interface for audit history items
export interface AuditHistory {
  _id: string;
  actor_id: {
    _id: string;
    email: string;
    username: string;
  };
  action: string;
  details: any;
  createdAt: string;
  __v: number;
}

// Interface for API response
interface ApiResponse {
  status: number;
  data: {
    results: AuditHistory[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

@Component({
  selector: 'app-audit-history',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    NgClass,
    NgFor,
    NgIf,
    SlicePipe,
    DatePipe
  ],
  templateUrl: './audit-history.html',
  styleUrls: ['./audit-history.css']
})
export class AuditHistoryComponent implements OnInit {
  // Audit history data
  auditLogs: AuditHistory[] = [];
  selectedLog: AuditHistory | null = null;
  
  // Component state
  isLoading = true;
  error: string | null = null;
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;
  totalPages = 1;
  showFilters = false;

  // Filter options
  filterForm: FormGroup;
  readonly actionOptions = ['LOGIN', 'CREATE', 'UPDATE', 'DELETE', 'EARN_BADGE'];

  @ViewChild('auditDetailsModal') auditDetailsModal?: ElementRef<HTMLElement>;
  private modalInstance: {
    show: () => void;
    hide: () => void;
  } | null = null;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder
  ) {
    // Initialize filter form
    this.filterForm = this.fb.group({
      search: [''],
      action: [''],
      startDate: [''],
      endDate: ['']
    });
  }

  ngOnInit(): void {
    this.fetchAuditLogs();
  }

  // Helper method to get headers with auth token
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Fetch audit logs with pagination and filters
  fetchAuditLogs(applyFilters: boolean = false): void {
    this.isLoading = true;
    this.error = null;
    
    let params = new HttpParams()
      .set('page', this.currentPage.toString())
      .set('limit', this.itemsPerPage.toString());

    if (applyFilters) {
      const formValue = this.filterForm.value;
      
      if (formValue.search) {
        params = params.set('search', formValue.search);
      }
      
      if (formValue.action) {
        params = params.set('action', formValue.action);
      }
      
      if (formValue.startDate) {
        params = params.set('startDate', new Date(formValue.startDate).toISOString());
      }
      
      if (formValue.endDate) {
        // Set end of day for end date
        const endDate = new Date(formValue.endDate);
        endDate.setHours(23, 59, 59, 999);
        params = params.set('endDate', endDate.toISOString());
      }
    }

    const headers = this.getHeaders();
    
    this.http.get<ApiResponse>(`${environment.apiUrl}/admin/audit-history`, { headers, params })
      .subscribe({
        next: (response) => {
          if (response.status === 200) {
            this.auditLogs = response.data.results;
            this.totalItems = response.data.pagination.total;
            this.totalPages = response.data.pagination.totalPages;
          } else {
            this.error = 'Failed to fetch audit logs';
          }
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error fetching audit logs:', err);
          this.error = 'Error fetching audit logs. Please try again.';
          this.isLoading = false;
        }
      });
  }

  // Toggle filters visibility
  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  // Reset all filters
  resetFilters(): void {
    this.filterForm.reset();
    this.currentPage = 1;
    this.fetchAuditLogs();
  }

  // Handle page change
  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.fetchAuditLogs(true);
  }

  // Handle items per page change
  onItemsPerPageChange(): void {
    this.currentPage = 1;
    this.fetchAuditLogs(true);
  }

  // Generate array of page numbers for pagination
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  // Get total number of pages
  getTotalPages(): number {
    return this.totalPages;
  }

  // Format date for display using DatePipe
  private datePipe = new DatePipe('en-US');
  
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return this.datePipe.transform(dateString, 'medium') || 'N/A';
  }

  // Get badge class based on action type
  getActionBadgeClass(action: string): string {
    switch (action) {
      case 'LOGIN':
        return 'bg-success';
      case 'CREATE':
        return 'bg-primary';
      case 'UPDATE':
        return 'bg-warning';
      case 'DELETE':
        return 'bg-danger';
      case 'EARN_BADGE':
        return 'bg-info';
      default:
        return 'bg-secondary';
    }
  }

  /**
   * Open modal to view log details
   * @param log The audit log entry to view
   */
  viewLogDetails(log: AuditHistory): void {
    this.selectedLog = log;
    if (this.auditDetailsModal?.nativeElement) {
      this.modalInstance = new bootstrap.Modal(this.auditDetailsModal.nativeElement);
      this.modalInstance.show();
    }
  }

  // Export logs to CSV
  exportToCsv(logs?: AuditHistory[]): void {
    const data = logs || this.auditLogs;
    if (!data || data.length === 0) {
      console.warn('No data to export');
      return;
    }

    // Extract headers from the first log item
    const headers = Object.keys(data[0]);
    
    // Create CSV content
    let csvContent = headers.join(',') + '\n';
    
    data.forEach(log => {
      const row = headers.map(header => {
        let value = log[header as keyof AuditHistory];
        // Handle nested objects and arrays
        if (value && typeof value === 'object') {
          value = JSON.stringify(value);
        }
        // Escape quotes and wrap in quotes
        return `"${String(value || '').replace(/"/g, '""')}"`;
      });
      csvContent += row.join(',') + '\n';
    });

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Format action text for display
  formatActionText(action: string): string {
    const actionMap: { [key: string]: string } = {
      'LOGIN': 'User logged in',
      'CREATE': 'Created a new record',
      'UPDATE': 'Updated a record',
      'DELETE': 'Deleted a record',
      'EARN_BADGE': 'Earned a badge',
    };
    return actionMap[action] || action.split('_').map(word => 
      word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ');
  }

  // Format details object for display with all log properties
  formatDetails(details: any): string {
    if (!details) return 'No details available';
    
    // If details is already a string, try to parse it as JSON
    if (typeof details === 'string') {
      try {
        details = JSON.parse(details);
      } catch (e) {
        return details; // Return as is if not JSON
      }
    }
    
    // If we have an object, format it nicely
    if (typeof details === 'object' && details !== null) {
      // Handle special cases for common log structures
      if (details.changes) {
        return this.formatChanges(details);
      }
      
      // Format the object with all its properties
      return Object.entries(details)
        .map(([key, value]) => {
          // Skip null/undefined values
          if (value === null || value === undefined) return '';
          
          // Format the value based on its type
          let formattedValue: string;
          if (typeof value === 'object') {
            formattedValue = JSON.stringify(value, null, 2);
          } else if (typeof value === 'boolean') {
            formattedValue = value ? 'Yes' : 'No';
          } else if (key.toLowerCase().includes('date') || key.toLowerCase().includes('time')) {
            formattedValue = new Date(String(value)).toLocaleString();
          } else {
            formattedValue = String(value);
          }
          
          return `${this.formatKey(key)}: ${formattedValue}`;
        })
        .filter(Boolean) // Remove empty strings
        .join('\n\n');
    }
    
    return String(details);
  }
  
  // Helper to format object keys to be more readable
  private formatKey(key: string): string {
    // Convert camelCase to Title Case
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
  
  // Special formatting for change logs
  private formatChanges(details: any): string {
    const changes = details.changes;
    if (!changes || typeof changes !== 'object') return JSON.stringify(details, null, 2);
    
    const result: string[] = [];
    
    // Handle different types of changes
    if (changes.added) {
      result.push('Added Fields:\n' + 
        Object.entries(changes.added)
          .map(([field, value]) => `  • ${field}: ${JSON.stringify(value)}`)
          .join('\n')
      );
    }
    
    if (changes.removed) {
      result.push('Removed Fields:\n' + 
        changes.removed
          .map((field: string) => `  • ${field}`)
          .join('\n')
      );
    }
    
    if (changes.updated) {
      result.push('Updated Fields:\n' + 
        Object.entries(changes.updated)
          .map(([field, value]: [string, any]) => 
            `  • ${field}: ${JSON.stringify(value.old)} → ${JSON.stringify(value.new)}`
          )
          .join('\n')
      );
    }
    
    // Add any additional properties that aren't in the standard changes object
    const otherProps = Object.entries(details)
      .filter(([key]) => !['changes', 'added', 'removed', 'updated'].includes(key))
      .map(([key, value]) => `${this.formatKey(key)}: ${JSON.stringify(value)}`);
    
    if (otherProps.length > 0) {
      result.push('Additional Information:\n  ' + otherProps.join('\n  '));
    }
    
    return result.join('\n\n');
  }

  // Copy text to clipboard
  async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      // You might want to add a toast notification here
      console.log('Copied to clipboard');
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  }

  // Get JSON string for raw view
  getJsonString(obj: any): string {
    return JSON.stringify(obj, null, 2);
  }

  // Close the details modal
  closeModal(): void {
    this.modalInstance?.hide();
  }
}
