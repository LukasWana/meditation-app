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
  onAutoplayChange = null,
  fileName: fileNameProp = null,
  gender = null
}) => {
  const isDev = import.meta?.env?.MODE === 'development';

  // Hlavní logika komponenty
  const {
    audioUrl,
    firebaseError,
    selectedVoice,
    currentVoice,
    hasVariants,
    availableVoices,
    handleVoiceChange,
    dataSource,
    fileName
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

  // Pro detekci typu aktivity použij více způsobů:
  // 1. Zkontroluj folder z allFiles (nejspolehlivější - každý slova soubor má folder: 'slova')
  // 2. Zkontroluj fileName prop nebo fileName z hooku (může obsahovat cestu "slova/...")
  // 3. Heuristika: pokud fileName obsahuje "muzsky" nebo "zensky", je to slova soubor
  // 4. Fallback na rawSrc
  // Důležité: použij audioUrl z hooku (aktualizuje se při změně hlasu), ne audioSrc prop (který zůstává stejný)
  const rawSrc = audioUrl || audioSrc || '';
  // Priorita pro detekci: fileName z hooku (aktualizuje se při změně hlasu) > fileNameProp > rawSrc
  const sourceForDetection = fileName || fileNameProp || rawSrc || '';

  // Detekce podle folder z allFiles (nejspolehlivější)
  const isSlovaByFolder = allFiles && allFiles.length > 0 && allFiles[0]?.folder === 'slova';

  // Detekce podle cesty v fileName
  const isSlovaByPath = sourceForDetection.includes('slova');

  // Heuristika: soubory s prefixy muzsky/zensky jsou slova soubory
  const isSlovaByHeuristic = sourceForDetection.includes('muzsky') || sourceForDetection.includes('zensky');

  // Kombinace všech způsobů detekce
  const isSlova = isSlovaByFolder || isSlovaByPath || isSlovaByHeuristic;
  const isHudba = sourceForDetection.includes('hudba');

  // Debug logování pro meditaci (jen v dev nebo když je problém)
  if (isDev && (isSlova || isHudba)) {
    console.log('🎵 AudioPlayer activity detection:', {
      isSlova,
      isSlovaByFolder,
      isSlovaByPath,
      isSlovaByHeuristic,
      isHudba,
      fileNameProp,
      fileName,
      sourceForDetection,
      rawSrc,
      audioSrc,
      audioUrl,
      allFilesFolder: allFiles?.[0]?.folder,
      isPlaying,
      shouldTrackAudio,
      activitySection: isSlova ? 'meditation' : 'music',
      currentGender,
      selectedVoice,
      currentVoice
    });
  }

  // Trackování aktivity pro AudioPlayer:
  // - slova/* patří do sekce "meditation" (uživatel to vnímá jako meditace/afirmace)
  // - hudba/* patří do sekce "music"
  // - ostatní audio netrackujeme (aby se nám to nemíchalo)
  const shouldTrackAudio = isPlaying && !!sourceForDetection && (isSlova || isHudba);
  const activitySection = isSlova ? 'meditation' : 'music';

  // Získej aktuální gender pro ukládání do historie
  // Priorita: selectedVoice (z useVoiceSwitcher, aktualizuje se okamžitě při změně hlasu)
  // > currentVoice (odvozený z aktuálně přehrávaného souboru) > gender prop > allFiles
  // Použij useMemo, aby se přepočítal při změně selectedVoice nebo currentVoice
  const currentGender = useMemo(() => {
    if (!isSlova) return null;
    return selectedVoice || currentVoice || gender || allFiles?.[0]?.parsed?.gender || allFiles?.[0]?.gender || null;
  }, [isSlova, selectedVoice, currentVoice, gender, allFiles]);

  const getAudioDescription = (md) => {
    const title = md?.title || actualTitle || 'Audio';
    if (isSlova) {
      // Pro meditace (slova) přidej informaci o pohlaví hlasu
      // Použij currentGender (který už má správnou prioritu)
      const voiceGender = md?.gender || currentGender;
      if (voiceGender === 'male') {
        return `Slova: ${title} (muž)`;
      } else if (voiceGender === 'female') {
        return `Slova: ${title} (žena)`;
      }
      return `Slova: ${title}`;
    }
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
      contentType: isSlova ? 'slova' : (isHudba ? 'hudba' : 'audio'),
      gender: currentGender
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
