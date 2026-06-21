import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { RecipeService } from '../../../core/services/recipe.service';
import { Recipe } from '../../../core/models/recipe.model';

@Component({
  selector: 'app-recipes-home',
  imports: [TranslatePipe, RouterLink],
  templateUrl: './recipes-home.component.html',
  styleUrl: './recipes-home.component.scss',
})
export class RecipesHomeComponent implements OnInit {
  private recipeService = inject(RecipeService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  recipes = signal<Recipe[]>([]);
  loading = signal(true);
  errorKey = signal<string | null>(null);
  page = signal(1);
  totalPages = signal(1);

  ngOnInit(): void {
    this.loadPage(1);
  }

  loadPage(p: number): void {
    this.loading.set(true);
    this.errorKey.set(null);

    this.recipeService
      .list(p)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.recipes.set(res.items);
          this.page.set(res.page);
          this.totalPages.set(res.totalPages);
          this.loading.set(false);
        },
        error: () => {
          this.errorKey.set('RECIPES.ERROR.LOAD');
          this.loading.set(false);
        },
      });
  }

  navigateTo(id: string): void {
    void this.router.navigate(['/recipes', id]);
  }

  delete(id: string, event: Event): void {
    event.stopPropagation();
    if (!window.confirm('מחק מתכון זה?')) return;

    this.recipeService
      .delete(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loadPage(this.page()),
        error: () => this.errorKey.set('RECIPES.ERROR.DELETE'),
      });
  }
}
