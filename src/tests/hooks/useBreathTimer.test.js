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
    const setBreathTime = vi.fn();
    const playFinalSound = vi.fn();
    const setIsBreathing = vi.fn();

    const { result } = renderHook(
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

    // Finální zvuk by se měl spustit přesně po 60 sekundách (nastavená délka)
    // Nová logika používá Date.now() a kontroluje každých 100ms
    act(() => {
      vi.advanceTimersByTime(60000); // 60 sekund
    });

    // playFinalSound by měl být zavolán přesně po 60 sekundách
    expect(playFinalSound).toHaveBeenCalledTimes(1);

    // extraTime by měl začít růst
    act(() => {
      vi.advanceTimersByTime(2000); // další 2 sekundy
    });

    expect(result.current.extraTime).toBeGreaterThan(0);
  });

  it('should cancel final sound when isBreathing is set to false before duration expires', () => {
    const setBreathTime = vi.fn();
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
      rerender({ isBreathing: false, breathTime: 30 });
    });

    // Počkej až do konce původní délky (60 sekund)
    act(() => {
      vi.advanceTimersByTime(30000); // dalších 30 sekund
    });

    // playFinalSound by NEMĚL být zavolán, protože jsme zastavili před vypršením
    expect(playFinalSound).not.toHaveBeenCalled();
  });

  it('should start counting extraTime when breathTime reaches 0 with continueAfterEnd=true', () => {
    const setBreathTime = vi.fn();
    const playFinalSound = vi.fn();
    const setIsBreathing = vi.fn();

    const { result } = renderHook(() =>
      useBreathTimer(
        true,
        60, // Start s 60 sekundami
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

    // Počkej až do konce nastavené délky (60 sekund) + další 2 sekundy pro extraTime
    act(() => {
      vi.advanceTimersByTime(62000); // 60 sekund + 2 sekundy navíc
    });

    // extraTime by měl být větší než 0 (2 sekundy)
    expect(result.current.extraTime).toBeGreaterThanOrEqual(2);
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
          breathTime: 60 // Start s 60 sekundami
        }
      }
    );

    // Počkej až do konce nastavené délky + další 3 sekundy pro extraTime
    act(() => {
      vi.advanceTimersByTime(63000); // 60 sekund + 3 sekundy navíc
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

