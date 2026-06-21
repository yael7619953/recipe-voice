import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CategoryService } from '../../../core/services/category.service';
import { RecipeService } from '../../../core/services/recipe.service';
import { Recipe } from '../../../core/models/recipe.model';

@Component({
  selector: 'app-recipes-home',
  imports: [TranslatePipe, RouterLink, FormsModule],
  templateUrl: './recipes-home.component.html',
  styleUrl: './recipes-home.component.scss',
})
export class RecipesHomeComponent implements OnInit {
  private recipeService = inject(RecipeService);
  readonly categoryService = inject(CategoryService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  recipes = signal<Recipe[]>([]);
  loading = signal(true);
  errorKey = signal<string | null>(null);
  page = signal(1);
  totalPages = signal(1);

  searchQuery = signal('');
  selectedCategory = signal('');

  get hasActiveFilters(): boolean {
    return !!this.searchQuery() || !!this.selectedCategory();
  }

  ngOnInit(): void {
    this.categoryService.load().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    this.loadPage(1);
  }

  loadPage(p: number): void {
    this.loading.set(true);
    this.errorKey.set(null);

    this.recipeService
      .list(p, 20, { q: this.searchQuery(), category: this.selectedCategory() })
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

  applyFilters(): void {
    this.loadPage(1);
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedCategory.set('');
    this.loadPage(1);
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
