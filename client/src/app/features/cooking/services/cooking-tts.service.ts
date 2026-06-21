import { computed, inject, Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

/** BCP-47 voice locale per interface language. */
const LANG_MAP: Record<string, string> = {
  he: 'he-IL',
  en: 'en-US',
};

/**
 * Wraps the Web Speech API (`window.speechSynthesis`) to read cooking steps aloud.
 *
 * Exposes reactive signals so the owning component can publish a single
 * "TTS is speaking" state used by the STT layer to mute the microphone and
 * avoid echo (the mic otherwise hears the synthesized voice as a command).
 */
@Injectable()
export class CookingTtsService {
  private translate = inject(TranslateService);

  private readonly synth: SpeechSynthesis | null =
    typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;

  private current: SpeechSynthesisUtterance | null = null;

  private readonly _speaking = signal(false);
  private readonly _paused = signal(false);

  /** True between `onstart` and `onend`/`onerror`, including while paused. */
  readonly speaking = this._speaking.asReadonly();
  /** True while playback is paused via `pause()`. */
  readonly paused = this._paused.asReadonly();

  /**
   * Echo-prevention contract: true only while audio is actively produced.
   * The STT layer reads this to pause the microphone while the app talks.
   */
  readonly active = computed(() => this._speaking() && !this._paused());

  /** Whether the current browser supports speech synthesis. */
  readonly supported = this.synth !== null;

  /** Read the given text aloud, cancelling any in-progress utterance first. */
  speak(text: string): void {
    if (!this.synth || !text?.trim()) {
      return;
    }

    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.resolveLang();
    const voice = this.pickVoice(utterance.lang);
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onstart = () => {
      this._speaking.set(true);
      this._paused.set(false);
    };
    utterance.onend = () => this.reset();
    utterance.onerror = () => this.reset();

    this.current = utterance;
    this.synth.speak(utterance);
  }

  /** Stop playback entirely and clear state. */
  stop(): void {
    if (!this.synth) {
      return;
    }
    this.synth.cancel();
    this.reset();
  }

  /** Pause the current utterance (state stays "speaking" but inactive). */
  pause(): void {
    if (!this.synth || !this._speaking()) {
      return;
    }
    this.synth.pause();
    this._paused.set(true);
  }

  /** Resume a previously paused utterance. */
  resume(): void {
    if (!this.synth || !this._paused()) {
      return;
    }
    this.synth.resume();
    this._paused.set(false);
  }

  private reset(): void {
    this._speaking.set(false);
    this._paused.set(false);
    this.current = null;
  }

  private resolveLang(): string {
    const lang = this.translate.currentLang() ?? 'he';
    return LANG_MAP[lang] ?? LANG_MAP['he'];
  }

  /** Best-effort match of an installed voice to the target locale. */
  private pickVoice(lang: string): SpeechSynthesisVoice | null {
    if (!this.synth) {
      return null;
    }
    const voices = this.synth.getVoices();
    const prefix = lang.split('-')[0];
    return voices.find((v) => v.lang === lang) ?? voices.find((v) => v.lang.startsWith(prefix)) ?? null;
  }
}
