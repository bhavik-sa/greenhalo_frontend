import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { environment } from 'src/environments/environment';

interface User {
  _id: string;
  email: string;
  status: string;
  subscription: string;
  badges: any[];
  refered_by: string[];
  role: string;
  mfa: {
    enabled: boolean;
  };
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

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
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

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.fetchUsers();
  }

  fetchUsers(): void {
    this.isLoading = true;
    this.error = null;
    
    // Get token from local storage
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      this.error = 'Authentication required. Please log in.';
      this.isLoading = false;
      this.router.navigate(['/login']);
      return;
    }
    
    // Set headers with the token
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    this.http.get<ApiResponse>(`${environment.apiUrl}/admin/users`, { headers })
      .subscribe({
        next: (response) => {
          this.users = response.data.results;
          this.statistics = response.data.statistics;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error fetching users:', err);
          if (err.status === 401 || err.status === 403 || err.status === 406) {
            // Token is invalid, expired, or unauthorized
            this.error = err.error?.message || 'Your session has expired. Please log in again.';
            // Clear the invalid/expired token
            localStorage.removeItem('auth_token');
            // Redirect to login page with a return URL
            this.router.navigate(['/login'], {
              queryParams: { returnUrl: this.router.url }
            });
          } else {
            // Handle other types of errors
            this.error = err.error?.message || 'Failed to load user data. Please try again later.';
            
            // If it's a 5xx server error, show a more specific message
            if (err.status >= 500) {
              this.error = 'Server error. Please try again later.';
            }
          }
          this.isLoading = false;
        }
      });
  }

  get filteredUsers(): User[] {
    if (!this.searchQuery) {
      return this.users;
    }
    
    const query = this.searchQuery.toLowerCase();
    return this.users.filter(user => 
      user.email.toLowerCase().includes(query) ||
      user.status.toLowerCase().includes(query) ||
      user.subscription.toLowerCase().includes(query)
    );
  }

  get paginatedUsers(): User[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredUsers.slice(startIndex, startIndex + this.itemsPerPage);
  }

  onPageChange(page: number): void {
    this.currentPage = page;
  }

  get totalPages(): number {
    return Math.ceil(this.filteredUsers.length / this.itemsPerPage);
  }
}
