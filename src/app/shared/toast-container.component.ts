import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { Subscription, timer } from 'rxjs';
import { Toast, ToastService } from './toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="gh-toast-container" aria-live="polite" aria-atomic="true">
      <div *ngFor="let t of toasts" class="gh-toast" [class.gh-toast-success]="t.type==='success'" [class.gh-toast-info]="t.type==='info'" [class.gh-toast-warning]="t.type==='warning'" [class.gh-toast-error]="t.type==='error'">
        <div class="gh-toast-title" *ngIf="t.title">{{ t.title }}</div>
        <div class="gh-toast-message">{{ t.message }}</div>
        <button type="button" class="gh-toast-close" (click)="dismiss(t.id)">×</button>
      </div>
    </div>
  `,
  styles: [`
    .gh-toast-container {
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 20000;
      display: flex;
      flex-direction: column;
      gap: .5rem;
      pointer-events: none;
    }
    .gh-toast {
      min-width: 260px;
      max-width: 420px;
      background: #fff;
      color: #333;
      border-radius: 6px;
      box-shadow: 0 6px 16px rgba(0,0,0,.15);
      padding: .75rem 2rem .75rem .75rem;
      border-left: 4px solid #6c757d;
      position: relative;
      pointer-events: auto;
    }
    .gh-toast-title { font-weight: 600; margin-bottom: .25rem; }
    .gh-toast-message { font-size: .95rem; }
    .gh-toast-close {
      position: absolute;
      right: .5rem;
      top: .25rem;
      border: none;
      background: transparent;
      font-size: 1.25rem;
      line-height: 1;
      cursor: pointer;
      color: #666;
    }
    .gh-toast-success { border-left-color: #28a745; }
    .gh-toast-info    { border-left-color: #17a2b8; }
    .gh-toast-warning { border-left-color: #ffc107; }
    .gh-toast-error   { border-left-color: #dc3545; }
  `]
})
export class ToastContainerComponent implements OnDestroy {
  toasts: Toast[] = [];
  private sub: Subscription;

  constructor(private toastService: ToastService) {
    this.sub = this.toastService.toasts$.subscribe(t => {
      this.toasts = [...this.toasts, t];
      const timeout = t.timeoutMs ?? 4000;
      const s = timer(timeout).subscribe(() => this.dismiss(t.id));
    });
  }

  dismiss(id: number) {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
