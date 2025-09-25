// contact-us.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ToastService } from 'src/app/shared/toast.service';

interface User {
  _id: string;
  email: string;
}

interface ContactRequest {
  _id: string;
  user_id: User;
  subject: string;
  message: string;
  status: 'OPEN' | 'RESOLVED';
  admin_response?: string;
  admin_id?: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface ContactListResponse {
  status: number;
  data: {
    results: ContactRequest[];
    total: number;
    limit: number;
    page: number;
    pages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  message: string;
}

@Component({
  selector: 'app-contact-us',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './contact-us.html',
  styleUrls: ['./contact-us.css']
})
export class ContactUsComponent implements OnInit {
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  contactRequests: ContactRequest[] = [];
  selectedRequest: ContactRequest | null = null;
  showResponseModal = false;
  isLoading = true;
  error: string | null = null;
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;
  totalPages = 1;
  showDetailsModal = false;
  selectedRequestDetails: any = null;

  // Response form
  responseForm = {
    response: '',
    status: 'RESOLVED' as 'OPEN'  | 'RESOLVED'
  };

  readonly statusOptions = ['OPEN', 'RESOLVED'];

  ngOnInit(): void {
    this.fetchContactRequests();
  }

  fetchContactRequests(): void {
    this.isLoading = true;
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      // Handle unauthenticated state
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const params = {
      page: this.currentPage.toString(),
      limit: this.itemsPerPage.toString()
    };

    this.http.get<ContactListResponse>('http://localhost:8000/admin/contact-request', { headers, params })
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (response) => {
          this.contactRequests = response.data.results;
          this.totalItems = response.data.total;
          this.totalPages = response.data.pages;
        },
        error: (err) => {
          console.error('Error fetching contact requests:', err);
          this.error = err.error?.message || 'Failed to load contact requests';
          this.toast.error(this.error as string);
        }
      });
  }

  viewRequestDetails(request: ContactRequest): void {
    this.isLoading = true;
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      this.toast.error('Authentication required');
      return;
    }
  
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  
    this.http.get<any>(
      `http://localhost:8000/admin/contact-request?contactId=${request._id}`,
      { headers }
    )
    .pipe(finalize(() => this.isLoading = false))
    .subscribe({
      next: (response) => {
        this.selectedRequestDetails = response.data;
        this.showDetailsModal = true;
      },
      error: (err) => {
        console.error('Error fetching request details:', err);
        this.toast.error(err.error?.message || 'Failed to load request details');
      }
    });
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedRequestDetails = null;
  }

  openResponseModal(request: ContactRequest): void {
    this.selectedRequest = request;
    this.responseForm = {
      response: request.admin_response || '',
      status: request.status
    };
    this.showResponseModal = true;
  }

  closeResponseModal(): void {
    this.showResponseModal = false;
    this.selectedRequest = null;
  }

  submitResponse(): void {
    if (!this.selectedRequest || !this.responseForm.response) {
      this.toast.error('Response is required');
      return;
    }

    this.isLoading = true;
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      this.toast.error('Authentication required');
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.put(
      `http://localhost:8000/admin/contact-request/respond/${this.selectedRequest._id}`,
      this.responseForm,
      { headers }
    )
    .pipe(finalize(() => this.isLoading = false))
    .subscribe({
      next: () => {
        this.toast.success('Response submitted successfully');
        this.closeResponseModal();
        this.fetchContactRequests();
      },
      error: (err) => {
        console.error('Error submitting response:', err);
        this.toast.error(err.error?.message || 'Failed to submit response');
      }
    });
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'RESOLVED':
        return 'badge bg-success';
      case 'OPEN':
        return 'badge bg-warning text-dark';
      default:
        return 'badge bg-light text-dark';
    }
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.fetchContactRequests();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  getPaginationArray(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }
}