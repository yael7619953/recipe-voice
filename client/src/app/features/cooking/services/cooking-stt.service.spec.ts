import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TranslateLoader, provideTranslateService } from '@ngx-translate/core';
import { vi } from 'vitest';

import { CookingSttService } from './cooking-stt.service';

class FakeTranslateLoader extends TranslateLoader {
  getTranslation() {
    return of({});
  }
}

/** In-memory stand-in for a Web Speech `SpeechRecognition` instance. */
class MockRecognition {
  continuous = false;
  interimResults = false;
  lang = '';
  onresult: ((event: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;

  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();

  static instances: MockRecognition[] = [];

  constructor() {
    MockRecognition.instances.push(this);
  }

  /** Simulate the recognizer emitting a final transcript. */
  emitResult(transcript: string): void {
    this.onresult?.({ results: [[{ transcript }]] });
  }
}

function flushEffects(): void {
  TestBed.tick();
}

describe('CookingSttService', () => {
  let service: CookingSttService;

  function setup(withApi = true) {
    MockRecognition.instances = [];
    if (withApi) {
      vi.stubGlobal('SpeechRecognition', MockRecognition);
    }

    TestBed.configureTestingModule({
      providers: [
        CookingSttService,
        provideTranslateService({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader },
        }),
      ],
    });

    service = TestBed.inject(CookingSttService);
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe('support detection', () => {
    it('should report supported when the API exists', () => {
      setup(true);
      expect(service).toBeTruthy();
      expect(service.supported).toBe(true);
    });

    it('should report unsupported when no SpeechRecognition API', () => {
      setup(false);
      expect(service.supported).toBe(false);
      service.enable();
      expect(service.enabled()).toBe(false);
    });
  });

  describe('parseCommand', () => {
    beforeEach(() => setup(true));

    it.each([
      ['עצור', 'stop'],
      ['stop', 'stop'],
      ['המשך', 'continue'],
      ['continue', 'continue'],
      ['קודם', 'previous'],
      ['back', 'previous'],
      ['הבא', 'next'],
      ['next', 'next'],
    ])('should parse "%s" as %s', (input, expected) => {
      expect(service.parseCommand(input)).toBe(expected);
    });

    it('should ignore punctuation and casing', () => {
      expect(service.parseCommand('  STOP! ')).toBe('stop');
      expect(service.parseCommand('עצור,')).toBe('stop');
    });

    it('should find the command inside a longer utterance', () => {
      expect(service.parseCommand('ok next please')).toBe('next');
    });

    it('should prefer the multi-word phrase over a single-word alias', () => {
      expect(service.parseCommand('המשך הלאה')).toBe('next');
    });

    it('should return null for unknown text', () => {
      expect(service.parseCommand('make me a sandwich')).toBeNull();
      expect(service.parseCommand('')).toBeNull();
    });
  });

  describe('enable / toggle', () => {
    beforeEach(() => setup(true));

    it('should start listening when enabled', () => {
      service.enable();
      expect(service.enabled()).toBe(true);
      expect(service.listening()).toBe(true);
      expect(MockRecognition.instances).toHaveLength(1);
      expect(MockRecognition.instances[0].start).toHaveBeenCalled();
      expect(MockRecognition.instances[0].continuous).toBe(true);
      expect(MockRecognition.instances[0].interimResults).toBe(false);
    });

    it('should toggle on and off', () => {
      expect(service.toggle()).toBe(true);
      expect(service.listening()).toBe(true);

      expect(service.toggle()).toBe(false);
      expect(service.enabled()).toBe(false);
      expect(service.listening()).toBe(false);
      expect(MockRecognition.instances[0].abort).toHaveBeenCalled();
    });
  });

  describe('command dispatch', () => {
    let handlers: {
      isTtsActive: ReturnType<typeof signal<boolean>>;
      onStop: ReturnType<typeof vi.fn<() => void>>;
      onContinue: ReturnType<typeof vi.fn<() => void>>;
      onPrevious: ReturnType<typeof vi.fn<() => void>>;
      onNext: ReturnType<typeof vi.fn<() => void>>;
    };

    beforeEach(() => {
      setup(true);
      handlers = {
        isTtsActive: signal(false),
        onStop: vi.fn<() => void>(),
        onContinue: vi.fn<() => void>(),
        onPrevious: vi.fn<() => void>(),
        onNext: vi.fn<() => void>(),
      };
      service.attach(handlers);
      flushEffects();
      service.enable();
    });

    it('should invoke the matching callback for a recognized command', () => {
      const rec = MockRecognition.instances[0];
      rec.emitResult('הבא');
      expect(handlers.onNext).toHaveBeenCalledTimes(1);

      rec.emitResult('stop');
      expect(handlers.onStop).toHaveBeenCalledTimes(1);

      rec.emitResult('המשך');
      expect(handlers.onContinue).toHaveBeenCalledTimes(1);

      rec.emitResult('previous');
      expect(handlers.onPrevious).toHaveBeenCalledTimes(1);
    });

    it('should ignore unrecognized transcripts', () => {
      MockRecognition.instances[0].emitResult('hello world');
      expect(handlers.onStop).not.toHaveBeenCalled();
      expect(handlers.onNext).not.toHaveBeenCalled();
    });
  });

  describe('continuous restart', () => {
    beforeEach(() => setup(true));

    it('should restart recognition after onend while enabled', () => {
      vi.useFakeTimers();
      service.enable();
      expect(MockRecognition.instances).toHaveLength(1);

      MockRecognition.instances[0].onend?.();
      expect(service.listening()).toBe(false);

      vi.runOnlyPendingTimers();
      expect(MockRecognition.instances).toHaveLength(2);
      expect(service.listening()).toBe(true);
    });

    it('should not restart after being disabled', () => {
      vi.useFakeTimers();
      service.enable();
      service.disable();

      MockRecognition.instances[0].onend?.();
      vi.runOnlyPendingTimers();

      expect(MockRecognition.instances).toHaveLength(1);
    });
  });

  describe('error handling', () => {
    beforeEach(() => setup(true));

    it('should disable on a permission error', () => {
      service.enable();
      MockRecognition.instances[0].onerror?.({ error: 'not-allowed' });

      expect(service.enabled()).toBe(false);
      expect(service.listening()).toBe(false);
    });

    it('should retry after a transient error', () => {
      vi.useFakeTimers();
      service.enable();
      MockRecognition.instances[0].onerror?.({ error: 'network' });

      vi.runOnlyPendingTimers();
      expect(MockRecognition.instances).toHaveLength(2);
    });
  });

  describe('echo guard', () => {
    it('should mute the mic while TTS is active and resume after', () => {
      setup(true);
      vi.useFakeTimers();
      const isTtsActive = signal(false);
      service.attach({
        isTtsActive,
        onStop: vi.fn<() => void>(),
        onContinue: vi.fn<() => void>(),
        onPrevious: vi.fn<() => void>(),
        onNext: vi.fn<() => void>(),
      });
      flushEffects();
      service.enable();
      expect(service.listening()).toBe(true);

      isTtsActive.set(true);
      flushEffects();
      expect(service.pausedForEcho()).toBe(true);
      expect(service.listening()).toBe(false);
      expect(MockRecognition.instances[0].abort).toHaveBeenCalled();

      isTtsActive.set(false);
      flushEffects();
      expect(service.pausedForEcho()).toBe(false);

      vi.runOnlyPendingTimers();
      expect(MockRecognition.instances.length).toBeGreaterThanOrEqual(2);
      expect(service.listening()).toBe(true);
    });
  });

  describe('indicator', () => {
    beforeEach(() => setup(true));

    it('should reflect off / active / paused-echo states', () => {
      expect(service.indicator()).toBe('off');
      service.enable();
      expect(service.indicator()).toBe('active');
    });
  });

  describe('destroy', () => {
    it('should tear down recognition and reset state', () => {
      setup(true);
      service.enable();
      const rec = MockRecognition.instances[0];
      service.destroy();

      expect(rec.abort).toHaveBeenCalled();
      expect(service.enabled()).toBe(false);
      expect(service.listening()).toBe(false);
    });
  });
});
