import { Component, inject, OnInit } from '@angular/core';
import { environment } from '../../../environments/environment';
import { CommonModule, DatePipe, NgClass, NgFor, NgIf, SlicePipe } from '@angular/common';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ToastService } from 'src/app/shared/toast.service';
import { FileSizePipe } from 'src/app/shared/pipes/file-size.pipe';

// badge.interface.ts
export interface MediaItem {
  url: string;
  original_name: string;
  size: number;
  mime_type: string;
}

export interface Badge {
  _id: string;
  title: string;
  icon_url: string;
  html_content: string;
  status: boolean;
  type?: string;
  safer_dating_media?: MediaItem[];
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface BadgeListResponse {
  status: number;
  data: {
    results: Badge[];
    totalPages: number;
    currentPage: number;
    totalItems: number;
  };
}

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ReactiveFormsModule,
    FileSizePipe
  ],
  templateUrl: './badge.html',
  styleUrls: ['./badge.css']
})
export class BadgeManagementComponent implements OnInit {
  Math = Math;
  apiUrl = environment.apiUrl;
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  router = inject(Router);
  private route = inject(ActivatedRoute);
  badges: Badge[] = [];
  selectedBadge: Badge | null = null;
  showBadgeModal = false;
  isLoadingBadgeDetails = false;
  showDeleteModal = false;
  isLoading = true;
  error: string | null = null;
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;
  totalPages = 1;
  pageSizes = [5, 10, 20, 50];
  badgeToDelete: string | null = null;

  // Filters
  showFilters = false;
  filterForm: FormGroup;
  
  // Status options for the filter dropdown
  readonly statusOptions = ['ACTIVE', 'INACTIVE'];
  
  // Date picker config
  datePickerConfig = {
    dateInputFormat: 'YYYY-MM-DD',
    containerClass: 'theme-dark-blue',
    maxDate: new Date()
  };

  private fb = inject(FormBuilder);

  constructor() {
    // Initialize filter form
    this.filterForm = this.fb.group({
      search: [''],
      status: [''],
      startDate: [''],
      endDate: ['']
    });
  }

  // Handle items per page change
  onItemsPerPageChange(): void {
    this.currentPage = 1;
    this.fetchBadges();
  }

  // Copy text to clipboard utility
  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.toast.success('Copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      this.toast.error('Failed to copy to clipboard');
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['badgeId']) {
        this.fetchBadgeById(params['badgeId']);
      } else {
        this.fetchBadges();
      }
    });
  }


  viewBadge(badgeId: string): void {
    this.fetchBadgeById(badgeId);
  }

  fetchBadges(): void {
    this.isLoading = true;
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    const filterValues = this.filterForm.value;
    let params = new HttpParams()
      .set('page', this.currentPage.toString())
      .set('limit', this.itemsPerPage.toString());

    // Apply filters
    if (filterValues.search) {
      params = params.set('search', filterValues.search.trim());
    }
    if (filterValues.status) {
      params = params.set('status', filterValues.status === 'ACTIVE');
    }
    if (filterValues.startDate) {
      params = params.set('startDate', new Date(filterValues.startDate).toISOString());
    }
    if (filterValues.endDate) {
      // Set end of day for end date
      const endDate = new Date(filterValues.endDate);
      endDate.setHours(23, 59, 59, 999);
      params = params.set('endDate', endDate.toISOString());
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.get<BadgeListResponse>('http://localhost:8000/admin/badge', { headers, params })
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (response) => {
          this.badges = response.data.results;
          this.totalItems = response.data.totalItems;
          this.totalPages = response.data.totalPages;
        },
        error: (err) => {
          console.error('Error fetching badges:', err);
          this.error = err.error?.message || 'Failed to load badges';
          this.toast.error(this.error || 'Failed to load badges');
        }
      });
  }

  viewBadgeDetails(badgeId: string): void {
    this.isLoadingBadgeDetails = true;
    this.fetchBadgeById(badgeId);
  }

  private fetchBadgeById(badgeId: string): void {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      'Accept': 'application/json'
    });

    const params = new HttpParams().set('badgeId', badgeId);

    this.http.get<{ status: number; data: any }>('http://localhost:8000/admin/badge', { 
      headers,
      params,
      withCredentials: true
    })
    .pipe(finalize(() => this.isLoadingBadgeDetails = false))
    .subscribe({
      next: (response) => {
        if (response.data) {
          const badge = response.data;
          
          // Transform icon_url to include the base URL if it's a relative path
          if (badge.icon_url && !badge.icon_url.startsWith('http')) {
            badge.icon_url = this.getMediaUrl(badge.icon_url);
          }
          
          // Transform media URLs to include the base URL
          if (badge.safer_dating_media) {
            badge.safer_dating_media = badge.safer_dating_media.map((media: any) => ({
              ...media,
              url: this.getMediaUrl(media.url)
            }));
          }
          
          this.selectedBadge = badge;
          this.showBadgeModal = true;
        } else {
          this.toast.error('Badge not found');
        }
      },
      error: (err) => {
        console.error('Error fetching badge:', err);
        const errorMessage = err.error?.message || 'Failed to load badge details';
        this.toast.error(errorMessage);
      }
    });
  }

  getMediaUrl(relativeUrl: string): string {
    if (!relativeUrl) return '';
    // Remove any leading slashes to prevent double slashes
    const cleanUrl = relativeUrl.startsWith('/') ? relativeUrl.substring(1) : relativeUrl;
    // Return full URL with API base URL
    return `${this.apiUrl}/${cleanUrl}`;
  }

  confirmDelete(badge: Badge): void {
    this.selectedBadge = badge;
    this.badgeToDelete = badge._id;
    this.showDeleteModal = true;
  }

  deleteBadge(): void {
    if (!this.badgeToDelete) return;
    
    this.isLoading = true;
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.delete(
      `http://localhost:8000/admin/delete/badge/${this.badgeToDelete}`,
      { headers }
    )
    .pipe(finalize(() => {
      this.isLoading = false;
      this.showDeleteModal = false;
      this.badgeToDelete = null;
    }))
    .subscribe({
      next: (response: any) => {
        this.toast.success(response.message || 'Badge deleted successfully');
        this.fetchBadges();
      },
      error: (err) => {
        console.error('Error deleting badge:', err);
        this.toast.error(err.error?.message || 'Failed to delete badge');
      }
    });
  }

  // Toggle filter section
  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  // Apply filters and fetch badges
  applyFilters(): void {
    this.currentPage = 1;
    this.fetchBadges();
  }

  // Reset all filters
  resetFilters(): void {
    this.filterForm.reset({
      search: '',
      status: '',
      startDate: '',
      endDate: ''
    });
    this.applyFilters();
  }

  // Handle page change
  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.fetchBadges();
      // Scroll to top of the table
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Generate page numbers for pagination
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(startPage + maxVisiblePages - 1, this.totalPages);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }
  
  // Alias for getPageNumbers to maintain backward compatibility
  getPaginationArray(): number[] {
    return this.getPageNumbers();
  }

  // Update badge
  updateBadge(badgeId: string, badgeData: any): void {
    this.isLoading = true;
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    const formData = new FormData();
    
    // Append all fields from badgeData to formData
    Object.keys(badgeData).forEach(key => {
      if (badgeData[key] !== null && badgeData[key] !== undefined) {
        if (key === 'icon_url' || key === 'safer_dating_media_uri') {
          // Handle file uploads if needed
          if (badgeData[key] instanceof File) {
            formData.append(key, badgeData[key]);
          }
        } else if (key === 'status') {
          // Convert status to boolean if needed
          formData.append(key, badgeData[key] ? 'true' : 'false');
        } else {
          formData.append(key, badgeData[key]);
        }
      }
    });

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
      // Note: Don't set Content-Type for FormData, let the browser set it with the correct boundary
    });

    this.http.put(
      `http://localhost:8000/admin/update/badge/${badgeId}`,
      formData,
      { headers }
    )
    .pipe(finalize(() => this.isLoading = false))
    .subscribe({
      next: (response: any) => {
        this.toast.success(response.message || 'Badge updated successfully');
        this.fetchBadges();
        this.showBadgeModal = false;
      },
      error: (err) => {
        console.error('Error updating badge:', err);
        this.toast.error(err.error?.message || 'Failed to update badge');
      }
    });
  }

  // Toggle badge status
  toggleBadgeStatus(badge: Badge): void {
    if (!confirm(`Are you sure you want to ${badge.status ? 'deactivate' : 'activate'} this badge?`)) {
      return;
    }
    
    const updatedBadge = { ...badge, status: !badge.status };
    this.updateBadge(badge._id, { status: updatedBadge.status });
  }

  getStatusBadgeClass(status: boolean): string {
    return status ? 'badge bg-success' : 'badge bg-secondary';
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Invalid date';
    }
  }
}