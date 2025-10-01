import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders, HttpParams } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { environment } from 'src/environments/environment';
import { Chart, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

// Interface for Dashboard Statistics
interface DashboardStats {
  users: {
    total: number;
    active: number;
    growth: { month: string; count: number }[];
  };
  badges: {
    total: number;
    active: number;
    distribution: { id: string; title: string; userCount: number }[];
  };
  reports: {
    total: number;
    pending: number;
  };
  contactRequests: {
    total: number;
    pending: number;
  };
  recentContacts: any[];
  recentAuditLogs: any[];
}

// Interface for API Response
interface ApiResponse<T> {
  status: number;
  data: T;
}

// Interface for Chart Data
interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string | string[];
    borderColor?: string;
    borderWidth?: number;
  }[];
}

// User Interface
interface User {
  _id: string;
  email: string;
  status: string;
  subscription: string;
  // Add other user properties as needed
}

// Interface for Recent Activity
interface ActivityItem {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule, RouterModule, DatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit, AfterViewInit {
  // Dashboard Stats
  stats: DashboardStats = {
    users: {
      total: 0,
      active: 0,
      growth: []
    },
    badges: {
      total: 0,
      active: 0,
      distribution: []
    },
    reports: {
      total: 0,
      pending: 0
    },
    contactRequests: {
      total: 0,
      pending: 0
    },
    recentContacts: [],
    recentAuditLogs: []
  };

  // Chart instances
  private userGrowthChart: Chart | null = null;
  private badgeDistributionChart: Chart | null = null;

  // UI State
  isLoading = true;
  error: string | null = null;
  statistics = {
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0
  };
  currentPage = 1;
  itemsPerPage = 10;
  searchQuery = '';

  constructor(private http: HttpClient, private router: Router) { }

  ngOnInit(): void {
    this.loadDashboardData();
    this.loadRecentContacts();
    this.loadRecentAuditLogs();
  }

  ngAfterViewInit(): void {
    // Initialize charts after a small delay to ensure DOM is ready
    setTimeout(() => {
      try {
        this.initUserGrowthChart();
        this.initBadgeDistributionChart();
      } catch (error) {
        console.error('Error initializing charts:', error);
        this.error = 'Failed to initialize charts. Please refresh the page to try again.';
      }
    }, 300); // Slightly longer delay to ensure all data is loaded
  }

  // Load all dashboard data
  loadDashboardData(): void {
    this.fetchDashboardStats();
  }

  // Format date for display
  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  // Fetch dashboard statistics from API
  fetchDashboardStats(): void {
    this.isLoading = true;
    const token = localStorage.getItem('auth_token');

    if (!token) {
      this.handleAuthError();
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.get<ApiResponse<DashboardStats>>(
      `${environment.apiUrl}/admin/dashboard/details`,
      { headers }
    ).subscribe({
      next: (response) => {
        if (response.data) {
          console.log(this.stats.badges.distribution)
          this.stats = {
            ...response.data,
            recentContacts: this.stats.recentContacts,
            recentAuditLogs: this.stats.recentAuditLogs
          };
        }
        this.isLoading = false;
      },
      error: (err) => this.handleApiError(err)
    });
  }

  // Initialize user growth chart
  private initUserGrowthChart(): void {
    const canvas = document.getElementById('userGrowthChart') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Destroy previous chart instance if it exists
    if (this.userGrowthChart) {
      this.userGrowthChart.destroy();
    }

    // Check if we have growth data
    if (!this.stats.users.growth || this.stats.users.growth.length === 0) {
      console.warn('No user growth data available');
      return;
    }

    // Prepare data for the chart
    const labels = this.stats.users.growth.map(entry => this.formatDate(entry.month));
    const data = this.stats.users.growth.map(entry => entry.count);

    this.userGrowthChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'New Users',
          data: data,
          backgroundColor: 'rgba(60, 141, 188, 0.9)',
          borderColor: 'rgba(60, 141, 188, 0.8)',
          pointRadius: 3,
          pointBackgroundColor: '#3b8bba',
          pointBorderColor: 'rgba(60, 141, 188, 0.8)',
          pointHoverRadius: 5,
          pointHoverBackgroundColor: '#3b8bba',
          pointHoverBorderColor: 'rgba(60, 141, 188, 1)',
          pointHitRadius: 10,
          pointBorderWidth: 2,
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0,0,0,0.8)',
            titleFont: {
              size: 14
            },
            bodyFont: {
              size: 14
            },
            callbacks: {
              label: function (context) {
                return `New Users: ${context.raw}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              maxRotation: 45,
              minRotation: 45
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
            },
            grid: {
              color: 'rgba(0,0,0,0.05)'
            }
          }
        }
      }
    });
  }

  // Initialize badge distribution chart
  private initBadgeDistributionChart(): void {
    const canvas = document.getElementById('badgeDistributionChart') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Destroy previous chart instance if it exists
    if (this.badgeDistributionChart) {
      this.badgeDistributionChart.destroy();
    }

    // Check if we have badge distribution data
    if (!this.stats.badges.distribution || this.stats.badges.distribution.length === 0) {
      console.warn('No badge distribution data available');
      return;
    }

    // Sort badges by user count in descending order and take top 8
    const sortedBadges = [...this.stats.badges.distribution]
      .sort((a, b) => b.userCount - a.userCount)
      .slice(0, 8);

    // Prepare data for the chart
    const labels = sortedBadges.map(entry => entry.title);
    const data = sortedBadges.map(entry => entry.userCount);

    // Generate colors with enough contrast
    const backgroundColors = [
      '#f56954', '#00a65a', '#f39c12', '#00c0ef', '#3c8dbc',
      '#d2d6de', '#6c757d', '#17a2b8', '#28a745', '#ffc107',
      '#dc3545', '#6f42c1', '#e83e8c', '#20c997', '#fd7e14'
    ].slice(0, labels.length);

    this.badgeDistributionChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: backgroundColors,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              boxWidth: 12,
              padding: 15,
              font: {
                size: 12
              },
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0,0,0,0.8)',
            titleFont: {
              size: 14
            },
            bodyFont: {
              size: 14
            },
            callbacks: {
              label: function (context) {
                const label = context.label || '';
                const value = context.raw as number;
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                return `${label}: ${value} user${value !== 1 ? 's' : ''} (${percentage}%)`;
              }
            }
          }
        },
        cutout: '65%',
        animation: {
          animateScale: true,
          animateRotate: true
        },
        // Ensure the chart is properly sized
        layout: {
          padding: 10
        },
        // Improve accessibility
        onHover: (event, chartElement) => {
          const target = event.native?.target as HTMLElement;
          if (target) {
            target.style.cursor = chartElement[0] ? 'pointer' : 'default';
          }
        }
      }
    });
  }

  // Load recent contact requests
  loadRecentContacts(): void {
    const token = localStorage.getItem('auth_token');

    if (!token) {
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.get<ApiResponse<any>>(
      `${environment.apiUrl}/admin/contact-request`,
      { headers }
    ).subscribe({
      next: (response) => {
        if (response.data) {
          this.stats.recentContacts = Array.isArray(response.data) ? response.data : [];
        }
      },
      error: (err) => console.error('Error loading recent contacts:', err)
    });
  }

  // Load recent audit logs
  loadRecentAuditLogs(): void {
    const token = localStorage.getItem('auth_token');

    if (!token) {
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.get<ApiResponse<any>>(
      `${environment.apiUrl}/admin/audit-history`,
      { headers }
    ).subscribe({
      next: (response) => {
        if (response.data) {
          this.stats.recentAuditLogs = Array.isArray(response.data) ? response.data : [];
        }
      },
      error: (err) => console.error('Error loading audit logs:', err)
    });
  }

  // Helper method to handle authentication errors
  private handleAuthError(): void {
    this.error = 'Authentication required. Please log in.';
    this.isLoading = false;
    this.router.navigate(['/login']);
  }

  // Helper method to handle API errors
  private handleApiError(err: any): void {
    console.error('API Error:', err);
    this.isLoading = false;

    if (err.status === 401 || err.status === 403 || err.status === 406) {
      this.error = 'Your session has expired. Please log in again.';
      localStorage.removeItem('auth_token');
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url }
      });
    } else {
      this.error = 'Failed to load dashboard data. Please try again later.';
      if (err.status >= 500) {
        this.error = 'Server error. Please try again later.';
      }
    }
  }

  // Helper method to get badge class based on log action
  getLogBadgeClass(action: string): string {
    if (!action) return 'badge-secondary';

    const actionLower = action.toLowerCase();
    if (actionLower.includes('error') || actionLower.includes('failed')) {
      return 'badge-danger';
    } else if (actionLower.includes('login') || actionLower.includes('auth')) {
      return 'badge-info';
    } else if (actionLower.includes('create') || actionLower.includes('add')) {
      return 'badge-success';
    } else if (actionLower.includes('update') || actionLower.includes('edit')) {
      return 'badge-warning';
    } else if (actionLower.includes('delete') || actionLower.includes('remove')) {
      return 'badge-danger';
    }
    return 'badge-primary';
  }

  // Helper method to get icon based on log action
  getLogIcon(action: string): string {
    if (!action) return 'fa-info-circle';

    const actionLower = action.toLowerCase();
    if (actionLower.includes('login')) return 'fa-sign-in-alt';
    if (actionLower.includes('logout')) return 'fa-sign-out-alt';
    if (actionLower.includes('create') || actionLower.includes('add')) return 'fa-plus-circle';
    if (actionLower.includes('update') || actionLower.includes('edit')) return 'fa-edit';
    if (actionLower.includes('delete') || actionLower.includes('remove')) return 'fa-trash-alt';
    if (actionLower.includes('error') || actionLower.includes('failed')) return 'fa-exclamation-circle';
    if (actionLower.includes('password')) return 'fa-key';
    if (actionLower.includes('email')) return 'fa-envelope';
    if (actionLower.includes('user')) return 'fa-user';
    return 'fa-info-circle';
  }

  // Users array to store the list of users
  users: User[] = [];

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
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    // Make the API call with proper typing
    this.http.get<ApiResponse<{ users: User[]; statistics: any }>>(
      `${environment.apiUrl}/admin/users`,
      { headers }
    ).subscribe({
      next: (response) => {
        // Update users and statistics from the response
        if (response.data) {
          this.users = response.data.users || [];

          // Update statistics if available
          if (response.data.statistics) {
            this.statistics = {
              ...this.statistics,
              totalUsers: response.data.statistics.totalUsers || 0,
              activeUsers: response.data.statistics.activeUsers || 0,
              inactiveUsers: response.data.statistics.inactiveUsers || 0
            };
          }
        }
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
    return this.users.filter((user: User) =>
      user.email?.toLowerCase().includes(query) ||
      user.status?.toLowerCase().includes(query) ||
      user.subscription?.toLowerCase().includes(query)
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
