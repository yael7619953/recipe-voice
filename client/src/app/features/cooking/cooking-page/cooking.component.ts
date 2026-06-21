import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { RecipeService } from '../../../core/services/recipe.service';
import { Recipe } from '../../../core/models/recipe.model';

/**
 * Owns the focused cooking screen: loads a recipe by `recipeId` and walks the
 * cook through one instruction step at a time with manual navigation.
 */
@Component({
  selector: 'app-cooking',
  standalone: true,
  imports: [TranslatePipe, RouterLink],
  templateUrl: './cooking.component.html',
  styleUrl: './cooking.component.scss',
  host: { '[attr.dir]': 'dir()' },
})
export class CookingComponent implements OnInit {
  private recipeService = inject(RecipeService);
  private route = inject(ActivatedRoute);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  readonly recipe = signal<Recipe | null>(null);
  readonly loading = signal(true);
  readonly errorKey = signal<string | null>(null);

  readonly currentStepIndex = signal(0);

  readonly steps = computed(() => this.recipe()?.instructions ?? []);
  readonly totalSteps = computed(() => this.steps().length);
  readonly currentStep = computed(() => this.steps()[this.currentStepIndex()] ?? null);
  readonly isFirstStep = computed(() => this.currentStepIndex() === 0);
  readonly isLastStep = computed(() => this.currentStepIndex() >= this.totalSteps() - 1);

  readonly dir = computed(() => (this.translate.currentLang() === 'en' ? 'ltr' : 'rtl'));

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('recipeId');
    if (!id) {
      this.errorKey.set('RECIPES.ERROR.NOT_FOUND');
      this.loading.set(false);
      return;
    }

    this.recipeService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.recipe.set(r);
          this.loading.set(false);
        },
        error: () => {
          this.errorKey.set('RECIPES.ERROR.NOT_FOUND');
          this.loading.set(false);
        },
      });
  }

  next(): void {
    if (this.isLastStep()) {
      return;
    }
    this.goToStep(this.currentStepIndex() + 1);
  }

  previous(): void {
    if (this.isFirstStep()) {
      return;
    }
    this.goToStep(this.currentStepIndex() - 1);
  }

  goToStep(index: number): void {
    this.currentStepIndex.set(index);
  }
}
