import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import DychaniScreen from '@features/meditation/screens/DychaniScreen';

// Mock dependencies
vi.mock('@contexts/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    t: vi.fn((key) => key)
  }))
}));

vi.mock('@contexts/ShaderSettingsContext', () => ({
  useShaderSettings: vi.fn(() => ({
    shaderSettings: { dychani: 'default' },
    getColorForSection: vi.fn(() => null),
    getOverlaySettings: vi.fn(() => ({}))
  }))
}));

vi.mock('@hooks', () => ({
  useDychaniSounds: vi.fn(),
  useAdaptiveTextColors: vi.fn(() => ({
    heading: 'text-gray-900',
    primary: 'text-gray-800',
    secondary: 'text-gray-600',
    isDark: false
  })),
  useCountdownSound: vi.fn(),
  useFinalSound: vi.fn(() => vi.fn())
}));

vi.mock('@features/meditation/components/BackgroundSettingsControls', () => ({
  default: () => <div data-testid="background-settings" />
}));

vi.mock('@features/meditation/components/DychaniTimer', () => ({
  default: () => <div data-testid="meditation-timer" />,
  DychaniTimeDisplay: () => <div data-testid="time-display" />
}));

vi.mock('@features/meditation/components/DychaniControls', () => ({
  default: () => <div data-testid="meditation-controls" />
}));

vi.mock('@features/meditation/components/DychaniSettings', () => ({
  default: () => <div data-testid="meditation-settings" />
}));

vi.mock('@features/meditation/hooks/useDychaniState', () => ({
  useDychaniState: vi.fn(() => ({
    showGallery: false,
    setShowGallery: vi.fn(),
    showDurationPicker: false,
    setShowDurationPicker: vi.fn(),
    showPreparationPicker: false,
    setShowPreparationPicker: vi.fn(),
    showRhythmPicker: false,
    setShowRhythmPicker: vi.fn(),
    breathCycleTime: 0,
    breathRhythmProgress: 0,
    inPhaseProgress: 50,
    animationDuration: 0.3,
    initialScale: 1,
    minScale: 0.55,
    maxScale: 1.25
  }))
}));

vi.mock('@components', () => ({
  FramerSection: ({ children }) => <div>{children}</div>,
  FramerPageTransition: ({ children }) => <div>{children}</div>,
  BackButton: () => <button data-testid="back-button">Back</button>,
  BackgroundShader: () => <div data-testid="background-shader" />
}));

describe('MeditationScreen (DychaniScreen)', () => {
  const defaultProps = {
    time: 180,
    selectedDuration: 3,
    isPlaying: false,
    breathPhase: 'in',
    breathInDuration: 4,
    breathOutDuration: 6,
    breathInSound: 'none',
    breathOutSound: 'none',
    breathClickSound: 'none',
    breathFinalSound: 'none',
    breathCountdownSound: 'none',
    breathSoundFadeEnabled: true,
    onDurationChange: vi.fn(),
    onPlayPause: vi.fn(),
    onReset: vi.fn(),
    onNavigateToScreen: vi.fn(),
    onTouchStart: vi.fn(),
    onTouchMove: vi.fn(),
    onTouchEnd: vi.fn(),
    onBreathSoundChange: vi.fn(),
    onBreathRhythmChange: vi.fn(),
    onPreparationTimeChange: vi.fn(),
    isPreparing: false,
    preparationCountdown: 0,
    preparationTime: 10
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with required props', () => {
    render(<DychaniScreen {...defaultProps} />);

    expect(screen.getByTestId('meditation-timer')).toBeInTheDocument();
    expect(screen.getByTestId('meditation-controls')).toBeInTheDocument();
    expect(screen.getByTestId('meditation-settings')).toBeInTheDocument();
  });

  it('should display title', () => {
    render(<DychaniScreen {...defaultProps} />);

    expect(screen.getByText('dychani')).toBeInTheDocument();
  });

  it('should render background shader', () => {
    render(<DychaniScreen {...defaultProps} />);

    expect(screen.getByTestId('background-shader')).toBeInTheDocument();
  });
});

