import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const guestGuard: CanActivateFn = () => {
  if (!inject(AuthService).isLoggedIn()) {
    return true;
  }
  return inject(Router).createUrlTree(['/recipes']);
};
