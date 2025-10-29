

import { renderHook, act } from '@testing-library/react';
import { useTimer } from '@hooks/useTimer';
import { vi } from 'vitest';

describe('useTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start timer when isPlaying is true and time > 0', () => {
    const setTime = vi.fn();
    const setIsPlaying = vi.fn();

    renderHook(() => useTimer(true, 10, setTime, setIsPlaying));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(setTime).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should not start timer when isPlaying is false', () => {
    const setTime = vi.fn();
    const setIsPlaying = vi.fn();

    renderHook(() => useTimer(false, 10, setTime, setIsPlaying));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(setTime).not.toHaveBeenCalled();
  });

  it('should stop timer when time reaches 0', () => {
    let currentTime = 1;
    const setTime = vi.fn((updater) => {
      // Execute the updater function to simulate real setState behavior
      currentTime = typeof updater === 'function' ? updater(currentTime) : updater;
    });
    const setIsPlaying = vi.fn();

    renderHook(() => useTimer(true, currentTime, setTime, setIsPlaying));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(setIsPlaying).toHaveBeenCalledWith(false);
  });

  it('should prevent race conditions with isUpdatingRef', () => {
    const setTime = vi.fn();
    const setIsPlaying = vi.fn();

    const { rerender } = renderHook(() => useTimer(true, 10, setTime, setIsPlaying));

    // Simuluj rychlé změny
    rerender();
    rerender();
    rerender();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // setTime by mělo být voláno pouze jednou navzdory rychlým změnám
    expect(setTime).toHaveBeenCalledTimes(1);
  });

  it('should cleanup timer on unmount', () => {
    const setTime = vi.fn();
    const setIsPlaying = vi.fn();

    const { unmount } = renderHook(() => useTimer(true, 10, setTime, setIsPlaying));

    unmount();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(setTime).not.toHaveBeenCalled();
  });
});

