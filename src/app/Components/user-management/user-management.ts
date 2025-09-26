// user-management.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, NgClass, NgFor, NgIf, SlicePipe } from '@angular/common';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ToastService } from 'src/app/shared/toast.service';

// Badge interface
export interface Badge {
  _id: string;
  title: string;
  icon_url: string;
  html_content: string;
  status: boolean;
  assigned?: boolean;
  safer_dating_media?: {
    url: string;
    original_name: string;
    size: number;
    mime_type: string;
  }[];
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface User {
  _id: string;
  email: string;
  status: string;
  subscription: string;
  badges: any[];
  refered_by: string[];
  mfa: {
    enabled: boolean;
  };
  role: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface ApiResponse {
  status: number;
  data: {
    results: User[];
    unassignedBadges: Badge[];
    assignedBadges: Badge[];
    statistics: {
      totalUsers: number;
      activeUsers: number;
      inactiveUsers: number;
    };
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

interface UserDetails {
  _id: string;
  email: string;
  status: string;
  subscription: string;
  badges: string[];
  refered_by: string[];
  role: string;
  mfa: {
    enabled: boolean;
  };
  createdAt: string;
  updatedAt: string;
  __v: number;
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    NgClass,
    NgFor,
    NgIf,
    SlicePipe
  ],
  templateUrl: './user-management.html',
  styleUrls: ['./user-management.css']
})
export class UserManagementComponent implements OnInit {
  // User data
  users: User[] = [];
  statistics = {
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0
  };
  
  // Component state
  isLoading = true;
  error: string | null = null;
  currentPage = 1;
  itemsPerPage = 10;
  searchQuery = '';
  selectedUser: UserDetails | null = null;
  showUserModal = false;
  showEditModal = false;
  showBadgeModal = false;
  showFilters = false;
  isLoadingUserDetails = false;
  userDetailsError: string | null = null;
  
  // Badge management
  badges: Badge[] = [];
  availableBadges: Badge[] = [];
  assignedBadges: Badge[] = [];
  userBadges: Badge[] = [];
  isBadgeLoading = false;
  isAssigning = false;
  currentBadgePage = 1;
  badgeItemsPerPage = 10;
  totalBadges = 0;
  badgeSearchQuery = '';
  selectedBadgeId: string | null = null;
  removeBadgeId: string | null = null;

  // Filter options
  filterForm: FormGroup;
  readonly subscriptionOptions = ['FREE', 'PAID'];
  readonly statusOptions = ['ACTIVE', 'INACTIVE'];
  
  // Date picker options
  datePickerConfig = {
    dateInputFormat: 'YYYY-MM-DD',
    containerClass: 'theme-dark-blue',
    maxDate: new Date()
  };

  editUserForm: FormGroup;
  
  constructor(
    private http: HttpClient,
    private router: Router,
    private fb: FormBuilder,
    private toastService: ToastService
  ) {
    this.editUserForm = this.fb.group({
      status: [''],
      subscription: ['']
    });

    // Initialize filter form
    this.filterForm = this.fb.group({
      status: [''],
      subscription: [''],
      search: [''],
      startDate: [''],
      endDate: ['']
    });
  }

  ngOnInit(): void {
    this.fetchUsers();
  }

  // Helper method to get headers with auth token
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Fetch users with pagination and filters
  fetchUsers(applyFilters: boolean = false): void {
    this.isLoading = true;
    
    let params = new HttpParams()
      .set('page', this.currentPage.toString())
      .set('limit', this.itemsPerPage.toString());

    if (applyFilters) {
      const formValue = this.filterForm.value;
      
      if (formValue.status) {
        params = params.set('status', formValue.status);
      }
      
      if (formValue.subscription) {
        params = params.set('subscription', formValue.subscription);
      }
      
      if (formValue.search) {
        params = params.set('search', formValue.search);
      }
      
      if (formValue.startDate) {
        params = params.set('startDate', new Date(formValue.startDate).toISOString());
      }
      
      if (formValue.endDate) {
        const endDate = new Date(formValue.endDate);
        endDate.setHours(23, 59, 59, 999);
        params = params.set('endDate', endDate.toISOString());
      }
    }

    this.http.get<ApiResponse>(`${environment.apiUrl}/admin/users`, { 
      headers: this.getHeaders(),
      params 
    }).subscribe({
      next: (response) => {
        this.users = response.data.results;
        this.statistics = response.data.statistics;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching users:', error);
        this.error = 'Failed to load users. Please try again.';
        this.isLoading = false;
      }
    });
  }

  // View user details
  viewUserDetails(user: User): void {
    this.selectedUser = user as unknown as UserDetails;
    this.showUserModal = true;
    this.isLoadingUserDetails = true;
    this.userDetailsError = null;
    
    this.http.get<{data: {user: UserDetails}}>(`${environment.apiUrl}/admin/users?userId=${user._id}`, {
      headers: this.getHeaders()
    }).subscribe({
      next: (response) => {
        this.selectedUser = response.data.user;
        // this.editUserForm.patchValue({
        //   status: this.selectedUser.status,
        //   subscription: this.selectedUser.subscription
        // });
        this.loadUserBadges();
        this.loadAvailableBadges();
        this.isLoadingUserDetails = false;
      },
      error: (error) => {
        console.error('Error loading user details:', error);
        this.userDetailsError = 'Failed to load user details';
        this.isLoadingUserDetails = false;
      }
    });
  }

  // Close user details modal
  closeUserModal(): void {
    this.showUserModal = false;
    this.selectedUser = null;
  }

  // Open edit user modal
  openEditModal(user: User): void {
    this.selectedUser = user as unknown as UserDetails;
    this.editUserForm.patchValue({
      status: user.status,
      subscription: user.subscription
    });
  
    // Load both user badges and available badges
    // this.loadUserBadges();
    this.loadAvailableBadges();
  
    this.showEditModal = true;
  }

  // Close edit user modal
  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedUser = null;
  }

  // Update user
  updateUser(): void {
    if (!this.selectedUser || !this.editUserForm.valid) return;
    
    const formData = {
      ...this.editUserForm.value,
      badge_assigned: true,  // Add badge_assigned flag
      badgeId: this.selectedBadgeId,
      removeBadgeId: this.removeBadgeId
    };
    
    this.http.put(
      `${environment.apiUrl}/admin/update/${this.selectedUser._id}`,
      formData,
      { headers: this.getHeaders() }
    ).subscribe({
      next: () => {
        // Update the user in the local array
        const index = this.users.findIndex(u => u._id === this.selectedUser?._id);
        if (index !== -1) {
          this.users[index] = { ...this.users[index], ...formData };
        }
        
        this.toastService.success('User updated successfully');
        this.closeEditModal();
      },
      error: (error) => {
        console.error('Error updating user:', error);
        this.toastService.error('Failed to update user');
      }
    });
  }

  // Toggle filter section
  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  // Reset all filters
  resetFilters(): void {
    this.filterForm.reset();
    this.currentPage = 1;
    this.fetchUsers(true);
  }

  // Get filtered users based on search query
  get filteredUsers(): User[] {
    if (!this.searchQuery) {
      return this.users;
    }
    const searchTerm = this.searchQuery.toLowerCase();
    return this.users.filter(user => 
      user.email.toLowerCase().includes(searchTerm) ||
      user._id.toLowerCase().includes(searchTerm)
    );
  }

  // Format date for display
  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Badge management methods
  openBadgeModal(user: User): void {
    if (!user) return;
    this.selectedUser = user as unknown as UserDetails;
    this.showBadgeModal = true;
    this.loadUserBadges();
  }



  loadAvailableBadges(): void {
    if (!this.selectedUser) return;
    
    const params = new HttpParams()
      .set('limit', '100')
      .set('userId', this.selectedUser._id);

    this.isBadgeLoading = true;
    this.http.get<{data: {unassignedBadges: Badge[], assignedBadges: Badge[]}, total: number}>(
      `${environment.apiUrl}/admin/users`,
      { headers: this.getHeaders(), params }
    ).subscribe({
      next: (response) => {
        this.availableBadges = response.data?.unassignedBadges || [];
        this.assignedBadges = response.data?.assignedBadges || [];
      },
      error: (error) => {
        console.error('Error loading available badges:', error);
        this.toastService.error('Failed to load available badges');
      }
    });
  }

  loadUserBadges(): void {
    if (!this.selectedUser) return;
    
    this.isBadgeLoading = true;
    const params = new HttpParams()
      .set('userId', this.selectedUser._id)
      .set('assigned', 'true')
      .set('limit', '100');
  
    this.http.get<any>(
      `${environment.apiUrl}/admin/users`,
      { headers: this.getHeaders(), params }
    ).subscribe({
      next: (response) => {
        if (response.data && response.data.assignedBadges) {
          this.userBadges = response.data.assignedBadges;
          this.totalBadges = response.data.totalItems || 0;
        } else {
          this.userBadges = [];
          this.totalBadges = 0;
        }
        this.isBadgeLoading = false;
      },
      error: (error) => {
        console.error('Error loading user badges:', error);
        this.toastService.error('Failed to load user badges');
        this.isBadgeLoading = false;
      }
    });
  }



  removeBadge(badgeId: string): void {
    if (!this.selectedUser) return;
    
    if (!confirm('Are you sure you want to remove this badge?')) {
      return;
    }
    
    this.http.post(
      `${environment.apiUrl}/admin/users`,
      { 
        userId: this.selectedUser._id, 
        removeBadgeId: badgeId,
        status: false 
      },
      { headers: this.getHeaders() }
    ).subscribe({
      next: (response) => {
          this.toastService.success('Badge removed successfully');
          this.loadUserBadges();
      },
      error: (error) => {
        console.error('Error removing badge:', error);
        this.toastService.error(error.error?.message || 'Failed to remove badge');
      }
    });
  }

  onBadgeSearch(): void {
    this.currentBadgePage = 1;
    this.loadUserBadges();
  }

  onBadgePageChange(page: number): void {
    this.currentBadgePage = page;
    this.loadUserBadges();
  }

  // Pagination methods
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    const totalPages = this.getTotalPages();
    
    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(startPage + maxVisiblePages - 1, totalPages);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  getTotalPages(): number {
    return Math.ceil(this.statistics.totalUsers / this.itemsPerPage);
  }

  // Handle page change
  onPageChange(page: number): void {
    if (page >= 1 && page <= this.getTotalPages()) {
      this.currentPage = page;
      this.fetchUsers(true);
      // Scroll to top of the table
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Handle items per page change
  onItemsPerPageChange(): void {
    this.currentPage = 1;
    this.fetchUsers(true);
  }
}
