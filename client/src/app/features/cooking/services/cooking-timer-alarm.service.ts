import { Injectable } from '@angular/core';

/** Short ascending chime played when a step timer reaches zero. */
const MELODY: { freq: number; start: number; duration: number }[] = [
  { freq: 523.25, start: 0, duration: 0.15 },
  { freq: 659.25, start: 0.2, duration: 0.15 },
  { freq: 783.99, start: 0.4, duration: 0.3 },
  { freq: 523.25, start: 0.85, duration: 0.15 },
  { freq: 659.25, start: 1.05, duration: 0.15 },
  { freq: 783.99, start: 1.25, duration: 0.45 },
];

/**
 * Plays a kitchen-timer chime via the Web Audio API when a step countdown ends.
 *
 * Call {@link prepare} from a user gesture (timer start click) so browsers allow
 * playback when the interval fires later.
 */
@Injectable()
export class CookingTimerAlarmService {
  private audioContext: AudioContext | null = null;
  private activeOscillators: OscillatorNode[] = [];

  /** Unlock/resume the audio context — invoke on user interaction before {@link play}. */
  prepare(): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (!this.audioContext) {
      const AudioCtx = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) {
        return;
      }
      this.audioContext = new AudioCtx();
    }

    if (this.audioContext.state === 'suspended') {
      void this.audioContext.resume();
    }
  }

  /** Play the finish chime. Safe to call without a prior {@link prepare} (may be silent). */
  play(): void {
    this.prepare();
    if (!this.audioContext) {
      return;
    }

    this.stopOscillators();

    const ctx = this.audioContext;
    const base = ctx.currentTime;

    for (const note of MELODY) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = note.freq;

      const t0 = base + note.start;
      const t1 = t0 + note.duration;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.35, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t1);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t1 + 0.05);

      this.activeOscillators.push(osc);
    }
  }

  stop(): void {
    this.stopOscillators();
    if (this.audioContext) {
      void this.audioContext.close();
      this.audioContext = null;
    }
  }

  private stopOscillators(): void {
    for (const osc of this.activeOscillators) {
      try {
        osc.stop();
      } catch {
        /* already stopped */
      }
    }
    this.activeOscillators = [];
  }
}
