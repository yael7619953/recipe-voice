import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { RecipeService } from '../../../core/services/recipe.service';
import { Recipe } from '../../../core/models/recipe.model';
import { CookingTtsService } from '../services/cooking-tts.service';

/**
 * Owns the focused cooking screen: loads a recipe by `recipeId`, walks the
 * cook through one instruction step at a time and reads it aloud (TTS).
 *
 * Publishes the {@link isTtsSpeaking} state so the STT layer (added later) can
 * mute the microphone while the app talks and avoid echo.
 */
@Component({
  selector: 'app-cooking',
  standalone: true,
  imports: [TranslatePipe, RouterLink],
  templateUrl: './cooking.component.html',
  styleUrl: './cooking.component.scss',
  providers: [CookingTtsService],
  host: { '[attr.dir]': 'dir()' },
})
export class CookingComponent implements OnInit, OnDestroy {
  private recipeService = inject(RecipeService);
  private route = inject(ActivatedRoute);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);
  private tts = inject(CookingTtsService);

  readonly recipe = signal<Recipe | null>(null);
  readonly loading = signal(true);
  readonly errorKey = signal<string | null>(null);

  readonly currentStepIndex = signal(0);

  readonly steps = computed(() => this.recipe()?.instructions ?? []);
  readonly totalSteps = computed(() => this.steps().length);
  readonly currentStep = computed(() => this.steps()[this.currentStepIndex()] ?? null);
  readonly isFirstStep = computed(() => this.currentStepIndex() === 0);
  readonly isLastStep = computed(() => this.currentStepIndex() >= this.totalSteps() - 1);

  /**
   * State contract for the STT layer (Shira, M14): true while the app is
   * actively reading a step aloud. Used to pause the microphone (echo guard).
   */
  readonly isTtsSpeaking = this.tts.active;
  readonly ttsPaused = this.tts.paused;
  readonly ttsSupported = this.tts.supported;

  /** Remaining seconds for the current step's timer, or null when idle. */
  readonly timerRemaining = signal<number | null>(null);
  private timerHandle: ReturnType<typeof setInterval> | null = null;

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

  ngOnDestroy(): void {
    this.clearTimer();
    this.tts.stop();
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
    this.clearTimer();
    this.speakCurrentStep();
  }

  speakCurrentStep(): void {
    const step = this.currentStep();
    if (step) {
      this.tts.speak(step.text);
    }
  }

  pauseSpeech(): void {
    this.tts.pause();
  }

  resumeSpeech(): void {
    this.tts.resume();
  }

  stopSpeech(): void {
    this.tts.stop();
  }

  toggleTimer(): void {
    const step = this.currentStep();
    if (!step?.timer.hasTimer) {
      return;
    }

    if (this.timerHandle !== null) {
      this.clearTimer();
      return;
    }

    this.timerRemaining.set(step.timer.duration);
    this.timerHandle = setInterval(() => {
      const remaining = (this.timerRemaining() ?? 0) - 1;
      if (remaining <= 0) {
        this.timerRemaining.set(0);
        this.clearTimer();
      } else {
        this.timerRemaining.set(remaining);
      }
    }, 1000);
  }

  isTimerRunning(): boolean {
    return this.timerHandle !== null;
  }

  /** mm:ss for the live countdown, or the step's full duration when idle. */
  timerDisplay(): string {
    const step = this.currentStep();
    const seconds = this.timerRemaining() ?? step?.timer.duration ?? 0;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  private clearTimer(): void {
    if (this.timerHandle !== null) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
    this.timerRemaining.set(null);
  }
}
