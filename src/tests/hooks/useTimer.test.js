

import { useState } from 'react';
import { renderHook, act } from '@testing-library/react';
import { useTimer } from '@hooks/useTimer';
import { vi } from 'vitest';

const useTestTimer = (initialTime, initialPlaying = true) => {
  const [time, setTime] = useState(initialTime);
  const [isPlaying, setIsPlaying] = useState(initialPlaying);

  useTimer(isPlaying, time, setTime, setIsPlaying);

  return { time, setTime, isPlaying, setIsPlaying };
};

describe('useTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('spustí odpočet, pokud je přehrávání aktivní', () => {
    const { result } = renderHook(() => useTestTimer(10, true));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.time).toBe(9);
  });

  it('neodpočitává čas, když není přehrávání aktivní', () => {
    const { result } = renderHook(() => useTestTimer(10, false));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.time).toBe(10);
  });

  it('zastaví přehrávání, když čas dosáhne nuly', () => {
    const { result } = renderHook(() => useTestTimer(1, true));

    act(() => {
      vi.advanceTimersByTime(1000);
      vi.runOnlyPendingTimers();
    });

    expect(result.current.isPlaying).toBe(false);
  });

  it('resetuje interval při změně stavu bez závodů', () => {
    const { result, rerender } = renderHook(() => useTestTimer(5, true));

    // Rychlé re-renderování simuluje změny stavu
    rerender();
    rerender();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.time).toBe(4);
  });

  it('uklidí interval při odmountování', () => {
    const { unmount } = renderHook(() => useTestTimer(5, true));

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
