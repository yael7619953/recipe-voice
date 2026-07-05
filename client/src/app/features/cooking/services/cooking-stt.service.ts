import { inject, Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

/** Semantic voice commands the cooking screen understands. */
export type CookingVoiceCommand = 'next' | 'previous' | 'stop' | 'continue';

/** BCP-47 recognition locale per interface language. */
const LANG_MAP: Record<string, string> = {
  he: 'he-IL',
  en: 'en-US',
};

/**
 * Spoken phrases mapped to a command, per language. Kept lowercase; matching is
 * substring-based so natural phrasing ("go to the next step") still resolves.
 */
const PHRASES: Record<string, Record<CookingVoiceCommand, string[]>> = {
  he: {
    next: ['הבא', 'קדימה', 'המשך שלב', 'שלב הבא'],
    previous: ['הקודם', 'אחורה', 'שלב קודם', 'חזור'],
    stop: ['עצור', 'עצירה', 'השהה', 'רגע'],
    continue: ['המשך', 'תמשיך', 'הפעל'],
  },
  en: {
    next: ['next', 'forward', 'next step'],
    previous: ['previous', 'back', 'go back', 'last step'],
    stop: ['stop', 'pause', 'wait', 'hold on'],
    continue: ['continue', 'resume', 'go on', 'play'],
  },
};

/**
 * Minimal shape of the Web Speech API recognition object. Typed locally because
 * `SpeechRecognition` is not part of the standard DOM lib typings.
 */
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
}

interface SpeechRecognitionResultEventLike {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

/**
 * Continuous speech-to-text for the cooking screen (Web Speech API).
 *
 * Owns only the microphone and phrase→command mapping. The owning component
 * (Yael, M11) wires the emitted commands to navigation and pauses listening
 * while TTS is active (echo guard) via {@link pauseListening}/{@link resumeListening}.
 *
 * Recognition is Chromium-only; {@link supported} lets the UI hide voice controls
 * when unavailable.
 */
@Injectable()
export class CookingSttService {
  private translate = inject(TranslateService);

  private readonly recognitionCtor: SpeechRecognitionCtor | null = this.resolveCtor();
  private recognition: SpeechRecognitionLike | null = null;

  /** True while the user has voice control enabled (independent of transient mutes). */
  private enabled = false;
  /** True while listening is temporarily suspended (e.g. during TTS playback). */
  private muted = false;

  private onCommand: ((command: CookingVoiceCommand) => void) | null = null;

  private readonly _listening = signal(false);
  /** True while the microphone is actively capturing audio. */
  readonly listening = this._listening.asReadonly();

  /** Whether the current browser exposes the Web Speech recognition API. */
  readonly supported = this.recognitionCtor !== null;

  /**
   * Begin listening and route recognized commands to `handler`.
   * No-op when recognition is unsupported.
   */
  start(handler: (command: CookingVoiceCommand) => void): void {
    if (!this.supported) {
      return;
    }
    this.onCommand = handler;
    this.enabled = true;
    this.muted = false;
    this.launch();
  }

  /** Stop listening entirely and release the recognition instance. */
  stop(): void {
    this.enabled = false;
    this.muted = false;
    this.onCommand = null;
    this.teardown();
  }

  /** Whether voice control is currently enabled by the user. */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Temporarily suspend capture without disabling voice control. Used as the
   * echo guard while the app is speaking (TTS active).
   */
  pauseListening(): void {
    if (!this.enabled || this.muted) {
      return;
    }
    this.muted = true;
    this.teardown();
  }

  /** Resume capture after a {@link pauseListening}, if voice control is still on. */
  resumeListening(): void {
    if (!this.enabled || !this.muted) {
      return;
    }
    this.muted = false;
    this.launch();
  }

  private launch(): void {
    if (!this.recognitionCtor || !this.enabled || this.muted || this.recognition) {
      return;
    }

    const recognition = new this.recognitionCtor();
    recognition.lang = this.resolveLang();
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event) => this.handleResult(event);
    recognition.onerror = (event) => this.handleError(event.error);
    recognition.onend = () => this.handleEnd();

    this.recognition = recognition;
    this._listening.set(true);
    try {
      recognition.start();
    } catch {
      // start() throws if called while already starting; ignore and let onend recover.
    }
  }

  private teardown(): void {
    this._listening.set(false);
    const recognition = this.recognition;
    if (!recognition) {
      return;
    }
    this.recognition = null;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    try {
      recognition.abort();
    } catch {
      // abort() can throw if recognition never started; safe to ignore.
    }
  }

  private handleResult(event: SpeechRecognitionResultEventLike): void {
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const transcript = event.results[i]?.[0]?.transcript;
      if (!transcript) {
        continue;
      }
      const command = this.matchCommand(transcript.toLowerCase());
      if (command) {
        this.onCommand?.(command);
        return;
      }
    }
  }

  private handleError(error: string): void {
    // "no-speech"/"aborted" are expected during pauses; only a fatal error stops us.
    if (error === 'not-allowed' || error === 'service-not-allowed') {
      this.stop();
    }
  }

  private handleEnd(): void {
    this._listening.set(false);
    this.recognition = null;
    // The API auto-stops after silence; relaunch to keep listening continuously.
    if (this.enabled && !this.muted) {
      this.launch();
    }
  }

  private matchCommand(transcript: string): CookingVoiceCommand | null {
    const lang = this.translate.currentLang() ?? 'he';
    const table = PHRASES[lang] ?? PHRASES['he'];
    const commands: CookingVoiceCommand[] = ['next', 'previous', 'stop', 'continue'];
    for (const command of commands) {
      if (table[command].some((phrase) => transcript.includes(phrase))) {
        return command;
      }
    }
    return null;
  }

  private resolveLang(): string {
    const lang = this.translate.currentLang() ?? 'he';
    return LANG_MAP[lang] ?? LANG_MAP['he'];
  }

  private resolveCtor(): SpeechRecognitionCtor | null {
    if (typeof window === 'undefined') {
      return null;
    }
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
  }
}
