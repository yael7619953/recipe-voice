import { Injectable, signal } from '@angular/core';

/**
 * Recipe lists have no shared cache (unlike CategoryService), so pages that
 * render recipes bump/react to this counter to reload after out-of-band
 * mutations — e.g. the AI agent creating/editing/deleting a recipe server-side.
 */
@Injectable({ providedIn: 'root' })
export class DataRefreshService {
  private _recipesVersion = signal(0);
  readonly recipesVersion = this._recipesVersion.asReadonly();

  notifyRecipesChanged(): void {
    this._recipesVersion.update((v) => v + 1);
  }
}
