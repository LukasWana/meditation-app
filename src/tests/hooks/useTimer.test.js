import { renderHook, act } from '@testing-library/react';
import { useTimer } from '@features/meditation/hooks';
import { vi } from 'vitest';
import { useMeditationStore } from '@stores/meditationStore';

// Mockování store
vi.mock('@stores/meditationStore', () => ({
  useMeditationStore: vi.fn()
}));

describe('useTimer', () => {
  let mockSetTime;
  let mockSetIsPlaying;

  beforeEach(() => {
    vi.useFakeTimers();
    mockSetTime = vi.fn();
    mockSetIsPlaying = vi.fn();

    // Default mock implementation
    useMeditationStore.mockReturnValue({
      isPlaying: false,
      time: 0,
      setTime: mockSetTime,
      setIsPlaying: mockSetIsPlaying
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should start timer when isPlaying is true and time > 0', () => {
    useMeditationStore.mockReturnValue({
      isPlaying: true,
      time: 10,
      setTime: mockSetTime,
      setIsPlaying: mockSetIsPlaying
    });

    renderHook(() => useTimer());

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockSetTime).toHaveBeenCalledWith(9);
  });

  it('should not start timer when isPlaying is false', () => {
    useMeditationStore.mockReturnValue({
      isPlaying: false,
      time: 10,
      setTime: mockSetTime,
      setIsPlaying: mockSetIsPlaying
    });

    renderHook(() => useTimer());

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockSetTime).not.toHaveBeenCalled();
  });

  it('should stop timer when time reaches 0', () => {
    useMeditationStore.mockReturnValue({
      isPlaying: true,
      time: 1,
      setTime: mockSetTime,
      setIsPlaying: mockSetIsPlaying
    });

    renderHook(() => useTimer());

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockSetIsPlaying).toHaveBeenCalledWith(false);
  });

  it('should prevent race conditions with isUpdatingRef', () => {
    useMeditationStore.mockReturnValue({
      isPlaying: true,
      time: 10,
      setTime: mockSetTime,
      setIsPlaying: mockSetIsPlaying
    });

    const { rerender } = renderHook(() => useTimer());

    // Simuluj rychlé změny
    rerender();
    rerender();
    rerender();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // setTime by mělo být voláno pouze jednou navzdory rychlým změnám
    expect(mockSetTime).toHaveBeenCalledTimes(1);
  });

  it('should cleanup timer on unmount', () => {
    useMeditationStore.mockReturnValue({
      isPlaying: true,
      time: 10,
      setTime: mockSetTime,
      setIsPlaying: mockSetIsPlaying
    });

    const { unmount } = renderHook(() => useTimer());

    unmount();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockSetTime).not.toHaveBeenCalled();
  });
});

