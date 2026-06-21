import { Routes } from '@angular/router';

export const authRoutes: Routes = [
  {
    path: 'oauth-callback',
    loadComponent: () =>
      import('./oauth-callback/oauth-callback.component').then(
        (m) => m.OauthCallbackComponent,
      ),
  },
];
