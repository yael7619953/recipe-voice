import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.authRoutes),
  },
  {
    path: 'recipes',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/recipes/recipes.routes').then((m) => m.recipesRoutes),
  },
  {
    path: 'categories',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/categories/categories.routes').then((m) => m.CATEGORIES_ROUTES),
  },
  {
    path: 'cooking',
    canActivate: [authGuard],
    loadChildren: () => import('./features/cooking/cooking.routes').then((m) => m.cookingRoutes),
  },
];
