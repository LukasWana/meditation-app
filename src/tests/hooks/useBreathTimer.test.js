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

  it('should trigger final sound exactly at the set duration with continueAfterEnd=true', () => {
    let currentBreathTime = 60; // 1 minuta
    const setBreathTime = vi.fn((updater) => {
      if (typeof updater === 'function') {
        currentBreathTime = updater(currentBreathTime);
        return currentBreathTime;
      }
      return currentBreathTime;
    });
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
          breathTime: 60 // 1 minuta
        }
      }
    );

    // Finální zvuk by se měl naplánovat při startu dýchání
    // Počkej přesně 60 sekund (nastavená délka)
    act(() => {
      vi.advanceTimersByTime(60000); // 60 sekund
      // Aktualizuj breathTime podle intervalu
      for (let i = 0; i < 60; i++) {
        setBreathTime(prev => prev - 1);
      }
      rerender({ isBreathing: true, breathTime: currentBreathTime });
    });

    // playFinalSound by měl být zavolán přesně po 60 sekundách
    expect(playFinalSound).toHaveBeenCalledTimes(1);

    // extraTime by měl začít růst
    act(() => {
      vi.advanceTimersByTime(2000);
      rerender({ isBreathing: true, breathTime: currentBreathTime });
    });

    expect(result.current.extraTime).toBeGreaterThan(0);
  });

  it('should cancel final sound when isBreathing is set to false before duration expires', () => {
    let currentBreathTime = 60; // 1 minuta
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
          breathTime: 60 // 1 minuta
        }
      }
    );

    // Zastav dýchání po 30 sekundách (před vypršením 60 sekund)
    act(() => {
      vi.advanceTimersByTime(30000); // 30 sekund
      rerender({ isBreathing: false, breathTime: currentBreathTime });
    });

    // Počkej až do konce původní délky (60 sekund)
    act(() => {
      vi.advanceTimersByTime(30000); // dalších 30 sekund
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

