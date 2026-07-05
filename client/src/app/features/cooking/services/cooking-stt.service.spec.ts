import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TranslateLoader, provideTranslateService, TranslateService } from '@ngx-translate/core';
import { vi } from 'vitest';

import { CookingSttService, CookingVoiceCommand } from './cooking-stt.service';

class FakeTranslateLoader extends TranslateLoader {
  getTranslation() {
    return of({});
  }
}

/** Controllable stand-in for a Web Speech `SpeechRecognition` instance. */
class MockRecognition {
  lang = '';
  continuous = false;
  interimResults = false;
  onresult: ((event: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;

  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();

  static instances: MockRecognition[] = [];

  constructor() {
    MockRecognition.instances.push(this);
  }

  /** Simulate the engine recognizing a phrase. */
  emit(transcript: string): void {
    this.onresult?.({
      resultIndex: 0,
      results: [[{ transcript }]],
    });
  }
}

function utteranceFor(command: CookingVoiceCommand, lang: 'he' | 'en'): string {
  const phrases: Record<'he' | 'en', Record<CookingVoiceCommand, string>> = {
    he: { next: 'הבא', previous: 'הקודם', stop: 'עצור', continue: 'המשך' },
    en: { next: 'next', previous: 'previous', stop: 'stop', continue: 'continue' },
  };
  return phrases[lang][command];
}

describe('CookingSttService', () => {
  let service: CookingSttService;
  let translate: TranslateService;

  beforeEach(() => {
    MockRecognition.instances = [];
    vi.stubGlobal('SpeechRecognition', MockRecognition);

    TestBed.configureTestingModule({
      providers: [
        CookingSttService,
        provideTranslateService({ loader: { provide: TranslateLoader, useClass: FakeTranslateLoader } }),
      ],
    });

    service = TestBed.inject(CookingSttService);
    translate = TestBed.inject(TranslateService);
    translate.use('he');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should create and report supported', () => {
    expect(service).toBeTruthy();
    expect(service.supported).toBe(true);
  });

  it('should start listening and expose the listening signal', () => {
    service.start(() => {});

    expect(service.isEnabled()).toBe(true);
    expect(service.listening()).toBe(true);
    expect(MockRecognition.instances).toHaveLength(1);
    expect(MockRecognition.instances[0].start).toHaveBeenCalled();
  });

  it('should map Hebrew phrases to commands', () => {
    const commands: CookingVoiceCommand[] = [];
    service.start((c) => commands.push(c));
    const rec = MockRecognition.instances[0];

    rec.emit(utteranceFor('next', 'he'));
    rec.emit(utteranceFor('previous', 'he'));
    rec.emit(utteranceFor('stop', 'he'));

    expect(commands).toEqual(['next', 'previous', 'stop']);
  });

  it('should map English phrases when language is en', () => {
    translate.use('en');
    const commands: CookingVoiceCommand[] = [];
    service.start((c) => commands.push(c));

    MockRecognition.instances[0].emit('please go to the next step');

    expect(commands).toEqual(['next']);
  });

  it('should ignore unrecognized phrases', () => {
    const handler = vi.fn();
    service.start(handler);

    MockRecognition.instances[0].emit('something unrelated');

    expect(handler).not.toHaveBeenCalled();
  });

  it('should mute and resume for the echo guard', () => {
    service.start(() => {});
    const first = MockRecognition.instances[0];

    service.pauseListening();
    expect(first.abort).toHaveBeenCalled();
    expect(service.listening()).toBe(false);
    expect(service.isEnabled()).toBe(true);

    service.resumeListening();
    expect(service.listening()).toBe(true);
    expect(MockRecognition.instances).toHaveLength(2);
  });

  it('should not resume when voice control was fully stopped', () => {
    service.start(() => {});
    service.stop();
    expect(service.isEnabled()).toBe(false);

    service.resumeListening();
    expect(service.listening()).toBe(false);
  });

  it('should relaunch on auto-end while enabled', () => {
    service.start(() => {});
    const first = MockRecognition.instances[0];

    first.onend?.();

    expect(MockRecognition.instances).toHaveLength(2);
    expect(service.listening()).toBe(true);
  });
});
