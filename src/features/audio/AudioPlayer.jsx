import React, { useMemo } from 'react';
import { useAudioPlayer, useAudioPlayerLogic } from './hooks';
import {
  AudioControls,
  CloseButton,
  AudioPlayerAnimations
} from './components';
import { useActivityTracking } from '@hooks/useActivityTracking';


const AudioPlayer = ({
  audioSrc,
  title,
  onClose,
  className = "",
  albumCover = null,
  albumTracks = null,
  currentTrackIndex = 0,
  onTrackChange = null,
  allFiles = [],
  autoplayEnabled = true,
  onAutoplayChange = null
}) => {
  // Hlavní logika komponenty
  const {
    audioUrl,
    firebaseError,
    selectedVoice,
    hasVariants,
    availableVoices,
    handleVoiceChange,
    dataSource
  } = useAudioPlayerLogic({
    audioSrc,
    albumTracks,
    currentTrackIndex,
    onTrackChange,
    allFiles,
    autoplayEnabled
  });

  // Použij title prop přímo - onTrackChange callback už aktualizuje title správně
  const actualTitle = title;

  const {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    durationStable,
    progress,
    togglePlayPause,
    skipBackward,
    skipForward,
    handleSeek,
    formatTime,
    fadeOutAndClose,
    cachedAudioUrl
  } = useAudioPlayer(audioUrl, albumTracks, currentTrackIndex, onTrackChange, autoplayEnabled);

  // Extrahuj název alba z audioSrc (pokud je v cestě hudba/albumName/track.mp3)
  const albumName = useMemo(() => {
    if (!audioSrc) return null;
    try {
      // Zkus extrahovat z cesty
      const match = audioSrc.match(/hudba\/([^\/]+)\//);
      if (match && match[1]) {
        return match[1];
      }
      // Pokud máme albumTracks s více než jednou skladbou, je to album
      if (albumTracks && albumTracks.length > 1) {
        // Zkus najít album name v prvním tracku
        const firstTrack = albumTracks[0];
        if (firstTrack.audioSrc) {
          const trackMatch = firstTrack.audioSrc.match(/hudba\/([^\/]+)\//);
          if (trackMatch && trackMatch[1]) {
            return trackMatch[1];
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  }, [audioSrc, albumTracks]);

  const rawSrc = audioSrc || audioUrl || '';
  const isSlova = rawSrc.includes('slova');
  const isHudba = rawSrc.includes('hudba');

  // Trackování aktivity pro AudioPlayer:
  // - slova/* patří do sekce "meditation" (uživatel to vnímá jako meditace/afirmace)
  // - hudba/* patří do sekce "music"
  // - ostatní audio netrackujeme (aby se nám to nemíchalo)
  const shouldTrackAudio = isPlaying && !!rawSrc && (isSlova || isHudba);
  const activitySection = isSlova ? 'meditation' : 'music';

  const getAudioDescription = (md) => {
    const title = md?.title || actualTitle || 'Audio';
    if (isSlova) return `Slova: ${title}`;
    // hudba
    if (md?.albumName) return `${title} - ${md.albumName}`;
    return title;
  };

  useActivityTracking({
    section: activitySection,
    isActive: shouldTrackAudio,
    metadata: {
      title: actualTitle,
      audioSrc: rawSrc,
      albumName: albumName,
      duration: duration,
      contentType: isSlova ? 'slova' : (isHudba ? 'hudba' : 'audio')
    },
    getDescription: getAudioDescription
  });

  return (
    <AudioPlayerAnimations
      albumCover={albumCover}
      className={className}
      onClose={onClose}
      fadeOutAndClose={fadeOutAndClose}
    >
      {/* Main content container - max width 600px */}
      <div className="w-full max-w-[600px] h-full flex flex-col items-center justify-center relative">
        {/* Audio Element */}
        <audio
          ref={audioRef}
          src={cachedAudioUrl || audioUrl || undefined}
          preload="metadata"
        />

        {/* Close Button - Top Right */}
        <div className="absolute top-4 right-4 z-10">
          <CloseButton
            onClose={() => fadeOutAndClose(onClose, 3000)}
            className="w-10 h-10 sm:w-12 sm:h-12"
          />
        </div>

        {/* Audio Controls - Centered */}
        <AudioControls
          progress={progress}
          isPlaying={isPlaying}
          currentTime={currentTime}
          title={actualTitle}
          duration={duration}
          durationStable={durationStable}
          onSeek={handleSeek}
          onTogglePlayPause={togglePlayPause}
          onSkipBackward={skipBackward}
          onSkipForward={skipForward}
          formatTime={formatTime}
          autoplayEnabled={autoplayEnabled}
          onAutoplayChange={onAutoplayChange}
          // Voice switcher props
          hasVariants={hasVariants}
          selectedVoice={selectedVoice}
          availableVoices={availableVoices}
          onVoiceChange={handleVoiceChange}
          // Track switcher props
          albumTracks={albumTracks}
          currentTrackIndex={currentTrackIndex}
          onTrackChange={onTrackChange}
          // Data source indicator
          dataSource={dataSource}
          className="w-full flex flex-col items-center justify-center h-full"
        />

        {/* Firebase Error */}
        {firebaseError && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-100 rounded-full">
            <div className="text-center p-4">
              <p className="text-red-600 font-medium">Chyba při načítání audio</p>
              <p className="text-red-500 text-sm">{firebaseError}</p>
            </div>
          </div>
        )}
      </div>
    </AudioPlayerAnimations>
  );
};

export default AudioPlayer;
