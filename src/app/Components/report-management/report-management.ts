import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { HttpClient, HttpClientModule, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ToastService } from 'src/app/shared/toast.service';

interface Report {
  _id: string;
  reporter_user_id: {
    _id: string;
    email: string;
    username?: string;
  };
  reported_user_id: {
    _id: string;
    email: string;
    username?: string;
  };
  description: string;
  status: 'PENDING' | 'RESOLVED' | 'WARNED' | 'BLOCKED';
  admin_comment?: string;
  report_type?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiResponse {
  status: number;
  data: {
    results: Report[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
  message: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Component({
  selector: 'app-report-management',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ReactiveFormsModule,
    HttpClientModule,
    DatePipe
  ],
  providers: [DatePipe],
  templateUrl: './report-management.html',
  styleUrls: ['./report-management.css']
})
export class ReportManagementComponent implements OnInit {
  reports: Report[] = [];
  selectedReport: Report | null = null;
  pagination: Pagination = {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1
  };
  loading = false;
  error: string | null = null;
  showModal = false;
  showFilters = false; // Control filter section visibility
  updateForm = {
    status: 'PENDING',
    admin_comment: ''
  };
  statusOptions = ['PENDING', 'RESOLVED', 'WARNED', 'BLOCKED'];
  filterForm: FormGroup;
  itemsPerPage = 10;
  
  // Pagination controls
  maxVisiblePages = 5; // Maximum number of page numbers to show in pagination
  pageSizes: number[] = [5, 10, 20, 50]; // Available page size options
  currentPage: number = 1;
  totalItems: number = 0;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private datePipe: DatePipe,
    private toastService: ToastService
  ) {
    this.filterForm = this.fb.group({
      search: [''],
      status: [''],
      startDate: [''],
      endDate: ['']
    });
  }

  // Toggle filter section visibility
  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  ngOnInit(): void {
    this.loadReports();
  }

  // Helper to access Math in template
  get Math() {
    return Math;
  }

  private getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    };
  }

  getPageNumbers(): (number | string)[] {
    const pages: (number | string)[] = [];
    const totalPages = this.totalPages;
    
    if (totalPages <= 1) {
      return [1];
    }
    
    // Always show first page
    pages.push(1);
    
    // Calculate start and end page numbers
    let startPage = Math.max(2, this.currentPage - 1);
    let endPage = Math.min(totalPages - 1, this.currentPage + 1);
    
    // Adjust if we're near the start or end
    if (this.currentPage <= 3) {
      endPage = Math.min(4, totalPages - 1);
    }
    
    if (this.currentPage >= totalPages - 2) {
      startPage = Math.max(2, totalPages - 3);
    }
    
    // Add ellipsis if needed after first page
    if (startPage > 2) {
      pages.push('...');
    }
    
    // Add middle pages
    for (let i = startPage; i <= endPage; i++) {
      if (i > 1 && i < totalPages) {
        pages.push(i);
      }
    }
    
    // Add ellipsis if needed before last page
    if (endPage < totalPages - 1) {
      pages.push('...');
    }
    
    // Always show last page if there is more than one page
    if (totalPages > 1) {
      pages.push(totalPages);
    }
    
    return pages;
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  onPageChange(page: number | string): void {
    const pageNumber = this.toNumber(page);
    if (pageNumber === null) return;
    
    if (pageNumber >= 1 && pageNumber <= this.totalPages) {
      this.currentPage = pageNumber;
      this.loadReports(pageNumber);
      // Scroll to top of the table
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  onItemsPerPageChange(): void {
    this.currentPage = 1;
    this.loadReports(1);
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadReports();
  }

  resetFilters(): void {
    this.filterForm.reset({
      search: '',
      status: '',
      startDate: '',
      endDate: ''
    });
    this.applyFilters();
  }

  loadReports(page: number = 1): void {
    this.loading = true;
    this.error = null;
    
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', this.itemsPerPage.toString());
    
    const formValue = this.filterForm.value;
    
    if (formValue.search) {
      params = params.set('search', formValue.search);
    }
    
    if (formValue.status) {
      params = params.set('status', formValue.status);
    }
    
    if (formValue.startDate) {
      params = params.set('startDate', formValue.startDate);
    }
    
    if (formValue.endDate) {
      params = params.set('endDate', formValue.endDate);
    }
    
    this.http.get<ApiResponse>(`${environment.apiUrl}/admin/report`, { 
      params,
      headers: this.getAuthHeaders() 
    }).subscribe({
      next: (response) => {
        this.reports = response.data.results;
        this.totalItems = response.data.pagination.total;
        this.currentPage = response.data.pagination.page;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading reports:', error);
        this.error = 'Failed to load reports. Please try again.';
        this.loading = false;
      }
    });
  }

  viewReport(report: Report): void {
    this.selectedReport = report;
    this.updateForm = {
      status: report.status,
      admin_comment: report.admin_comment || ''
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedReport = null;
  }

  updateReport(): void {
    if (!this.selectedReport) return;
    
    this.loading = true;
    const updateUrl = `${environment.apiUrl}/admin/report/${this.selectedReport._id}`;
    
    this.http.patch<ApiResponse>(
      updateUrl,
      this.updateForm,
      { headers: this.getAuthHeaders() }
    ).subscribe({
      next: (response: ApiResponse) => {
        // Update the report in the list
        this.loadReports(this.currentPage);
        this.closeModal();
        this.toastService.success(response.message);
        this.loading = false;
      },
      error: (response) => {
        console.error('Error updating report:', response);
        this.error = 'Failed to update report. Please try again.';
        console.log(response);
        this.toastService.error(response.error.message || 'Failed to update report. Please try again.');
        this.loading = false;
      }
    });
  }

  getReportById(reportId: string): void {
    if (!reportId) return;
    
    this.loading = true;
    const url = `${environment.apiUrl}/admin/report?reportId=${reportId}`;
    
    this.http.get<{status: number; data: Report}>(url, 
      { headers: this.getAuthHeaders() }
    ).subscribe({
      next: (response) => {
        this.selectedReport = response.data;
        this.updateForm = {
          status: response.data.status,
          admin_comment: response.data.admin_comment || ''
        };
        this.showModal = true;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error fetching report details:', error);
        this.error = 'Failed to fetch report details. Please try again.';
        this.loading = false;
      }
    });
  }

  // Convert page number to number safely
  private toNumber(value: any): number | null {
    const num = Number(value);
    return isNaN(num) ? null : num;
  }
}
