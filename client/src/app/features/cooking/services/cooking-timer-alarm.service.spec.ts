import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { CookingTimerAlarmService } from './cooking-timer-alarm.service';

describe('CookingTimerAlarmService', () => {
  let service: CookingTimerAlarmService;
  let mockOscillator: {
    type: string;
    frequency: { value: number };
    connect: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
  };
  let mockCtx: {
    state: string;
    currentTime: number;
    destination: object;
    createOscillator: ReturnType<typeof vi.fn>;
    createGain: ReturnType<typeof vi.fn>;
    resume: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockOscillator = {
      type: 'sine',
      frequency: { value: 0 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };

    mockCtx = {
      state: 'running',
      currentTime: 0,
      destination: {},
      createOscillator: vi.fn(() => mockOscillator),
      createGain: vi.fn(() => ({
        gain: {
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      })),
      resume: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };

    vi.stubGlobal(
      'AudioContext',
      vi.fn(function MockAudioContext(this: typeof mockCtx) {
        return mockCtx;
      }),
    );

    TestBed.configureTestingModule({});
    service = TestBed.runInInjectionContext(() => new CookingTimerAlarmService());
  });

  afterEach(() => {
    service.stop();
    vi.unstubAllGlobals();
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  describe('prepare', () => {
    it('should create and resume a suspended audio context', () => {
      mockCtx.state = 'suspended';
      service.prepare();

      expect(AudioContext).toHaveBeenCalledOnce();
      expect(mockCtx.resume).toHaveBeenCalled();
    });

    it('should not throw when called twice', () => {
      service.prepare();
      service.prepare();

      expect(AudioContext).toHaveBeenCalledOnce();
    });
  });

  describe('play', () => {
    it('should schedule oscillators for each melody note', () => {
      service.prepare();
      service.play();

      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(6);
      expect(mockOscillator.start).toHaveBeenCalledTimes(6);
      expect(mockOscillator.stop).toHaveBeenCalledTimes(6);
    });

    it('should stop previous oscillators before playing again', () => {
      service.prepare();
      service.play();
      service.play();

      expect(mockOscillator.stop).toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('should stop oscillators and close the audio context', () => {
      service.prepare();
      service.play();
      service.stop();

      expect(mockOscillator.stop).toHaveBeenCalled();
      expect(mockCtx.close).toHaveBeenCalled();
    });
  });
});
