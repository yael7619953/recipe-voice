import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const AI_IMPORT_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./ai-import-wizard/ai-import-wizard.component').then((m) => m.AiImportWizardComponent),
  },
];
