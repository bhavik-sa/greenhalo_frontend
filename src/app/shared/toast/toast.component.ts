import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast, ToastType } from '../toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index: 1100">
      <div *ngFor="let toast of toasts" 
           class="toast show" 
           [ngClass]="getToastClass(toast.type)"
           role="alert" 
           aria-live="assertive" 
           aria-atomic="true">
        <div class="toast-header">
          <strong class="me-auto">{{ toast.title || toast.type | titlecase }}</strong>
          <button type="button" class="btn-close" (click)="removeToast(toast.id)" aria-label="Close"></button>
        </div>
        <div class="toast-body">
          {{ toast.message }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .toast {
      margin-bottom: 0.5rem;
      opacity: 1;
    }
    
    .toast-success {
      background-color: #d4edda;
      color: #155724;
      border-color: #c3e6cb;
    }
    
    .toast-error {
      background-color: #f8d7da;
      color: #721c24;
      border-color: #f5c6cb;
    }
    
    .toast-warning {
      background-color: #fff3cd;
      color: #856404;
      border-color: #ffeeba;
    }
    
    .toast-info {
      background-color: #d1ecf1;
      color: #0c5460;
      border-color: #bee5eb;
    }
  `]
})
export class ToastComponent {
  toasts: Toast[] = [];

  constructor(private toastService: ToastService) {
    this.toastService.toasts$.subscribe(toast => {
      this.toasts.push(toast);
      
      // Auto-remove toast after timeout
      if (toast.timeoutMs && toast.timeoutMs > 0) {
        setTimeout(() => {
          this.removeToast(toast.id);
        }, toast.timeoutMs);
      }
    });
  }

  getToastClass(type: ToastType): string {
    return `toast-${type}`;
  }

  removeToast(id: number): void {
    this.toasts = this.toasts.filter(toast => toast.id !== id);
  }
}
