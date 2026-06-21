import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const CATEGORIES_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./categories-page/categories-page.component').then((m) => m.CategoriesPageComponent),
  },
];
