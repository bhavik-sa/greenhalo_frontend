const { audit } = require("rxjs")

<!-- Badge Management Modal -->
<div class="modal fade" [class.show]="showBadgeModal" [style.display]="showBadgeModal ? 'block' : 'none'" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-lg modal-dialog-centered" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Manage Badges for {{ selectedUser?.email }}</h5>
                <button type="button" class="btn-close" (click)="showBadgeModal = false" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <!-- Search Bar -->
                <div class="mb-3">
                    <div class="input-group">
                        <span class="input-group-text">
                            <i class="bi bi-search"></i>
                        </span>
                        <input 
                            type="text" 
                            class="form-control" 
                            [(ngModel)]="badgeSearchQuery"
                            (keyup.enter)="onBadgeSearch()" 
                            placeholder="Search badges...">
                        <button class="btn btn-primary" (click)="onBadgeSearch()">
                            <i class="bi bi-search"></i> Search
                        </button>
                    </div>
                </div>

                Badges Grid
                <div class="row row-cols-1 row-cols-md-2 g-4">
                    <div class="col" *ngFor="let badge of badges">
                        <div class="card h-100">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <h5 class="card-title mb-0">
                                        <i class="bi" [ngClass]="badge.assigned ? 'bi-check-circle-fill text-success' : 'bi-circle'"></i>
                                        {{ badge.title }}
                                    </h5>
                                    <div class="form-check form-switch">
                                        <input 
                                            class="form-check-input" 
                                            type="checkbox" 
                                            role="switch" 
                                            [id]="'badge-' + badge._id"
                                            [checked]="badge.assigned"
                                            (change)="toggleBadgeAssignment(badge)">
                                        <label class="form-check-label" [for]="'badge-' + badge._id">
                                            {{ badge.assigned ? 'Assigned' : 'Not Assigned' }}
                                        </label>
                                    </div>
                                </div>
                                <div class="d-flex align-items-center mb-2">
                                    <img *ngIf="badge.icon_url" [src]="badge.icon_url" class="me-2" style="width: 24px; height: 24px;" alt="Badge Icon">
                                    <span class="badge" [ngClass]="badge.status ? 'bg-success' : 'bg-secondary'">
                                        {{ badge.status ? 'Active' : 'Inactive' }}
                                    </span>
                                </div>
                                <p class="card-text" [innerHTML]="badge.html_content"></p>
                                <small class="text-muted">Created: {{ badge.createdAt | date:'mediumDate' }}</small>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Pagination -->
                <div class="d-flex justify-content-between align-items-center mt-3" *ngIf="totalBadges > 0">
                    <div class="text-muted">
                        Showing {{ (currentBadgePage - 1) * badgeItemsPerPage + 1 }} to 
                        <!-- {{ Math.min(currentBadgePage * badgeItemsPerPage, totalBadges) }} of {{ totalBadges }} badges -->
                    </div>
                    <nav>
                        <ul class="pagination mb-0">
                            <li class="page-item" [class.disabled]="currentBadgePage === 1">
                                <a class="page-link" href="javascript:;" (click)="onBadgePageChange(1)" aria-label="First">
                                    <span aria-hidden="true">&laquo;&laquo;</span>
                                </a>
                            </li>
                            <li class="page-item" [class.disabled]="currentBadgePage === 1">
                                <a class="page-link" href="javascript:;" (click)="onBadgePageChange(currentBadgePage - 1)" aria-label="Previous">
                                    <span aria-hidden="true">&laquo;</span>
                                </a>
                            </li>
                            <li class="page-item" [class.disabled]="currentBadgePage * badgeItemsPerPage >= totalBadges">
                                <a class="page-link" href="javascript:;" (click)="onBadgePageChange(currentBadgePage + 1)" aria-label="Next">
                                    <span aria-hidden="true">&raquo;</span>
                                </a>
                            </li>
                        </ul>
                    </nav>
                </div>

                <div *ngIf="badges.length === 0 && !isBadgeLoading" class="text-center py-4">
                    <p class="text-muted">No badges found</p>
                </div>

                <div *ngIf="isBadgeLoading" class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" (click)="showBadgeModal = false">Close</button>
            </div>
        </div>
    </div>
</div>


css


Table styles
.table-responsive {
    max-height: 60vh;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #888 #f1f1f1;
}

.table th {
    position: sticky;
    top: 0;
    background-color: #f8f9fa;
    z-index: 10;
    border-bottom: 2px solid #dee2e6;
    white-space: nowrap;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 0.75rem;
    letter-spacing: 0.05em;
    color: #6c757d;
    padding: 1rem 1.5rem;
}
  
  /* Avatar styles */
  .avatar-sm, .avatar-lg {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
  }
  
  .avatar-sm {
    width: 40px;
    height: 40px;
    font-size: 1rem;
  }
  
  .avatar-lg {
    width: 80px;
    height: 80px;
    font-size: 2rem;
  }
  
  .avatar-title {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    border-radius: inherit;
  }
  
  /* Badge styles */
  .badge {
    font-weight: 500;
    padding: 0.35em 0.65em;
  }
  
  /* Modal styles */
  .modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1050;
    overflow-y: auto;
  }
  
  .modal.show {
    display: block;
    background-color: rgba(0, 0, 0, 0.5);
  }
  
  .modal-dialog {
    position: relative;
    width: auto;
    margin: 0.5rem;
    pointer-events: none;
  }
  
  @media (min-width: 576px) {
    .modal-dialog {
      max-width: 500px;
      margin: 1.75rem auto;
    }
  }
  
  .modal-content {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    pointer-events: auto;
    background-color: #fff;
    background-clip: padding-box;
    border: 1px solid rgba(0, 0, 0, 0.2);
    border-radius: 0.3rem;
    outline: 0;
  }
  
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1040;
    width: 100vw;
    height: 100vh;
    background-color: #000;
    opacity: 0;
    transition: opacity 0.15s linear;
  }
  
  .modal-backdrop.show {
    opacity: 0.5;
  }
  
  /* Loading spinner */
  .spinner-border {
    width: 2rem;
    height: 2rem;
  }
  
  /* Responsive adjustments */
  @media (max-width: 768px) {
    .table-responsive {
      font-size: 0.875rem;
    }
    
    .table th, .table td {
      padding: 0.5rem;
    }
    
    .modal-dialog {
      margin: 0.5rem;
    }
  }
  
  /* Card styles */
/* .card {
    border: none;
    box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
    transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
    margin-bottom: 1.5rem;
}

.card:hover {
    transform: translateY(-2px);
    box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.1);
} */

/* Filter Section */
.filter-section {
    background-color: #f8f9fa;
    border-radius: 0.5rem;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    border: 1px solid rgba(0, 0, 0, 0.05);
}

.filter-section .form-label {
    font-weight: 500;
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
    color: #495057;
}

.filter-section .form-control,
.filter-section .form-select {
    border-radius: 0.375rem;
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    border: 1px solid #ced4da;
    transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.filter-section .form-control:focus,
.filter-section .form-select:focus {
    border-color: #86b7fe;
    box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
}

/* Sort button */
.btn-sort {
    min-width: 80px;
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
}

/* Filter toggle button */
.btn-filter-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
}

/* Status badges */
.badge {
    font-weight: 500;
    padding: 0.4em 0.8em;
    font-size: 0.75rem;
    line-height: 1.5;
    border-radius: 0.375rem;
    text-transform: capitalize;
}

.badge.bg-success {
    background-color: #198754 !important;
}

.badge.bg-danger {
    background-color: #dc3545 !important;
}

.badge.bg-warning {
    background-color: #ffc107 !important;
    color: #000 !important;
}

/* Action buttons */
.btn-action {
    width: 32px;
    height: 32px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s;
}

.btn-action:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .filter-section .row > [class^="col-"] {
        margin-bottom: 1rem;
    }
    
    .filter-section .btn {
        width: 100%;
        margin-bottom: 0.5rem;
    }
    
    .table-responsive {
        font-size: 0.875rem;
    }
    
    .table th, .table td {
        padding: 0.75rem 0.5rem;
    }
}

/* Animation for filter toggle */
.filter-toggle-enter-active {
    animation: slideDown 0.3s ease-out;
}

.filter-toggle-leave-active {
    animation: slideUp 0.3s ease-in;
}

@keyframes slideDown {
    from {
        opacity: 0;
        transform: translateY(-10px);
        max-height: 0;
    }
    to {
        opacity: 1;
        transform: translateY(0);
        max-height: 500px;
    }
}

@keyframes slideUp {
    from {
        opacity: 1;
        transform: translateY(0);
        max-height: 500px;
    }
    to {
        opacity: 0;
        transform: translateY(-10px);
        max-height: 0;
        margin: 0;
        padding: 0;
        overflow: hidden;
    }
}

/* Loading state */
.loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(255, 255, 255, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    border-radius: 0.5rem;
}

.spinner-border {
    width: 2.5rem;
    height: 2.5rem;
    color: #0d6efd;
}
  
  /* Custom scrollbar */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  ::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }
  
  ::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: #666;
  }

















  audit css

  /* Audit History Component Styles */

/* Table styles */
.table {
    margin-bottom: 0;
}

/* .table th {
    font-weight: 600;
    text-transform: uppercase;
    font-size: 0.75rem;
    letter-spacing: 0.5px;
    color: #6c757d;
    border-top: none;
    border-bottom: 1px solid #dee2e6;
} */

.table td {
    vertical-align: middle;
    padding: 1rem 0.75rem;
}

/* Avatar styles */
.avatar-sm {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background-color: #f8f9fa;
    font-weight: 600;
    font-size: 14px;
}

/* Badge styles */
.badge {
    font-weight: 500;
    padding: 0.35em 0.65em;
    font-size: 0.75em;
    letter-spacing: 0.5px;
}

/* Modal styles */
.modal-content {
    border: none;
    box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
}

.modal-header {
    border-bottom: 1px solid #e9ecef;
    padding: 1.25rem 1.5rem;
}

.modal-body {
    padding: 1.5rem;
}

.modal-footer {
    border-top: 1px solid #e9ecef;
    padding: 1rem 1.5rem;
}

/* Loading spinner */
.spinner-border {
    width: 2rem;
    height: 2rem;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .table-responsive {
        border: 0;
    }
    
    .table thead {
        display: none;
    }
    
    .table, .table tbody, .table tr, .table td {
        display: block;
        width: 100%;
    }
    
    .table tr {
        margin-bottom: 1rem;
        border: 1px solid #dee2e6;
        border-radius: 0.25rem;
    }
    
    .table td {
        text-align: right;
        padding-left: 50%;
        position: relative;
        border-bottom: 1px solid #dee2e6;
    }
    
    .table td::before {
        content: attr(data-label);
        position: absolute;
        left: 1rem;
        width: calc(50% - 1rem);
        text-align: left;
        font-weight: 600;
        text-transform: uppercase;
        font-size: 0.75rem;
        color: #6c757d;
    }
    
    /* Add data-labels for mobile view */
    .table td:nth-of-type(1)::before { content: 'Action'; }
    .table td:nth-of-type(2)::before { content: 'User'; }
    .table td:nth-of-type(3)::before { content: 'Details'; }
    .table td:nth-of-type(4)::before { content: 'Timestamp'; }
}

/* Hover effect for table rows */
tr {
    transition: background-color 0.2s ease;
}

tr:hover {
    background-color: rgba(0, 0, 0, 0.02);
}

/* Custom scrollbar for modal content */
.modal-body pre::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

.modal-body pre::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
}

.modal-body pre::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
}

.modal-body pre::-webkit-scrollbar-thumb:hover {
    background: #555;
}