// user-management.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe, NgClass, NgFor, NgIf, SlicePipe } from '@angular/common';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ToastService } from 'src/app/shared/toast.service';

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
  users: User[] = [];
  statistics = {
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0
  };
  isLoading = true;
  error: string | null = null;
  currentPage = 1;
  itemsPerPage = 10;
  searchQuery = '';
  selectedUser: UserDetails | null = null;
  showUserModal = false;
  showEditModal = false;
  isLoadingUserDetails = false;
  userDetailsError: string | null = null;

  readonly subscriptionOptions = ['FREE', 'PAID'];
  readonly statusOptions = ['ACTIVE', 'INACTIVE'];
  readonly roleOptions = ['ADMIN', 'USER', 'MODERATOR'];
  private readonly toast = inject(ToastService);

  editUserForm: FormGroup;

  constructor(
    private http: HttpClient,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.editUserForm = this.fb.group({
      status: [''],
      subscription: [''] // Add subscription field to the form group
    });
  }

  ngOnInit(): void {
    this.fetchUsers();
  }

  // Pagination methods
  getPageNumbers(): number[] {
    const totalPages = this.getTotalPages();
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  getTotalPages(): number {
    return Math.ceil(this.statistics.totalUsers / this.itemsPerPage);
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.getTotalPages()) {
      this.currentPage = page;
      this.fetchUsers();
    }
  }

  // Open edit modal with user data
  openEditModal(user: User): void {
    this.selectedUser = user as UserDetails;
    this.editUserForm.patchValue({
      status: user.status,
      subscription: user.subscription,
      // Add other form fields here as needed
    });
    this.showEditModal = true;
  }

  updateUser(): void {
    if (this.editUserForm.valid && this.selectedUser) {
      const updatedData = this.editUserForm.value;
      // Add your update logic here
      const token = localStorage.getItem('auth_token');
      if (!token) {
        this.router.navigate(['/login']);
        return;
      }

      this.isLoadingUserDetails = true;
      this.userDetailsError = null;

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      this.http.put<any>(
        `http://localhost:8000/admin/update/${this.selectedUser._id}`,
        updatedData,
        { headers }
      ).subscribe({
        next: (response) => {
          this.toast.success(response.message);
          this.closeEditModal();
          this.fetchUsers();
          this.isLoadingUserDetails = false;
        },
        error: (err) => {
          console.error('Error updating user:', err);
          this.userDetailsError = err.error?.message || 'Failed to update user';
          this.isLoadingUserDetails = false;
        }
      });
    }
  }



  // User data methods
  fetchUsers(): void {
    this.isLoading = true;
    this.error = null;

    const token = localStorage.getItem('auth_token');

    if (!token) {
      this.handleAuthError();
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.get<ApiResponse>('http://localhost:8000/admin/users', {
      headers,
      params: {
        page: this.currentPage.toString(),
        limit: this.itemsPerPage.toString()
      }
    }).subscribe({
      next: (response) => {
        this.users = response.data.results;
        this.statistics = response.data.statistics;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching users:', err);
        this.handleApiError(err);
      }
    });
  }

  // Update the viewUserDetails method to handle both string and User object
  viewUserDetails(userOrId: string | User): void {
    // If a user object is passed, use it directly
    if (typeof userOrId !== 'string') {
      this.selectedUser = userOrId;
      this.showUserModal = true;
      return;
    }

    // If an ID is passed, fetch the user details
    const userId = userOrId;
    this.isLoadingUserDetails = true;
    this.userDetailsError = null;
    this.selectedUser = null;
    this.showUserModal = true;

    const token = localStorage.getItem('auth_token');
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    this.http.get<{ status: number; data: UserDetails }>(
      `http://localhost:8000/admin/users?userId=${userId}`,
      { headers }
    ).subscribe({
      next: (response) => {
        this.selectedUser = response.data;
        this.isLoadingUserDetails = false;
      },
      error: (err) => {
        console.error('Error fetching user details:', err);
        this.userDetailsError = err.error?.message || 'Failed to load user details';
        this.isLoadingUserDetails = false;
      }
    });
  }

  closeUserModal(): void {
    this.showUserModal = false;
    this.selectedUser = null;
    this.userDetailsError = null;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedUser = null;
  }

  // Search functionality
  get filteredUsers(): User[] {
    if (!this.searchQuery.trim()) {
      return this.users;
    }
    const query = this.searchQuery.toLowerCase().trim();
    return this.users.filter(user =>
      user.email.toLowerCase().includes(query) ||
      (user.role?.toLowerCase() || '').includes(query) ||
      user.status.toLowerCase().includes(query) ||
      (user.subscription?.toLowerCase() || '').includes(query)
    );
  }

  // Helper methods
  private handleAuthError(): void {
    this.error = 'Authentication required. Please log in.';
    this.isLoading = false;
    this.router.navigate(['/login']);
  }

  private handleApiError(err: any): void {
    if (err.status === 401 || err.status === 403 || err.status === 406) {
      this.error = err.error?.message || 'Your session has expired. Please log in again.';
      localStorage.removeItem('auth_token');
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url }
      });
    } else {
      this.error = err.error?.message || 'Failed to load user data. Please try again later.';
      if (err.status >= 500) {
        this.error = 'Server error. Please try again later.';
      }
    }
    this.isLoading = false;
  }

  // Format date for display
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}