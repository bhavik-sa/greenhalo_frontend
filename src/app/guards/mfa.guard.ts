import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../Services/auth.service';

// Only allow access to /mfa when the user is NOT authenticated but DOES have a pending MFA user/session.
export const mfaGuard: CanActivateFn = (): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const hasToken = !!auth.getToken();
  if (hasToken) {
    return router.parseUrl('/dashboard');
  }
  const pending = auth.getPendingUserId?.() || null;
  if (pending) {
    return true;
  }
  return router.parseUrl('/login');
};
