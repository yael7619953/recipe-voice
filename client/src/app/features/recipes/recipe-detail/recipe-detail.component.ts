import { Component, DestroyRef, inject, OnDestroy, OnInit, signal } from '@angular/core';
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
export class RecipeDetailComponent implements OnInit, OnDestroy {
  private recipeService = inject(RecipeService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  recipe = signal<Recipe | null>(null);
  loading = signal(true);
  errorKey = signal<string | null>(null);

  timerSeconds = signal<Map<number, number>>(new Map());
  private readonly intervals = new Map<number, ReturnType<typeof setInterval>>();

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

  ngOnDestroy(): void {
    for (const id of this.intervals.values()) {
      clearInterval(id);
    }
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

  toggleTimer(stepIndex: number, durationMinutes: number): void {
    if (this.intervals.has(stepIndex)) {
      clearInterval(this.intervals.get(stepIndex)!);
      this.intervals.delete(stepIndex);
      const updated = new Map(this.timerSeconds());
      updated.delete(stepIndex);
      this.timerSeconds.set(updated);
      return;
    }

    let remaining = durationMinutes * 60;
    const started = new Map(this.timerSeconds());
    started.set(stepIndex, remaining);
    this.timerSeconds.set(started);

    const id = setInterval(() => {
      remaining--;
      const m = new Map(this.timerSeconds());
      if (remaining <= 0) {
        clearInterval(this.intervals.get(stepIndex)!);
        this.intervals.delete(stepIndex);
        m.set(stepIndex, 0);
      } else {
        m.set(stepIndex, remaining);
      }
      this.timerSeconds.set(m);
    }, 1000);

    this.intervals.set(stepIndex, id);
  }

  isTimerRunning(stepIndex: number): boolean {
    return this.intervals.has(stepIndex);
  }

  timerDisplay(stepIndex: number, durationMinutes: number): string {
    const secs = this.timerSeconds().get(stepIndex);
    if (secs !== undefined) {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `${m}:${String(s).padStart(2, '0')}`;
    }
    return `${durationMinutes} דקות`;
  }

  formatPrepTime(hours: number, minutes: number): string {
    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours}ש׳`);
    if (minutes > 0) parts.push(`${minutes}ד׳`);
    return parts.length ? parts.join(' ') : '—';
  }
}
