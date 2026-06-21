import { Routes } from '@angular/router';

export const recipesRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./recipes-home/recipes-home.component').then((m) => m.RecipesHomeComponent),
  },
];