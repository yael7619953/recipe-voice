import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Category, CategoryDraft, CategoryTreeNode } from '../../../core/models/category.model';
import { Recipe } from '../../../core/models/recipe.model';
import { CategoryService } from '../../../core/services/category.service';
import { RecipeService } from '../../../core/services/recipe.service';
import { CategoryTreeComponent } from '../category-tree/category-tree.component';
import { CategoryFormComponent } from '../category-form/category-form.component';

@Component({
  selector: 'app-categories-page',
  standalone: true,
  imports: [TranslatePipe, CategoryTreeComponent, CategoryFormComponent],
  templateUrl: './categories-page.component.html',
  styleUrl: './categories-page.component.scss',
  host: { '[attr.dir]': 'dir()' },
})
export class CategoriesPageComponent implements OnInit {
  private categoryService = inject(CategoryService);
  private recipeService = inject(RecipeService);
  private translate = inject(TranslateService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  readonly tree = this.categoryService.tree;
  readonly loading = this.categoryService.loading;
  readonly count = this.categoryService.count;
  readonly categories = this.categoryService.categories;

  readonly formOpen = signal(false);
  readonly editing = signal<Category | null>(null);
  readonly presetParentId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly selectedCategory = signal<CategoryTreeNode | null>(null);
  readonly selectedCategoryId = computed(() => this.selectedCategory()?._id ?? null);
  readonly recipes = signal<Recipe[]>([]);
  readonly recipesLoading = signal(false);
  readonly recipesError = signal<string | null>(null);
  readonly recipesPage = signal(1);
  readonly recipesTotalPages = signal(1);

  readonly dir = computed(() => (this.translate.currentLang() === 'en' ? 'ltr' : 'rtl'));

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.error.set(null);
    this.categoryService.load().subscribe({
      error: () => this.error.set('categories.errors.load'),
    });
  }

  selectCategory(node: CategoryTreeNode): void {
    this.selectedCategory.set(node);
    this.loadRecipes(1);
  }

  clearCategoryFilter(): void {
    this.selectedCategory.set(null);
    this.recipes.set([]);
    this.recipesPage.set(1);
    this.recipesTotalPages.set(1);
    this.recipesError.set(null);
  }

  loadRecipes(page: number): void {
    const category = this.selectedCategory();
    if (!category) {
      return;
    }

    this.recipesLoading.set(true);
    this.recipesError.set(null);

    this.recipeService
      .list(page, 20, { category: category._id })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.recipes.set(res.items);
          this.recipesPage.set(res.page);
          this.recipesTotalPages.set(res.totalPages);
          this.recipesLoading.set(false);
        },
        error: () => {
          this.recipesError.set('categories.recipes.errors.load');
          this.recipesLoading.set(false);
        },
      });
  }

  navigateToRecipe(id: string): void {
    void this.router.navigate(['/recipes', id]);
  }

  categoryBadges(recipe: Recipe): Array<{ id: string; icon: string; color: string }> {
    return this.categoryService.badgesFor(recipe.categories);
  }

  openCreate(): void {
    this.editing.set(null);
    this.presetParentId.set(null);
    this.formOpen.set(true);
  }

  openAddChild(parent: CategoryTreeNode): void {
    this.editing.set(null);
    this.presetParentId.set(parent._id);
    this.formOpen.set(true);
  }

  openEdit(node: CategoryTreeNode): void {
    this.presetParentId.set(null);
    this.editing.set(node);
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editing.set(null);
    this.presetParentId.set(null);
  }

  handleSave(draft: CategoryDraft): void {
    this.saving.set(true);
    this.error.set(null);
    const current = this.editing();
    const request$ = current
      ? this.categoryService.update(current._id, draft)
      : this.categoryService.create(draft);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeForm();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('categories.errors.save');
      },
    });
  }

  handleDelete(node: CategoryTreeNode): void {
    const message = this.translate.instant('categories.confirmDelete', { name: node.name });
    if (!confirm(message)) {
      return;
    }
    this.error.set(null);
    this.categoryService.remove(node._id).subscribe({
      next: () => {
        if (this.selectedCategoryId() === node._id) {
          this.clearCategoryFilter();
        }
      },
      error: (err: { status?: number }) =>
        this.error.set(err?.status === 409 ? 'categories.errors.hasChildren' : 'categories.errors.generic'),
    });
  }
}
