import {
  Component,
  computed,
  DestroyRef,
  effect,
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
import { CookingTimerAlarmService } from '../services/cooking-timer-alarm.service';
import { CookingTtsService } from '../services/cooking-tts.service';
import { CookingSttService } from '../services/cooking-stt.service';

type CookingPhase = 'ingredients' | 'instructions';

/** Seconds to wait after TTS finishes before auto-advancing to the next step. */
const AUTO_ADVANCE_SECONDS = 120;

/**
 * Owns the focused cooking screen: loads a recipe by `recipeId`, reads ingredients
 * aloud first, then walks the cook through one instruction step at a time (TTS).
 *
 * In auto mode (default) the component starts a 2-minute countdown after each step
 * is read aloud; if no manual input arrives it advances automatically. Manual mode
 * disables the countdown so the cook controls every transition explicitly.
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
  providers: [CookingTtsService, CookingTimerAlarmService, CookingSttService],
  host: { '[attr.dir]': 'dir()' },
})
export class CookingComponent implements OnInit, OnDestroy {
  private recipeService = inject(RecipeService);
  private route = inject(ActivatedRoute);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);
  private tts = inject(CookingTtsService);
  private timerAlarm = inject(CookingTimerAlarmService);
  readonly stt = inject(CookingSttService);

  readonly recipe = signal<Recipe | null>(null);
  readonly loading = signal(true);
  readonly errorKey = signal<string | null>(null);

  readonly phase = signal<CookingPhase>('ingredients');
  readonly currentStepIndex = signal(0);
  readonly currentIngredientIndex = signal(0);
  readonly showFullRecipe = signal(false);

  readonly ingredients = computed(() => this.recipe()?.ingredients ?? []);
  readonly steps = computed(() => this.recipe()?.instructions ?? []);
  readonly totalSteps = computed(() => this.steps().length);
  readonly totalIngredients = computed(() => this.ingredients().length);
  readonly currentStep = computed(() => this.steps()[this.currentStepIndex()] ?? null);
  readonly isFirstStep = computed(() => this.currentStepIndex() === 0);
  readonly isLastStep = computed(() => this.currentStepIndex() >= this.totalSteps() - 1);
  readonly isIngredientsPhase = computed(() => this.phase() === 'ingredients');
  readonly isInstructionsPhase = computed(() => this.phase() === 'instructions');

  /**
   * State contract for the STT layer (Shira, M14): true while the app is
   * actively reading a step aloud. Used to pause the microphone (echo guard).
   */
  readonly isTtsSpeaking = this.tts.active;
  readonly ttsPaused = this.tts.paused;
  readonly ttsSupported = this.tts.supported;

  /** Voice-command (STT) state, exposed to the template for the mic control. */
  readonly sttSupported = this.stt.supported;
  readonly sttListening = this.stt.listening;
  readonly voiceControlOn = signal(false);

  /** Remaining seconds for the current step's timer, or null when idle. */
  readonly timerRemaining = signal<number | null>(null);
  /** True after the countdown hits zero until the user dismisses or changes step. */
  readonly timerFinished = signal(false);
  private timerHandle: ReturnType<typeof setInterval> | null = null;

  /**
   * When true the component auto-advances to the next step after
   * {@link AUTO_ADVANCE_SECONDS} seconds of silence following TTS completion.
   * The cook can toggle this off to take full manual control.
   */
  readonly autoMode = signal(true);
  /**
   * Remaining seconds in the auto-advance countdown, or null when not running.
   * Exposed so the STT layer (Shira, M14) can reset it on a voice "next" command
   * by calling {@link cancelAutoAdvance}.
   */
  readonly autoAdvanceRemaining = signal<number | null>(null);
  private autoAdvanceHandle: ReturnType<typeof setInterval> | null = null;

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
          this.startCookingSession();
          this.stt.attach({
            isTtsActive: this.isTtsSpeaking,
            onStop:     () => this.stopSpeech(),
            onContinue: () => this.resumeSpeech(),
            onPrevious: () => this.previous(),
            onNext:     () => { this.cancelAutoAdvance(); this.next(); },
          });
        },
        error: () => {
          this.errorKey.set('RECIPES.ERROR.NOT_FOUND');
          this.loading.set(false);
        },
      });
  }

  ngOnDestroy(): void {
    this.clearAutoAdvance();
    this.clearTimer();
    this.timerAlarm.stop();
    this.tts.stop();
    this.stt.destroy();
  }

  toggleFullRecipe(): void {
    this.showFullRecipe.update((open) => !open);
  }

  closeFullRecipe(): void {
    this.showFullRecipe.set(false);
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
    if (this.isIngredientsPhase()) {
      return;
    }
    this.clearAutoAdvance();
    this.currentStepIndex.set(index);
    this.clearTimer();
    this.speakCurrentStep();
  }

  skipToInstructions(): void {
    this.clearAutoAdvance();
    this.tts.stop();
    this.beginInstructionsPhase(this.tts.supported);
  }

  /** Toggle between auto-advance and fully manual navigation. */
  toggleAutoMode(): void {
    this.autoMode.update((m) => !m);
    if (!this.autoMode()) {
      this.clearAutoAdvance();
    }
  }

  /**
   * Cancel a running auto-advance countdown without navigating.
   * Called here on manual interaction; also intended as the hook for the
   * STT layer (Shira, M14) when a voice command arrives mid-countdown.
   */
  cancelAutoAdvance(): void {
    this.clearAutoAdvance();
  }

  speakCurrentContent(): void {
    if (this.isIngredientsPhase()) {
      this.speakIngredients();
      return;
    }
    this.speakCurrentStep();
  }

  speakIngredients(): void {
    const items = this.ingredients();
    if (!items.length) {
      this.beginInstructionsPhase(this.tts.supported);
      return;
    }

    this.phase.set('ingredients');
    this.currentIngredientIndex.set(0);

    if (!this.tts.supported) {
      return;
    }

    this.tts.speakSequence(items, {
      onItemStart: (index) => this.currentIngredientIndex.set(index),
      onComplete: () => this.beginInstructionsPhase(this.tts.supported),
    });
  }

  speakCurrentStep(): void {
    const step = this.currentStep();
    if (step) {
      this.tts.speak(step.text, () => this.onStepSpeakEnd());
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
    this.clearAutoAdvance();
  }

  toggleTimer(): void {
    const step = this.currentStep();
    if (!step?.timer.hasTimer) {
      return;
    }

    if (this.timerFinished()) {
      this.dismissTimerFinished();
      return;
    }

    if (this.timerHandle !== null) {
      this.clearTimer();
      return;
    }

    this.startTimer();
  }

  private startTimer(): void {
    const step = this.currentStep();
    if (!step?.timer.hasTimer || this.timerHandle !== null) {
      return;
    }

    this.timerAlarm.prepare();
    this.timerRemaining.set(step.timer.duration);
    this.timerHandle = setInterval(() => {
      const remaining = (this.timerRemaining() ?? 0) - 1;
      if (remaining <= 0) {
        this.onTimerFinished();
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
    return this.formatSeconds(seconds);
  }

  formatSeconds(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  formatPrepTime(hours: number, minutes: number): string {
    const parts: string[] = [];
    if (hours > 0) {
      parts.push(`${hours} ${this.translate.instant('RECIPES.HOURS_SHORT')}`);
    }
    if (minutes > 0) {
      parts.push(`${minutes} ${this.translate.instant('RECIPES.MINUTES_SHORT')}`);
    }
    return parts.join(' ') || '0';
  }

  private onStepSpeakEnd(): void {
    const step = this.currentStep();

    // Auto-start the step's timer as soon as TTS finishes reading it.
    if (step?.timer.hasTimer) {
      this.startTimer();
      return; // Timer is now the "wait" signal — skip auto-advance countdown.
    }

    if (this.autoMode() && !this.isLastStep()) {
      this.startAutoAdvanceCountdown();
    }
  }

  private startAutoAdvanceCountdown(): void {
    this.clearAutoAdvance();
    this.autoAdvanceRemaining.set(AUTO_ADVANCE_SECONDS);
    this.autoAdvanceHandle = setInterval(() => {
      const remaining = (this.autoAdvanceRemaining() ?? 0) - 1;
      if (remaining <= 0) {
        this.clearAutoAdvance();
        this.next();
      } else {
        this.autoAdvanceRemaining.set(remaining);
      }
    }, 1000);
  }

  private clearAutoAdvance(): void {
    if (this.autoAdvanceHandle !== null) {
      clearInterval(this.autoAdvanceHandle);
      this.autoAdvanceHandle = null;
    }
    this.autoAdvanceRemaining.set(null);
  }

  private startCookingSession(): void {
    this.currentStepIndex.set(0);
    this.currentIngredientIndex.set(0);
    this.showFullRecipe.set(false);

    if (this.ingredients().length > 0) {
      this.phase.set('ingredients');
      this.speakIngredients();
      return;
    }

    this.beginInstructionsPhase(this.tts.supported);
  }

  private beginInstructionsPhase(autoSpeak: boolean): void {
    this.phase.set('instructions');
    this.currentIngredientIndex.set(0);
    if (autoSpeak && this.tts.supported) {
      this.speakCurrentStep();
    }
  }

  private onTimerFinished(): void {
    if (this.timerHandle !== null) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
    this.timerRemaining.set(0);
    this.timerFinished.set(true);
    this.timerAlarm.play();
  }

  private dismissTimerFinished(): void {
    this.timerFinished.set(false);
    this.timerRemaining.set(null);
  }

  private clearTimer(): void {
    if (this.timerHandle !== null) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
    this.timerFinished.set(false);
    this.timerRemaining.set(null);
  }
}
