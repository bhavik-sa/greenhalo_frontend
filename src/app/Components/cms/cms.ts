import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastService } from 'src/app/shared/toast.service';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

interface CmsPage {
  _id: string;
  page_name: string;
  content: string;
  status: 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED';
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface CmsListResponse {
  status: number;
  data: {
    results: CmsPage[];
    pagination: {
      totalPages: number;
      currentPage: number;
      totalItems: number;
    };
  };
}

interface CmsSingleResponse {
  status: number;
  data: CmsPage;
}

@Component({
  selector: 'app-cms',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ReactiveFormsModule, 
    RouterModule
  ],
  templateUrl: './cms.html',
  styleUrls: ['./cms.css']
})
export class CmsComponent implements OnInit {
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  cmsPages: CmsPage[] = [];
  showFilters = false;
  filterForm!: FormGroup;  // Add definite assignment assertion
  
  // Status options for the filter dropdown
  filters = {
    search: '',
    status: '',
    startDate: '',
    endDate: ''
  };
  selectedPage: CmsPage | null = null;
  showEditModal = false;
  showViewModal = false;
  showDeleteModal = false;
  showCreateModal = false;
  isLoading = true;
  error: string | null = null;
  currentPage = 1;
  itemsPerPage = 10;
  searchQuery = '';
  totalItems = 0;
  totalPages = 1;
  pageSizes = [5, 10, 20, 50];
  pageToDelete: string | null = null;
  readonly statusOptions = ['DRAFT', 'PUBLISHED', 'UNPUBLISHED'];

  // Date picker config
  datePickerConfig = {
    dateInputFormat: 'YYYY-MM-DD',
    containerClass: 'theme-dark-blue',
    maxDate: new Date()
  };

  editForm = {
    page_name: '',
    content: '',
    status: 'DRAFT' as 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED'
  };

  createForm = {
    page_name: '',
    content: '',
    status: 'DRAFT' as 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED'
  };

  ngOnInit(): void {
    this.initFilterForm();
    this.fetchCmsPages();
  }

  private initFilterForm(): void {
    this.filterForm = this.fb.group({
      search: [this.filters.search],
      status: [this.filters.status],
      startDate: [this.filters.startDate],
      endDate: [this.filters.endDate]
    });
  }

  fetchCmsPages(): void {
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

    const filterValues = this.filterForm.value;
    
    // Update filters object
    this.filters = {
      search: filterValues.search || '',
      status: filterValues.status || '',
      startDate: filterValues.startDate || '',
      endDate: filterValues.endDate || ''
    };

    let params = new HttpParams()
      .set('page', this.currentPage.toString())
      .set('limit', this.itemsPerPage.toString());

    // Apply filters
    if (this.filters.search) {
      params = params.set('search', this.filters.search.trim());
    }
    if (this.filters.status) {
      params = params.set('status', this.filters.status);
    }
    if (this.filters.startDate) {
      params = params.set('startDate', new Date(this.filters.startDate).toISOString());
    }
    if (this.filters.endDate) {
      // Set end of day for end date
      const endDate = new Date(this.filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      params = params.set('endDate', endDate.toISOString());
    }

    this.http.get<CmsListResponse>(`${environment.apiUrl}/admin/cms-page`, { headers, params })
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (response) => {
          this.cmsPages = response.data.results;
          this.totalItems = response.data.pagination.totalItems;
          this.totalPages = response.data.pagination.totalPages;
        },
        error: (response) => {
          console.error('Error fetching CMS pages:', response);
          this.error = response.error?.message || 'Failed to load CMS pages';
          this.toast.error(this.error || 'Failed to load CMS pages');
        }
      });
  }

  fetchCmsPageById(pageId: string): void {
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

    this.http.get<CmsSingleResponse>(`${environment.apiUrl}/admin/cms-page?pageId=${pageId}`, { headers })
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (response) => {
          this.selectedPage = response.data;
          this.showViewModal = true;
        },
        error: (response) => {
          console.error('Error fetching CMS page:', response);
          this.toast.error(response.error?.message || 'Failed to load CMS page');
          this.router.navigate(['/cms']);
        }
      });
  }

  openEditModal(page: CmsPage): void {
    this.selectedPage = page;
    this.editForm = {
      page_name: page.page_name,
      content: page.content,
      status: page.status
    };
    this.showEditModal = true;
  }

  viewPageDetails(page: CmsPage): void {
    this.fetchCmsPageById(page._id);
  }

  updatePage(): void {
    if (!this.selectedPage) return;

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

    this.http.put(
      `${environment.apiUrl}/admin/cms-page/${this.selectedPage._id}`,
      this.editForm,
      { headers }
    )
    .pipe(finalize(() => this.isLoading = false))
    .subscribe({
      next: (response: any) => {
        this.toast.success(response.message || 'Page updated successfully');
        this.showEditModal = false;
        this.fetchCmsPages();
      },
      error: (response) => {
        console.error('Error updating page:', response);
        this.toast.error(response.error?.message || 'Failed to update page');
      }
    });
  }

  confirmDelete(page: CmsPage): void {
    this.selectedPage = page;
    this.pageToDelete = page._id;
    this.showDeleteModal = true;
  }

  deletePage(): void {
    if (!this.pageToDelete) return;
    
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
      `${environment.apiUrl}/admin/cms-page/${this.pageToDelete}`,
      { headers }
    )
    .pipe(finalize(() => {
      this.isLoading = false;
      this.showDeleteModal = false;
      this.pageToDelete = null;
    }))
    .subscribe({
      next: (response: any) => {
        this.toast.success(response.message || 'Page deleted successfully');
        this.fetchCmsPages();
      },
      error: (response) => {
        console.error('Error deleting page:', response);
        this.toast.error(response.error?.message || 'Failed to delete page');
      }
    });
  }

  // Toggle filter section visibility
  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  // Apply filters and refresh the data
  applyFilters(): void {
    this.currentPage = 1;
    this.fetchCmsPages();
  }

  // Reset all filters to their default values
  resetFilters(): void {
    this.filters = {
      search: '',
      status: '',
      startDate: '',
      endDate: ''
    };
    this.initFilterForm();
    this.applyFilters();
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
  
  // Handle items per page change
  onItemsPerPageChange(): void {
    this.currentPage = 1;
    this.fetchCmsPages();
  }
  
  // Handle page change
  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.fetchCmsPages();
      // Scroll to top of the table
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Get pagination array for display
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

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedPage = null;
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.selectedPage = null;
    this.router.navigate(['/cms']);
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.pageToDelete = null;
    this.selectedPage = null;
  }

  openCreateModal(): void {
    this.createForm = {
      page_name: '',
      content: '',
      status: 'DRAFT'
    };
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  createPage(): void {
    if (!this.createForm.page_name || !this.createForm.content) {
      this.toast.error('Page name and content are required');
      return;
    }

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

    this.http.post<CmsSingleResponse>(
      `${environment.apiUrl}/admin/cms-page`,
      this.createForm,
      { headers }
    )
    .pipe(finalize(() => this.isLoading = false))
    .subscribe({
      next: (response) => {
        this.toast.success('Page created successfully');
        this.showCreateModal = false;
        this.fetchCmsPages();
      },
      error: (response) => {
        console.error('Error creating page:', response);
        this.toast.error(response.error?.message || 'Failed to create page');
      }
    });
  }

  // Helper to get status badge class
  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'PUBLISHED':
        return 'badge bg-success';
      case 'DRAFT':
        return 'badge bg-warning text-dark';
      case 'ARCHIVED':
        return 'badge bg-secondary';
      default:
        return 'badge bg-light text-dark';
    }
  }

  formatDate(dateString: string | undefined | null): string {
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

