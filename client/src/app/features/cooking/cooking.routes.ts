import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const cookingRoutes: Routes = [
  {
    path: ':recipeId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./cooking-page/cooking.component').then((m) => m.CookingComponent),
  },
];
