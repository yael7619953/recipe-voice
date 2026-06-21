import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const logoutGuard: CanActivateFn = () => {
  inject(AuthService).logout();
  return inject(Router).createUrlTree(['/auth/login']);
};
