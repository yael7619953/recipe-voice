import { Routes } from '@angular/router';
import { guestGuard } from '../../core/guards/guest.guard';
import { logoutGuard } from '../../core/guards/logout.guard';

export const authRoutes: Routes = [
  {
    path: 'logout',
    canActivate: [logoutGuard],
    loadComponent: () =>
      import('./login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./register/register.component').then((m) => m.RegisterComponent),
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
