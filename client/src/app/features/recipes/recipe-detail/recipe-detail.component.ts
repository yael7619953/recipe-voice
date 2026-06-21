import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { RecipeService } from '../../../core/services/recipe.service';
import { Recipe } from '../../../core/models/recipe.model';

@Component({
  selector: 'app-recipe-detail',
  imports: [TranslatePipe, RouterLink],
  templateUrl: './recipe-detail.component.html',
  styleUrl: './recipe-detail.component.scss',
})
export class RecipeDetailComponent implements OnInit {
  private recipeService = inject(RecipeService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  recipe = signal<Recipe | null>(null);
  loading = signal(true);
  errorKey = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
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

  delete(): void {
    const r = this.recipe();
    if (!r || !window.confirm('מחק מתכון זה?')) return;

    this.recipeService
      .delete(r._id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => void this.router.navigate(['/recipes']),
        error: () => this.errorKey.set('RECIPES.ERROR.DELETE'),
      });
  }

  formatPrepTime(hours: number, minutes: number): string {
    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours}ש׳`);
    if (minutes > 0) parts.push(`${minutes}ד׳`);
    return parts.length ? parts.join(' ') : '—';
  }

  formatTimer(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}:${String(s).padStart(2, '0')} דקות` : `${m} דקות`;
  }
}
