import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useDychaniTimer } from '@hooks/useDychaniTimer';

describe('useDychaniTimer', () => {
  const mockSetBreathTime = vi.fn();
  const mockPlayFinalSound = vi.fn();
  const mockSetIsBreathing = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize without errors', () => {
    renderHook(() =>
      useDychaniTimer(
        false,
        60,
        mockSetBreathTime,
        'in',
        4,
        6,
        'test-sound.mp3',
        mockPlayFinalSound,
        mockSetIsBreathing
      )
    );

    expect(mockSetBreathTime).not.toHaveBeenCalled();
  });

  it('should countdown time when breathing', () => {
    renderHook(() =>
      useDychaniTimer(
        true,
        60,
        mockSetBreathTime,
        'in',
        4,
        6,
        'test-sound.mp3',
        mockPlayFinalSound,
        mockSetIsBreathing
      )
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockSetBreathTime).toHaveBeenCalled();
  });

  it('should stop breathing when time reaches zero', () => {
    renderHook(() =>
      useDychaniTimer(
        true,
        1,
        mockSetBreathTime,
        'in',
        4,
        6,
        'test-sound.mp3',
        mockPlayFinalSound,
        mockSetIsBreathing
      )
    );

    act(() => {
      vi.advanceTimersByTime(2000);
      vi.runOnlyPendingTimers();
    });

    expect(mockSetIsBreathing).toHaveBeenCalledWith(false);
  });

  it('should not countdown when not breathing', () => {
    const initialTime = 60;
    renderHook(() =>
      useDychaniTimer(
        false,
        initialTime,
        mockSetBreathTime,
        'in',
        4,
        6,
        'test-sound.mp3',
        mockPlayFinalSound,
        mockSetIsBreathing
      )
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Should not call setBreathTime when not breathing
    expect(mockSetBreathTime).not.toHaveBeenCalled();
  });
});

