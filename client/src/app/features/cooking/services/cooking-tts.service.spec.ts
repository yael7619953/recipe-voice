import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TranslateLoader, provideTranslateService } from '@ngx-translate/core';
import { vi } from 'vitest';

import { CookingTtsService } from './cooking-tts.service';

class FakeTranslateLoader extends TranslateLoader {
  getTranslation() {
    return of({});
  }
}

describe('CookingTtsService', () => {
  let service: CookingTtsService;
  let mockSynth: {
    cancel: ReturnType<typeof vi.fn>;
    speak: ReturnType<typeof vi.fn>;
    pause: ReturnType<typeof vi.fn>;
    resume: ReturnType<typeof vi.fn>;
    getVoices: ReturnType<typeof vi.fn>;
  };
  let lastUtterance: SpeechSynthesisUtterance | null;

  beforeEach(() => {
    lastUtterance = null;
    mockSynth = {
      cancel: vi.fn(),
      speak: vi.fn((utterance: SpeechSynthesisUtterance) => {
        lastUtterance = utterance;
        utterance.onstart?.({} as SpeechSynthesisEvent);
      }),
      pause: vi.fn(),
      resume: vi.fn(),
      getVoices: vi.fn(() => [{ lang: 'he-IL', name: 'Hebrew' } as SpeechSynthesisVoice]),
    };

    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      class MockSpeechSynthesisUtterance {
        text = '';
        lang = '';
        voice: SpeechSynthesisVoice | null = null;
        onstart: ((ev: SpeechSynthesisEvent) => void) | null = null;
        onend: ((ev: SpeechSynthesisEvent) => void) | null = null;
        onerror: ((ev: SpeechSynthesisEvent) => void) | null = null;

        constructor(text?: string) {
          if (text) {
            this.text = text;
          }
        }
      },
    );
    vi.stubGlobal('speechSynthesis', mockSynth);

    TestBed.configureTestingModule({
      providers: [
        CookingTtsService,
        provideTranslateService({ loader: { provide: TranslateLoader, useClass: FakeTranslateLoader } }),
      ],
    });

    service = TestBed.inject(CookingTtsService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should create and report supported', () => {
    expect(service).toBeTruthy();
    expect(service.supported).toBe(true);
  });

  describe('speak', () => {
    it('should cancel prior speech and speak new text', () => {
      service.speak('First step');
      service.speak('Second step');

      expect(mockSynth.cancel).toHaveBeenCalledTimes(2);
      expect(mockSynth.speak).toHaveBeenCalledTimes(2);
      expect(lastUtterance?.text).toBe('Second step');
    });

    it('should set speaking and active signals on start', () => {
      service.speak('Mix the batter');

      expect(service.speaking()).toBe(true);
      expect(service.active()).toBe(true);
      expect(service.paused()).toBe(false);
    });

    it('should ignore empty text', () => {
      service.speak('   ');
      expect(mockSynth.speak).not.toHaveBeenCalled();
    });

    it('should reset signals on end', () => {
      service.speak('Bake');
      lastUtterance?.onend?.({} as SpeechSynthesisEvent);

      expect(service.speaking()).toBe(false);
      expect(service.active()).toBe(false);
    });
  });

  describe('speakSequence', () => {
    it('should read items in order and call onComplete', () => {
      const onComplete = vi.fn();
      const onItemStart = vi.fn();

      service.speakSequence(['flour', 'eggs'], { onComplete, onItemStart });

      expect(onItemStart).toHaveBeenCalledWith(0);
      expect(mockSynth.speak).toHaveBeenCalledTimes(1);
      expect(lastUtterance?.text).toBe('flour');

      lastUtterance?.onend?.({} as SpeechSynthesisEvent);

      expect(onItemStart).toHaveBeenCalledWith(1);
      expect(lastUtterance?.text).toBe('eggs');

      lastUtterance?.onend?.({} as SpeechSynthesisEvent);

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('should call onComplete immediately for empty input', () => {
      const onComplete = vi.fn();
      service.speakSequence(['', '  '], { onComplete });
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(mockSynth.speak).not.toHaveBeenCalled();
    });
  });

  describe('pause and resume', () => {
    it('should pause synth and mark inactive while still speaking', () => {
      service.speak('Simmer');
      service.pause();

      expect(mockSynth.pause).toHaveBeenCalled();
      expect(service.speaking()).toBe(true);
      expect(service.paused()).toBe(true);
      expect(service.active()).toBe(false);
    });

    it('should resume synth and reactivate', () => {
      service.speak('Simmer');
      service.pause();
      service.resume();

      expect(mockSynth.resume).toHaveBeenCalled();
      expect(service.paused()).toBe(false);
      expect(service.active()).toBe(true);
    });

    it('should no-op pause when not speaking', () => {
      service.pause();
      expect(mockSynth.pause).not.toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('should cancel synth and clear state', () => {
      service.speak('Done');
      service.stop();

      expect(mockSynth.cancel).toHaveBeenCalled();
      expect(service.speaking()).toBe(false);
      expect(service.active()).toBe(false);
    });
  });
});
