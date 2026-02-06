import React, { useMemo, useRef, useEffect } from 'react';
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

  // Extrahuj název alba z různých zdrojů (priorita: fileName > audioSrc > albumTracks)
  const albumName = useMemo(() => {
    // 1. Zkus extrahovat z fileName (nejspolehlivější - obsahuje správnou cestu)
    if (fileName) {
      const fileNameMatch = fileName.match(/hudba\/([^/]+)\//);
      if (fileNameMatch && fileNameMatch[1]) {
        return fileNameMatch[1];
      }
    }

    // 2. Zkus extrahovat z fileNameProp
    if (fileNameProp) {
      const propMatch = fileNameProp.match(/hudba\/([^/]+)\//);
      if (propMatch && propMatch[1]) {
        return propMatch[1];
      }
    }

    // 3. Zkus extrahovat z audioSrc (pokud je to cesta, ne URL)
    if (audioSrc && !audioSrc.startsWith('http')) {
      const match = audioSrc.match(/hudba\/([^/]+)\//);
      if (match && match[1]) {
        return match[1];
      }
    }

    // 4. Pokud máme albumTracks s více než jednou skladbou, zkus najít album name v tracku
    if (albumTracks && albumTracks.length > 1) {
      // Zkus najít album name v prvním tracku (fileName nebo audioSrc)
      const firstTrack = albumTracks[0];
      if (firstTrack.fileName) {
        const trackMatch = firstTrack.fileName.match(/hudba\/([^/]+)\//);
        if (trackMatch && trackMatch[1]) {
          return trackMatch[1];
        }
      }
      if (firstTrack.audioSrc && !firstTrack.audioSrc.startsWith('http')) {
        const trackMatch = firstTrack.audioSrc.match(/hudba\/([^/]+)\//);
        if (trackMatch && trackMatch[1]) {
          return trackMatch[1];
        }
      }
    }

    return null;
  }, [fileName, fileNameProp, audioSrc, albumTracks]);

  // Pro detekci typu aktivity použij více způsobů:
  // 1. Zkontroluj folder z allFiles (nejspolehlivější - každý meditacie soubor má folder: 'meditacie')
  // 2. Zkontroluj fileName prop nebo fileName z hooku (může obsahovat cestu "meditacie/...")
  // 3. Heuristika: pokud fileName obsahuje "muzsky" nebo "zensky", je to meditacie soubor
  // 4. Fallback na rawSrc
  // Důležité: použij audioUrl z hooku (aktualizuje se při změně hlasu), ne audioSrc prop (který zůstává stejný)
  const rawSrc = audioUrl || audioSrc || '';
  // Priorita pro detekci: fileName z hooku (aktualizuje se při změně hlasu) > fileNameProp > rawSrc
  const sourceForDetection = fileName || fileNameProp || rawSrc || '';

  // Detekce podle folder z allFiles (nejspolehlivější)
  const isSlovaByFolder = allFiles && allFiles.length > 0 &&
    (allFiles[0]?.folder === 'meditacie');

  // Detekce podle cesty v fileName
  const isSlovaByPath = sourceForDetection.includes('meditacie/');

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
  // - meditacie/* patří do sekce "meditation" (uživatel to vnímá jako meditace/afirmace)
  // - hudba/* patří do sekce "music"
  // - ostatní audio netrackujeme (aby se nám to nemíchalo)
  const activitySection = isSlova ? 'meditation' : 'music';

  // Ref pro sledování, zda byla aktivita aktivní před změnou hlasu
  // Toto zabrání přerušení aktivity při změně hlasu (když se dočasně resetuje isPlaying)
  const wasTrackingRef = useRef(false);
  const isValidActivityRef = useRef(false);

  // Zjisti, zda je to platná aktivita pro tracking
  const isValidActivity = !!sourceForDetection && (isSlova || isHudba);

  // Aktualizuj refy při změně
  useEffect(() => {
    isValidActivityRef.current = isValidActivity;
  }, [isValidActivity]);

  // Sleduj změny isPlaying a zachovej tracking pokud je to stále meditace/hudba
  useEffect(() => {
    if (isPlaying && isValidActivity) {
      wasTrackingRef.current = true;
    } else if (!isPlaying && wasTrackingRef.current && isValidActivityRef.current) {
      // Pokud se isPlaying změnil na false, ale stále je to platná aktivita (např. při změně hlasu),
      // zachovej tracking po dobu 3 sekund (aby se aktivita nepřerušila při krátkých změnách)
      const timeoutId = setTimeout(() => {
        if (!isPlaying && wasTrackingRef.current && isValidActivityRef.current) {
          wasTrackingRef.current = false;
        }
      }, 3000);
      return () => clearTimeout(timeoutId);
    } else if (!isValidActivity) {
      wasTrackingRef.current = false;
    }
  }, [isPlaying, isValidActivity]);

  // shouldTrackAudio: trackuj pokud je aktivní přehrávání NEBO pokud byla aktivita aktivní před změnou hlasu
  const shouldTrackAudio = (isPlaying || wasTrackingRef.current) && isValidActivity;

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
      contentType: isSlova ? 'meditacie' : (isHudba ? 'hudba' : 'audio'),
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
          crossOrigin="anonymous"
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
