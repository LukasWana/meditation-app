import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useVoiceSwitcher } from '@features/audio/hooks/useVoiceSwitcher';

// Mock parsers
vi.mock('@utils/audioParser', () => ({
  parseAudioFileName: vi.fn((fileName) => {
    if (fileName.includes('MSK')) return { gender: 'male', topic: 'test' };
    if (fileName.includes('FSK')) return { gender: 'female', topic: 'test' };
    return { gender: null, topic: 'test' };
  })
}));

vi.mock('@utils/hudbaParser', () => ({
  parseAudioFileName: vi.fn((fileName) => {
    if (fileName.includes('MSK')) return { gender: 'male', topic: 'test' };
    if (fileName.includes('FSK')) return { gender: 'female', topic: 'test' };
    return { gender: null, topic: 'test' };
  })
}));

describe('useVoiceSwitcher', () => {
  const mockAllFiles = [
    { fileName: 'meditace-test-MSK.mp3' },
    { fileName: 'meditace-test-FSK.mp3' },
    { fileName: 'meditace-another-MSK.mp3' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() =>
      useVoiceSwitcher('meditace-test-MSK.mp3', mockAllFiles)
    );

    expect(result.current.selectedVoice).toBe('male');
    expect(result.current.hasVariants).toBeDefined();
    expect(result.current.availableVoices).toBeDefined();
    expect(typeof result.current.handleVoiceChange).toBe('function');
  });

  it('should detect voice variants', () => {
    const { result } = renderHook(() =>
      useVoiceSwitcher('meditace-test-MSK.mp3', mockAllFiles)
    );

    expect(result.current.hasVariants).toBe(true);
    expect(result.current.availableVoices).toContain('male');
    expect(result.current.availableVoices).toContain('female');
  });

  it('should handle voice change', () => {
    const { result } = renderHook(() =>
      useVoiceSwitcher('meditace-test-MSK.mp3', mockAllFiles)
    );

    act(() => {
      const newAudioSrc = result.current.handleVoiceChange('female');
      expect(newAudioSrc).toBeTruthy();
    });

    expect(result.current.selectedVoice).toBe('female');
  });

  it('should return null if no variants available', () => {
    const singleFile = [{ fileName: 'meditace-test.mp3' }];
    const { result } = renderHook(() =>
      useVoiceSwitcher('meditace-test.mp3', singleFile)
    );

    expect(result.current.hasVariants).toBe(false);
  });
});

