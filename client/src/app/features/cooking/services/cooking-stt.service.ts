import {
  computed,
  effect,
  EffectRef,
  inject,
  Injectable,
  Injector,
  Signal,
  signal,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

/** Voice commands understood while cooking. */
export type CookingVoiceCommand = 'stop' | 'continue' | 'previous' | 'next';

/** Host hooks the STT layer drives when a command is recognized. */
export interface CookingSttHandlers {
  /** Signal that is true while the app is reading a step aloud (echo source). */
  isTtsActive: Signal<boolean>;
  onStop: () => void;
  onContinue: () => void;
  onPrevious: () => void;
  onNext: () => void;
}

/** BCP-47 recognition locale per interface language (mirrors the TTS service). */
const LANG_MAP: Record<string, string> = {
  he: 'he-IL',
  en: 'en-US',
};

/**
 * Command aliases keyed by command. Matched against the raw STT transcript, so
 * both Hebrew and English spellings are listed explicitly — the recognizer
 * returns free text, not i18n keys. Multi-word phrases are matched before
 * single words so e.g. "המשך הלאה" resolves to `next` rather than `continue`.
 */
const COMMAND_ALIASES: ReadonlyArray<readonly [CookingVoiceCommand, readonly string[]]> = [
  ['next', ['המשך הלאה', 'go on', 'הבא', 'הלאה', 'קדימה', 'next', 'forward']],
  ['previous', ['הקודם', 'קודם', 'אחורה', 'חזור', 'previous', 'back', 'prev']],
  ['stop', ['עצור', 'עצרי', 'עצירה', 'די', 'stop', 'pause', 'halt']],
  ['continue', ['המשך', 'תמשיך', 'המשיכי', 'continue', 'resume']],
];

/** Delay before restarting recognition after the app stops talking (echo buffer). */
const ECHO_RESUME_DELAY_MS = 300;
/** Delay before retrying recognition after a transient error. */
const ERROR_RETRY_DELAY_MS = 500;

/**
 * Continuous speech-to-text layer for the cooking screen.
 *
 * Listens for a small set of navigation commands (stop / continue / previous /
 * next) in Hebrew and English via the Web Speech API and forwards them to the
 * owning component through {@link attach}. While the app is reading a step aloud
 * (`isTtsActive`) the microphone is muted to avoid the app hearing its own
 * voice (echo guard).
 *
 * Provided at the component level (like {@link CookingTtsService}); the host is
 * responsible for calling {@link destroy} on teardown.
 */
@Injectable()
export class CookingSttService {
  private translate = inject(TranslateService);
  private injector = inject(Injector);

  private readonly SpeechRecognitionCtor: SpeechRecognitionConstructor | null =
    typeof window !== 'undefined'
      ? (window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null)
      : null;

  private recognition: SpeechRecognitionLike | null = null;
  private handlers: CookingSttHandlers | null = null;
  private echoEffect: EffectRef | null = null;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  /** True while a `stop()`/`abort()` we triggered is in flight, so `onend` won't restart. */
  private suppressRestart = false;

  private readonly _enabled = signal(false);
  private readonly _listening = signal(false);
  private readonly _pausedForEcho = signal(false);

  /** Whether the browser exposes the Web Speech recognition API. */
  readonly supported = this.SpeechRecognitionCtor !== null;
  /** True when the user has switched voice commands on. */
  readonly enabled = this._enabled.asReadonly();
  /** True while a recognition session is actively running. */
  readonly listening = this._listening.asReadonly();
  /** True while the mic is muted because the app is talking (echo guard). */
  readonly pausedForEcho = this._pausedForEcho.asReadonly();

  /** Convenience state for the UI indicator: on / muted-by-echo / off. */
  readonly indicator = computed<'active' | 'paused-echo' | 'off'>(() => {
    if (!this._enabled()) {
      return 'off';
    }
    return this._pausedForEcho() ? 'paused-echo' : 'active';
  });

  /**
   * Wire the service to its host. Sets up the echo guard on `isTtsActive` and
   * stores the command callbacks. Safe to call once from the component's
   * `ngOnInit`.
   */
  attach(handlers: CookingSttHandlers): void {
    this.handlers = handlers;

    this.echoEffect?.destroy();
    this.echoEffect = effect(
      () => {
        const talking = handlers.isTtsActive();
        if (talking) {
          this.pauseForEcho();
        } else {
          this.resumeAfterEcho();
        }
      },
      { injector: this.injector },
    );
  }

  /** Turn voice commands on/off. Returns the new enabled state. */
  toggle(): boolean {
    if (this._enabled()) {
      this.disable();
    } else {
      this.enable();
    }
    return this._enabled();
  }

  /** Turn voice commands on and begin listening (no-op if unsupported). */
  enable(): void {
    if (!this.supported || this._enabled()) {
      return;
    }
    this._enabled.set(true);
    this._pausedForEcho.set(false);
    this.start();
  }

  /** Turn voice commands off and stop listening. */
  disable(): void {
    if (!this._enabled()) {
      return;
    }
    this._enabled.set(false);
    this._pausedForEcho.set(false);
    this.stop();
  }

  /**
   * Parse a raw transcript into a known command, or `null` if none match.
   * Normalizes case, punctuation and whitespace, then matches whole words
   * (or multi-word phrases) so a longer utterance like "ok next please" still
   * resolves to `next`.
   */
  parseCommand(transcript: string): CookingVoiceCommand | null {
    const normalized = this.normalize(transcript);
    if (!normalized) {
      return null;
    }
    const words = normalized.split(' ');

    // First pass: multi-word phrases (more specific).
    for (const [command, aliases] of COMMAND_ALIASES) {
      for (const alias of aliases) {
        if (alias.includes(' ') && normalized.includes(alias)) {
          return command;
        }
      }
    }
    // Second pass: single-word aliases.
    for (const [command, aliases] of COMMAND_ALIASES) {
      for (const alias of aliases) {
        if (!alias.includes(' ') && words.includes(alias)) {
          return command;
        }
      }
    }
    return null;
  }

  /** Tear down recognition, the echo effect and any pending timers. */
  destroy(): void {
    this.clearRestartTimer();
    this.echoEffect?.destroy();
    this.echoEffect = null;
    this.suppressRestart = true;
    this.teardownRecognition();
    this.handlers = null;
    this._enabled.set(false);
    this._listening.set(false);
    this._pausedForEcho.set(false);
  }

  private start(): void {
    if (!this.SpeechRecognitionCtor || !this._enabled() || this._pausedForEcho()) {
      return;
    }
    if (this._listening()) {
      return;
    }

    const recognition = new this.SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = this.resolveLang();

    recognition.onresult = (event) => this.handleResult(event);
    recognition.onend = () => this.handleEnd();
    recognition.onerror = (event) => this.handleError(event);

    this.recognition = recognition;
    this.suppressRestart = false;
    try {
      recognition.start();
      this._listening.set(true);
    } catch {
      // start() throws if a session is already active; treat as already-listening.
      this._listening.set(true);
    }
  }

  private stop(): void {
    this.clearRestartTimer();
    this.suppressRestart = true;
    this.teardownRecognition();
    this._listening.set(false);
  }

  private handleResult(event: SpeechRecognitionEventLike): void {
    const results = event.results;
    if (!results?.length) {
      return;
    }
    const transcript = results[results.length - 1]?.[0]?.transcript ?? '';
    const command = this.parseCommand(transcript);
    if (command) {
      this.dispatch(command);
    }
  }

  private handleEnd(): void {
    this._listening.set(false);
    // Chrome ends a continuous session after silence; restart if still active.
    if (this._enabled() && !this._pausedForEcho() && !this.suppressRestart) {
      this.scheduleRestart(0);
    }
  }

  private handleError(event: SpeechRecognitionErrorLike): void {
    this._listening.set(false);
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      // Permission denied — turn the feature off rather than looping.
      this._enabled.set(false);
      this.suppressRestart = true;
      return;
    }
    if (event.error === 'aborted') {
      return;
    }
    if (this._enabled() && !this._pausedForEcho()) {
      this.scheduleRestart(ERROR_RETRY_DELAY_MS);
    }
  }

  private dispatch(command: CookingVoiceCommand): void {
    const handlers = this.handlers;
    if (!handlers) {
      return;
    }
    switch (command) {
      case 'stop':
        handlers.onStop();
        break;
      case 'continue':
        handlers.onContinue();
        break;
      case 'previous':
        handlers.onPrevious();
        break;
      case 'next':
        handlers.onNext();
        break;
    }
  }

  private pauseForEcho(): void {
    if (this._pausedForEcho()) {
      return;
    }
    this._pausedForEcho.set(true);
    this.clearRestartTimer();
    this.suppressRestart = true;
    this.teardownRecognition();
    this._listening.set(false);
  }

  private resumeAfterEcho(): void {
    if (!this._pausedForEcho()) {
      return;
    }
    this._pausedForEcho.set(false);
    if (this._enabled()) {
      this.scheduleRestart(ECHO_RESUME_DELAY_MS);
    }
  }

  private scheduleRestart(delayMs: number): void {
    this.clearRestartTimer();
    this.restartTimer = setTimeout(() => {
      this.restartTimer = null;
      this.start();
    }, delayMs);
  }

  private clearRestartTimer(): void {
    if (this.restartTimer !== null) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
  }

  private teardownRecognition(): void {
    const recognition = this.recognition;
    if (!recognition) {
      return;
    }
    recognition.onresult = null;
    recognition.onend = null;
    recognition.onerror = null;
    try {
      recognition.abort();
    } catch {
      // abort() may throw if never started; safe to ignore.
    }
    this.recognition = null;
  }

  private normalize(transcript: string): string {
    if (!transcript) {
      return '';
    }
    return transcript
      .toLowerCase()
      .normalize('NFKC')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private resolveLang(): string {
    const lang = this.translate.currentLang() ?? 'he';
    return LANG_MAP[lang] ?? LANG_MAP['he'];
  }
}

// --- Minimal Web Speech API typings (not in the standard DOM lib) ------------

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

type SpeechRecognitionResultLike = ArrayLike<SpeechRecognitionAlternativeLike>;

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorLike {
  error: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}
