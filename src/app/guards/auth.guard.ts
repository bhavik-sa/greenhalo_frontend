import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../Services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const token = auth.getToken();
  if (token) {
    return true;
  }

  // If an MFA flow is in progress, send the user to the MFA page
  if (auth.getMfaToken()) {
    router.navigateByUrl('/mfa');
    return false;
  }

  // Otherwise, go to login
  router.navigateByUrl('/login');
  return false;
};
