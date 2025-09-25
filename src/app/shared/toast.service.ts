import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
  title?: string;
  timeoutMs?: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toastsSubject = new Subject<Toast>();
  private idCounter = 1;

  get toasts$(): Observable<Toast> {
    return this.toastsSubject.asObservable();
  }

  constructor(private zone: NgZone) {}

  show(type: ToastType, message: string, title?: string, timeoutMs = 4000): void {
    const toast: Toast = { id: this.idCounter++, type, message, title, timeoutMs };
    // Ensure emission happens inside Angular zone so change detection runs
    this.zone.run(() => this.toastsSubject.next(toast));
  }

  success(message: string, title?: string, timeoutMs?: number) {
    this.show('success', message, title, timeoutMs);
  }

  info(message: string, title?: string, timeoutMs?: number) {
    this.show('info', message, title, timeoutMs);
  }

  warning(message: string, title?: string, timeoutMs?: number) {
    this.show('warning', message, title, timeoutMs);
  }

  error(message: string, title?: string, timeoutMs?: number) {
    this.show('error', message, title, timeoutMs);
  }
}
