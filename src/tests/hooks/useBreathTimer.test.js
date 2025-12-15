import { renderHook, act } from '@testing-library/react';
import { useBreathTimer } from '@hooks/useBreathTimer';
import { vi } from 'vitest';

describe('useBreathTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should trigger final sound immediately when breathTime reaches 0 with continueAfterEnd=true', () => {
    const setBreathTime = vi.fn();
    const playFinalSound = vi.fn();
    const setIsBreathing = vi.fn();

    const { result, rerender } = renderHook(
      ({ isBreathing, breathTime }) =>
        useBreathTimer(
          isBreathing,
          breathTime,
          setBreathTime,
          'in',
          4,
          6,
          'test-sound.mp3',
          playFinalSound,
          setIsBreathing,
          true // continueAfterEnd
        ),
      {
        initialProps: {
          isBreathing: true,
          breathTime: 1
        }
      }
    );

    // Simuluj odpočet času - breathTime se změní z 1 na 0
    act(() => {
      rerender({ isBreathing: true, breathTime: 0 });
    });

    // Finální zvuk by se měl naplánovat okamžitě (50ms timeout)
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // playFinalSound by měl být zavolán
    expect(playFinalSound).toHaveBeenCalledTimes(1);

    // extraTime by měl začít růst
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.extraTime).toBeGreaterThan(0);
  });

  it('should cancel final sound when isBreathing is set to false before timeout expires', () => {
    let currentBreathTime = 1;
    const setBreathTime = vi.fn((updater) => {
      if (typeof updater === 'function') {
        currentBreathTime = updater(currentBreathTime);
        return currentBreathTime;
      }
      return currentBreathTime;
    });
    const playFinalSound = vi.fn();
    const setIsBreathing = vi.fn();

    const { rerender } = renderHook(
      ({ isBreathing, breathTime }) =>
        useBreathTimer(
          isBreathing,
          breathTime,
          setBreathTime,
          'in',
          4,
          6,
          'test-sound.mp3',
          playFinalSound,
          setIsBreathing,
          true // continueAfterEnd
        ),
      {
        initialProps: {
          isBreathing: true,
          breathTime: 1
        }
      }
    );

    // Simuluj interval - sníží breathTime z 1 na 0
    act(() => {
      vi.advanceTimersByTime(1000);
      rerender({ isBreathing: true, breathTime: currentBreathTime });
    });

    // Okamžitě zastav dýchání před vypršením timeoutu (setTimeout(0))
    act(() => {
      rerender({ isBreathing: false, breathTime: currentBreathTime });
    });

    // Počkej až do konce timeoutu
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // playFinalSound by NEMĚL být zavolán, protože jsme zastavili před vypršením timeoutu
    expect(playFinalSound).not.toHaveBeenCalled();
  });

  it('should start counting extraTime when breathTime reaches 0 with continueAfterEnd=true', () => {
    const setBreathTime = vi.fn((updater) => {
      if (typeof updater === 'function') {
        const prev = 0;
        return updater(prev);
      }
    });
    const playFinalSound = vi.fn();
    const setIsBreathing = vi.fn();

    const { result } = renderHook(() =>
      useBreathTimer(
        true,
        0, // breathTime už je na 0
        setBreathTime,
        'in',
        4,
        6,
        'test-sound.mp3',
        playFinalSound,
        setIsBreathing,
        true // continueAfterEnd
      )
    );

    // Počkej na interval, který zvyšuje extraTime
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // extraTime by měl být větší než 0
    expect(result.current.extraTime).toBeGreaterThan(0);
  });

  it('should reset extraTime when isBreathing is set to false', () => {
    const setBreathTime = vi.fn();
    const playFinalSound = vi.fn();
    const setIsBreathing = vi.fn();

    const { result, rerender } = renderHook(
      ({ isBreathing, breathTime }) =>
        useBreathTimer(
          isBreathing,
          breathTime,
          setBreathTime,
          'in',
          4,
          6,
          'test-sound.mp3',
          playFinalSound,
          setIsBreathing,
          true
        ),
      {
        initialProps: {
          isBreathing: true,
          breathTime: 0
        }
      }
    );

    // Počkej, aby extraTime začal růst
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.extraTime).toBeGreaterThan(0);

    // Zastav dýchání
    act(() => {
      rerender({ isBreathing: false, breathTime: 0 });
    });

    // extraTime by měl být resetován na 0
    expect(result.current.extraTime).toBe(0);
  });
});

