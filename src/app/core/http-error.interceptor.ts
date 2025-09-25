import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../shared/toast.service';

// Functional HTTP interceptor (Angular 15+)
export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Debug log to verify interceptor is invoked
      // Remove or downgrade in production as needed
      console.error('[HTTP ERROR INTERCEPTOR]', {
        url: req.url,
        status: error?.status,
        body: error?.error
      });
      // Example shape: { data: {}, error: [], message: 'you are not authorized to perform this action.', status: 400 }
      let message = 'An unexpected error occurred.';

      const tryExtract = (err: any): string | undefined => {
        if (!err) return undefined;
        if (typeof err === 'string') return err;
        if (Array.isArray(err)) {
          // If array of strings or objects with message
          const parts = err
            .map((item: any) => (typeof item === 'string' ? item : item?.message || item?.msg))
            .filter(Boolean);
          if (parts.length) return parts.join('\n');
        }
        // Common nests
        return err.message || err.msg || err.error?.message || err.error?.msg;
      };

      if (error?.error != null) {
        const e = error.error as any;
        message = tryExtract(e) || message;
        // Also look for explicit e.error field (some APIs use { error: { message } } or { error: [..] })
        if (!message && e?.error) {
          message = tryExtract(e.error) || message;
        }
      }

      if (!message && error?.message) {
        message = error.message;
      }

      // Fallbacks by status
      if (!message) {
        if (error.status === 0) message = 'Network error: unable to reach the server.';
        else if (error.status === 401) message = 'Unauthorized. Please sign in again.';
        else if (error.status === 403) message = 'Forbidden. You do not have permission for this action.';
        else if (error.status >= 500) message = 'Server error. Please try again later.';
      }

      console.debug('[HTTP ERROR INTERCEPTOR] Toast shown with message:', message);

      return throwError(() => error);
    })
  );
};
