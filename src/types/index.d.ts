/**
 * Základní TypeScript definice pro Meditation App
 * Poskytuje type safety bez nutnosti migrace na TypeScript
 */

// Audio types
export interface AudioFile {
  fileName: string;
  audioSrc: string;
  title: string;
  duration: string;
  durationSeconds: number;
  gender: 'male' | 'female' | 'none';
  topic: string;
  mediaType: '4F' | '4M' | 'unknown';
  size: number;
  sizeFormatted: string;
  folder: string;
  downloadURL?: string;
  fullPath?: string;
  parsed?: {
    gender: 'male' | 'female' | 'none';
    topic: string;
    title: string;
    mediaType: '4F' | '4M' | 'unknown';
    is4F: boolean;
    is4M: boolean;
  };
}

export interface AudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  progress: number;
  volume: number;
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string | null;
  wasPlayingBeforeSwitch: boolean;
  durationStable: boolean;
}

export interface PlaybackState {
  currentTime: number;
  duration: number;
  isLoading: boolean;
  shouldAutoplay: boolean;
  wasPlayingBeforeSwitch: boolean;
  hasError: boolean;
  errorMessage: string | null;
  durationStable: boolean;
}

// Cache types
export interface CacheEntry<T = any> {
  value: T;
  timestamp: number;
  ttl: number;
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hitRate: number;
  missRate: number;
  totalHits: number;
  totalMisses: number;
}

// Performance types
export interface PerformanceConfig {
  chunkSize: number;
  imageChunkSize: number;
  longTaskThreshold: number;
  performanceLogging: boolean;
  errorMonitoring: boolean;
  yieldTimeout: number;
}

export interface PerformanceMetrics {
  loadTime: number;
  domContentLoaded: number;
  firstPaint?: number;
  firstContentfulPaint?: number;
  memoryUsage?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

// Firebase types
export interface FirebaseMetadata {
  fileName: string;
  fullPath: string;
  downloadURL: string;
  size: number;
  contentType: string;
  timeCreated: string;
  updated: string;
  displayName?: string;
  title?: string;
  duration?: number;
  durationFormatted?: string;
  folder?: string;
  audioSrc?: string;
}

// Language types
export type Language = 'SK' | 'CZ' | 'EN';

export interface LanguageContextType {
  language: Language;
  changeLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

// Navigation types
export type ScreenKey =
  | 'intro'
  | 'home'
  | 'hudba'
  | 'slova'
  | 'album-detail'
  | 'settings'
  | 'database-admin';

export interface NavigationState {
  currentScreen: ScreenKey;
  previousScreen: ScreenKey | null;
  isTransitioning: boolean;
  transitionDirection: 'forward' | 'backward';
}

// Gender types
export type Gender = 'male' | 'female' | 'none' | 'all';

// Service types
export interface ServiceError {
  message: string;
  code?: string;
  stack?: string;
  timestamp: number;
  context?: Record<string, any>;
}

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ServiceError;
  timestamp: number;
}

// Component props types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface AudioPlayerProps extends BaseComponentProps {
  audioSrc: string;
  title: string;
  onClose: () => void;
  albumCover?: string | null;
  albumTracks?: Array<{
    audioSrc: string;
    trackName: string;
    fileName: string;
  }>;
  currentTrackIndex?: number;
  onTrackChange?: (index: number) => void;
  allFiles?: AudioFile[];
  autoplayEnabled?: boolean;
  onAutoplayChange?: (enabled: boolean) => void;
}

// Hook types
export interface UseAudioPlayerReturn {
  audioRef: React.RefObject<HTMLAudioElement>;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string | null;
  progress: number;
  volume: number;
  togglePlayPause: () => void;
  skipBackward: () => void;
  skipForward: () => void;
  handleSeek: (e: React.MouseEvent<HTMLDivElement>) => void;
  formatTime: (time: number) => string;
  fadeOutAndClose: (onClose: () => void, duration?: number) => void;
}

export interface UseVoiceSwitcherReturn {
  selectedVoice: 'male' | 'female';
  currentVoice: 'male' | 'female' | null;
  hasVariants: boolean;
  handleVoiceChange: (voice: 'male' | 'female') => string | null;
  currentFileInfo: any;
}

// Admin panel types
export interface AdminStats {
  totalFiles: number;
  totalSize: number;
  totalSizeFormatted: string;
  byFolder: Record<string, {
    count: number;
    size: number;
    sizeFormatted: string;
  }>;
}

export interface UpdateStatus {
  status: 'checking' | 'up-to-date' | 'needs-update' | 'error';
  message: string;
  changes?: string[];
}

// Global types
declare global {
  interface Window {
    globalAudioContext?: AudioContext;
    testCachePerformance?: () => void;
    clearCache?: () => void;
    getCacheInfo?: () => any;
  }
}
