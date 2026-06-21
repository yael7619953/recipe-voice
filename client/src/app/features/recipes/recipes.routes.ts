import { Routes } from '@angular/router';

export const recipesRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./recipes-home/recipes-home.component').then((m) => m.RecipesHomeComponent),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./recipe-form/recipe-form.component').then((m) => m.RecipeFormComponent),
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./recipe-form/recipe-form.component').then((m) => m.RecipeFormComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./recipe-detail/recipe-detail.component').then((m) => m.RecipeDetailComponent),
  },
];
