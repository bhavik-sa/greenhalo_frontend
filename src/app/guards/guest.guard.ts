import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../Services/auth.service';

// Blocks access to guest-only pages (e.g., /login) when already authenticated.
export const guestGuard: CanActivateFn = (): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const token = auth.getToken();
  if (token) {
    return router.parseUrl('/dashboard');
  }
  // If an MFA flow is in progress (pending user), do not allow /login; send to /mfa
  const pending = auth.getPendingUserId?.() || null;
  if (pending) {
    return router.parseUrl('/mfa');
  }
  return true;
};
