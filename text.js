
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