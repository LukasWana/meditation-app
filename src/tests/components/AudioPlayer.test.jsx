import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AudioPlayer from '@features/audio/AudioPlayer';

// Mock dependencies
vi.mock('@features/audio/hooks', () => ({
  useAudioPlayer: vi.fn(() => ({
    audioRef: { current: null },
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    durationStable: false,
    progress: 0,
    togglePlayPause: vi.fn(),
    skipBackward: vi.fn(),
    skipForward: vi.fn(),
    handleSeek: vi.fn(),
    formatTime: vi.fn((time) => '0:00'),
    fadeOutAndClose: vi.fn(),
    cachedAudioUrl: null
  })),
  useAudioPlayerLogic: vi.fn(() => ({
    audioUrl: 'test-audio.mp3',
    firebaseError: null,
    selectedVoice: 'male',
    hasVariants: false,
    availableVoices: ['male'],
    handleVoiceChange: vi.fn(),
    dataSource: 'firebase'
  }))
}));

vi.mock('@hooks/useAudioAnalysis', () => ({
  useAudioAnalysis: vi.fn(() => ({
    frequencies: [],
    amplitude: 0,
    bass: 0,
    mid: 0,
    treble: 0
  }))
}));

vi.mock('@contexts/AudioAnalysisContext', () => ({
  useAudioAnalysis: vi.fn(() => ({
    setAudioData: vi.fn()
  }))
}));

vi.mock('@contexts/ShaderSettingsContext', () => ({
  useShaderSettings: vi.fn(() => ({
    getShaderForSection: vi.fn(() => 'default'),
    setShaderForSection: vi.fn(),
    getColorForSection: vi.fn(() => null)
  }))
}));

vi.mock('@contexts/ShaderPlaybackContext', () => ({
  usePlayback: vi.fn(() => ({
    transitionState: { toShaderKey: 'default' },
    startTransition: vi.fn()
  }))
}));

vi.mock('@features/audio/components', () => ({
  AudioControls: ({ title }) => <div data-testid="audio-controls">{title}</div>,
  AudioPlayerAnimations: ({ children }) => <div data-testid="audio-animations">{children}</div>,
  ShaderSelector: () => <div data-testid="shader-selector" />
}));

describe('AudioPlayer', () => {
  const defaultProps = {
    audioSrc: 'test-audio.mp3',
    title: 'Test Audio',
    onClose: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with required props', () => {
    render(<AudioPlayer {...defaultProps} />);

    expect(screen.getByTestId('audio-controls')).toBeInTheDocument();
    expect(screen.getByTestId('audio-animations')).toBeInTheDocument();
  });

  it('should display title', () => {
    render(<AudioPlayer {...defaultProps} title="Custom Title" />);

    expect(screen.getByText('Custom Title')).toBeInTheDocument();
  });

  it('should render audio element', () => {
    render(<AudioPlayer {...defaultProps} />);

    const audioElement = document.querySelector('audio');
    expect(audioElement).toBeInTheDocument();
  });
});

