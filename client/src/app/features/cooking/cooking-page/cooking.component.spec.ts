import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { TranslateLoader, provideTranslateService } from '@ngx-translate/core';
import { vi } from 'vitest';

import { CookingComponent } from './cooking.component';
import { RecipeService } from '../../../core/services/recipe.service';
import { Recipe } from '../../../core/models/recipe.model';
import { CookingTimerAlarmService } from '../services/cooking-timer-alarm.service';
import { CookingTtsService } from '../services/cooking-tts.service';

class FakeTranslateLoader extends TranslateLoader {
  getTranslation() {
    return of({});
  }
}

const MOCK_RECIPE: Recipe = {
  _id: 'recipe-1',
  title: 'Test Pancakes',
  ingredients: ['flour', 'eggs'],
  instructions: [
    { text: 'Mix dry ingredients', timer: { duration: 125, hasTimer: true } },
    { text: 'Add wet ingredients', timer: { duration: 0, hasTimer: false } },
    { text: 'Cook on skillet', timer: { duration: 65, hasTimer: true } },
  ],
  categories: ['cat-1'],
  prepTime: { hours: 0, minutes: 20 },
  isFavorite: false,
  userId: 'user-1',
  createdAt: '2024-01-01T00:00:00.000Z',
};

describe('CookingComponent', () => {
  let fixture: ComponentFixture<CookingComponent>;
  let component: CookingComponent;
  let recipeService: { getById: ReturnType<typeof vi.fn> };
  let ttsSpeakSpy: ReturnType<typeof vi.spyOn>;
  let ttsSpeakSequenceSpy: ReturnType<typeof vi.spyOn>;
  let ttsPauseSpy: ReturnType<typeof vi.spyOn>;
  let ttsResumeSpy: ReturnType<typeof vi.spyOn>;
  let ttsStopSpy: ReturnType<typeof vi.spyOn>;
  let timerPrepareSpy: ReturnType<typeof vi.spyOn>;
  let timerPlaySpy: ReturnType<typeof vi.spyOn>;
  let timerStopSpy: ReturnType<typeof vi.spyOn>;

  async function mount(recipeId: string | null = 'recipe-1'): Promise<void> {
    recipeService = { getById: vi.fn() };
    if (recipeId) {
      recipeService.getById.mockReturnValue(of(MOCK_RECIPE));
    }

    await TestBed.configureTestingModule({
      imports: [CookingComponent],
      providers: [
        { provide: RecipeService, useValue: recipeService },
        provideRouter([]),
        provideTranslateService({ loader: { provide: TranslateLoader, useClass: FakeTranslateLoader } }),
      ],
    })
      .overrideProvider(ActivatedRoute, {
        useValue: {
          snapshot: {
            paramMap: recipeId ? convertToParamMap({ recipeId }) : convertToParamMap({}),
          },
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(CookingComponent);
    component = fixture.componentInstance;

    const tts = fixture.debugElement.injector.get(CookingTtsService);
    const timerAlarm = fixture.debugElement.injector.get(CookingTimerAlarmService);
    ttsSpeakSpy = vi.spyOn(tts, 'speak');
    ttsSpeakSequenceSpy = vi.spyOn(tts, 'speakSequence');
    ttsPauseSpy = vi.spyOn(tts, 'pause');
    ttsResumeSpy = vi.spyOn(tts, 'resume');
    ttsStopSpy = vi.spyOn(tts, 'stop');
    timerPrepareSpy = vi.spyOn(timerAlarm, 'prepare');
    timerPlaySpy = vi.spyOn(timerAlarm, 'play');
    timerStopSpy = vi.spyOn(timerAlarm, 'stop');

    fixture.detectChanges();
  }

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('should create', async () => {
    await mount();
    expect(component).toBeTruthy();
  });

  describe('recipe loading', () => {
    it('should load recipe by route id', async () => {
      await mount();
      expect(recipeService.getById).toHaveBeenCalledWith('recipe-1');
      expect(component.recipe()?.title).toBe('Test Pancakes');
      expect(component.loading()).toBe(false);
    });

    it('should set error when recipe id is missing', async () => {
      await mount(null);
      expect(recipeService.getById).not.toHaveBeenCalled();
      expect(component.errorKey()).toBe('RECIPES.ERROR.NOT_FOUND');
      expect(component.loading()).toBe(false);
    });

    it('should set error when fetch fails', async () => {
      recipeService = { getById: vi.fn(() => throwError(() => new Error('404'))) };

      await TestBed.configureTestingModule({
        imports: [CookingComponent],
        providers: [
          { provide: RecipeService, useValue: recipeService },
          provideRouter([]),
          provideTranslateService({ loader: { provide: TranslateLoader, useClass: FakeTranslateLoader } }),
        ],
      })
        .overrideProvider(ActivatedRoute, {
          useValue: {
            snapshot: { paramMap: convertToParamMap({ recipeId: 'recipe-1' }) },
          },
        })
        .compileComponents();

      fixture = TestBed.createComponent(CookingComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(component.errorKey()).toBe('RECIPES.ERROR.NOT_FOUND');
    });
  });

  describe('cooking session', () => {
    beforeEach(async () => {
      await mount();
    });

    it('should start in ingredients phase and read ingredients aloud', () => {
      expect(component.isIngredientsPhase()).toBe(true);
      if (component.ttsSupported) {
        expect(ttsSpeakSequenceSpy).toHaveBeenCalledWith(['flour', 'eggs'], expect.any(Object));
      }
    });

    it('should move to instructions after ingredients finish', () => {
      if (!component.ttsSupported) {
        return;
      }
      ttsSpeakSequenceSpy.mock.calls[0][1]?.onComplete?.();
      expect(component.isInstructionsPhase()).toBe(true);
      expect(ttsSpeakSpy).toHaveBeenCalledWith('Mix dry ingredients');
    });

    it('should skip ingredients on demand', () => {
      component.skipToInstructions();
      expect(component.isInstructionsPhase()).toBe(true);
      if (component.ttsSupported) {
        expect(ttsSpeakSpy).toHaveBeenCalledWith('Mix dry ingredients');
      }
    });
  });

  describe('step navigation', () => {
    beforeEach(async () => {
      await mount();
      component.skipToInstructions();
      ttsSpeakSpy.mockClear();
    });

    it('should start on the first step', () => {
      expect(component.currentStepIndex()).toBe(0);
      expect(component.currentStep()?.text).toBe('Mix dry ingredients');
      expect(component.isFirstStep()).toBe(true);
      expect(component.isLastStep()).toBe(false);
    });

    it('should move to next and previous steps', () => {
      component.next();
      expect(component.currentStepIndex()).toBe(1);
      expect(ttsSpeakSpy).toHaveBeenCalledWith('Add wet ingredients', expect.any(Function));

      component.previous();
      expect(component.currentStepIndex()).toBe(0);
      expect(ttsSpeakSpy).toHaveBeenCalledWith('Mix dry ingredients', expect.any(Function));
    });

    it('should not go past the first or last step', () => {
      component.previous();
      expect(component.currentStepIndex()).toBe(0);

      component.goToStep(2);
      component.next();
      expect(component.currentStepIndex()).toBe(2);
    });
  });

  describe('timer', () => {
    beforeEach(async () => {
      vi.useFakeTimers();
      await mount();
      component.skipToInstructions();
    });

    it('should format timer display as mm:ss', () => {
      expect(component.timerDisplay()).toBe('2:05');

      component.toggleTimer();
      expect(component.timerDisplay()).toBe('2:05');

      vi.advanceTimersByTime(60000);
      expect(component.timerDisplay()).toBe('1:05');
    });

    it('should start, count down, and finish with alarm', () => {
      component.toggleTimer();

      expect(timerPrepareSpy).toHaveBeenCalled();
      expect(component.isTimerRunning()).toBe(true);
      expect(component.timerRemaining()).toBe(125);

      vi.advanceTimersByTime(125_000);

      expect(component.isTimerRunning()).toBe(false);
      expect(component.timerFinished()).toBe(true);
      expect(component.timerRemaining()).toBe(0);
      expect(timerPlaySpy).toHaveBeenCalled();
    });

    it('should stop a running timer on second toggle', () => {
      component.toggleTimer();
      component.toggleTimer();

      expect(component.isTimerRunning()).toBe(false);
      expect(component.timerRemaining()).toBeNull();
    });

    it('should dismiss finished state on toggle', () => {
      component.toggleTimer();
      vi.advanceTimersByTime(125_000);
      component.toggleTimer();

      expect(component.timerFinished()).toBe(false);
      expect(component.timerRemaining()).toBeNull();
    });

    it('should ignore toggle on steps without a timer', () => {
      component.goToStep(1);
      timerPrepareSpy.mockClear();
      component.toggleTimer();

      expect(timerPrepareSpy).not.toHaveBeenCalled();
      expect(component.isTimerRunning()).toBe(false);
    });

    it('should clear timer when changing steps', () => {
      component.toggleTimer();
      component.next();

      expect(component.isTimerRunning()).toBe(false);
      expect(component.timerRemaining()).toBeNull();
    });
  });

  describe('TTS controls', () => {
    beforeEach(async () => {
      await mount();
      component.skipToInstructions();
    });

    it('should delegate speech actions to TtsService', () => {
      component.speakCurrentContent();
      component.pauseSpeech();
      component.resumeSpeech();
      component.stopSpeech();

      expect(ttsSpeakSpy).toHaveBeenCalledWith('Mix dry ingredients', expect.any(Function));
      expect(ttsPauseSpy).toHaveBeenCalled();
      expect(ttsResumeSpy).toHaveBeenCalled();
      expect(ttsStopSpy).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should stop timer alarm and TTS on destroy', async () => {
      await mount();
      fixture.destroy();

      expect(timerStopSpy).toHaveBeenCalled();
      expect(ttsStopSpy).toHaveBeenCalled();
    });
  });

  describe('template', () => {
    beforeEach(async () => {
      await mount();
      component.skipToInstructions();
      fixture.detectChanges();
    });

    it('should render the cooking layout with step text', () => {
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('.cooking-page')).toBeTruthy();
      expect(el.querySelector('.step-text')?.textContent).toContain('Mix dry ingredients');
      expect(el.querySelector('.timer-badge')).toBeTruthy();
    });
  });
});
