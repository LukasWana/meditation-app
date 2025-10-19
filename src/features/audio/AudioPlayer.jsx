import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAudioPlayer, useFirebaseAudio } from './hooks';
import {
  AudioControls,
  CloseButton,
  LoadingIndicator
} from './components';
import { parseAudioFileName as parseSpeechFileName } from '@utils/audioParser';
import { parseAudioFileName as parseMusicFileName } from '@utils/hudbaParser';
// Preloader odstraněn - data se načítají při startu
import cacheService from '@services/cacheService';

// Pomocná funkce pro extrakci názvu souboru z URL
const extractFileNameFromUrl = (url) => {
  if (!url || typeof url !== 'string') return null;

  // Pokud už je to název souboru (ne URL), vrať ho
  if (!url.startsWith('http')) {
    return url.includes('/') ? url.split('/').pop() : url;
  }

  try {
    // Pro Firebase Storage URL: https://firebasestorage.googleapis.com/v0/b/.../o/filename.mp3?alt=media
    const match = url.match(/\/o\/([^?]+)/);
    if (match) {
      const fullPath = decodeURIComponent(match[1]);
      // Extraktuj pouze název souboru ze cesty (např. "ambient-journey/filename.mp3" -> "filename.mp3")
      return fullPath.includes('/') ? fullPath.split('/').pop() : fullPath;
    }

    // Fallback pro běžné URL
    const pathname = new URL(url).pathname;
    return pathname.split('/').pop();
  } catch (error) {
    // Pokud to není validní URL, zkusíme to jako název souboru
    // Také extraktuj název souboru ze cesty pokud obsahuje "/"
    return url.includes('/') ? url.split('/').pop() : url;
  }
};

// Univerzální parser - zkusí oba formáty
const parseAudioFileName = (fileNameOrUrl) => {
  console.log('parseAudioFileName called with:', fileNameOrUrl);
  const fileName = extractFileNameFromUrl(fileNameOrUrl);
  console.log('Extracted fileName:', fileName);

  if (!fileName) return null;

  // Nejdřív zkusíme hudební formát (hudba/alba)
  const musicResult = parseMusicFileName(fileName);
  if (musicResult) {
    console.log('Parsed as music:', musicResult);
    return musicResult;
  }

  // Pak zkusíme mluvené slovo formát
  const speechResult = parseSpeechFileName(fileName);
  if (speechResult) {
    console.log('Parsed as speech:', speechResult);
    return speechResult;
  }

  console.log('Could not parse fileName:', fileName);
  return null;
};

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
  const [selectedVoice, setSelectedVoice] = useState('male'); // 'male', 'female'
  const [currentAudioFile, setCurrentAudioFile] = useState(audioSrc); // Aktuální soubor

  // Získej informace o aktuálním souboru
  const currentFileInfo = useMemo(() => {
    if (!currentAudioFile) return null;
    return parseAudioFileName(currentAudioFile);
  }, [currentAudioFile]);

  // Pokud máme album tracks, použij aktuální track
  const actualAudioSrc = useMemo(() => {
    if (albumTracks && albumTracks.length > 0 && currentTrackIndex >= 0 && currentTrackIndex < albumTracks.length) {
      return albumTracks[currentTrackIndex].audioSrc;
    }
    return audioSrc;
  }, [audioSrc, albumTracks, currentTrackIndex]);

  const currentVoice = useMemo(() => currentFileInfo?.gender, [currentFileInfo]); // 'male' nebo 'female'

  // Získej téma pro hledání variant
  const currentTopic = useMemo(() => currentFileInfo?.topic || currentFileInfo?.albumName, [currentFileInfo]);

  // Aktualizuj currentAudioFile když se změní audioSrc
  useEffect(() => {
    console.log('AudioPlayer: actualAudioSrc changed:', actualAudioSrc);
    setCurrentAudioFile(actualAudioSrc);

    // Preloading aktuálního souboru je už v useAudioPlayer hooku
    // Nemusíme ho duplikovat zde
  }, [actualAudioSrc]); // Odstraněn title z dependencies

  // Inicializuj selectedVoice podle aktuálního hlasu v souboru
  useEffect(() => {
    if (currentFileInfo && currentFileInfo.gender) {
      const voice = currentFileInfo.gender; // Už je 'male' nebo 'female'
      setSelectedVoice(voice);
      console.log('Initialized selectedVoice to:', voice, 'based on file gender:', currentFileInfo.gender);
    }
  }, [currentFileInfo]);

  // Aktualizuj title podle aktuální skladby v albu
  const actualTitle = useMemo(() => {
    if (albumTracks && albumTracks.length > 0 && currentTrackIndex >= 0 && currentTrackIndex < albumTracks.length) {
      return albumTracks[currentTrackIndex].trackName;
    }
    return title;
  }, [title, albumTracks, currentTrackIndex]);

  // Zobraz přepínač pouze pro mluvené slovo (hudební soubory nemají varianty)
  const hasVariants = useMemo(() => {
    return currentFileInfo && currentFileInfo.gender && (
      currentFileInfo.gender === 'male' || currentFileInfo.gender === 'female'
    ) && currentTopic && currentFileInfo.number && currentFileInfo.type; // Musí mít téma a typ pro hledání alternativ
  }, [currentFileInfo, currentTopic]);

  console.log('AudioPlayer debug:', {
    audioSrc,
    currentAudioFile,
    hasVariants,
    currentVoice,
    selectedVoice
  });

  // Funkce pro přepínání hlasů
  const handleVoiceChange = useCallback((voice) => {
        setSelectedVoice(voice);
        console.log('Voice changed to:', voice);

        // Najdi alternativní soubor s opačným hlasem
        if (currentFileInfo && currentTopic) {
          const targetVoice = voice === 'male' ? 'muzsky' : 'zensky';
          const currentVoiceType = currentFileInfo.gender;

          // Pokud už je vybraný správný hlas, nic nedělej
          if (currentVoiceType === voice) {
            console.log('Already playing correct voice');
            return;
          }

          // Sestav název souboru s opačným hlasem
          // Formát: "zensky4FSK-téma.mp3" nebo "muzsky4MSK-téma.mp3"
          // Musíme změnit type podle targetVoice: FSK pro ženy, MSK pro muže
          const targetType = voice === 'male' ? 'MSK' : 'FSK';
          const topicForFileName = currentTopic.replace(/\s+/g, '-'); // Nahraď mezery pomlčkami
          const newFileName = `${targetVoice}${currentFileInfo.number}${targetType}-${topicForFileName}.mp3`;
          console.log('Switching to file:', newFileName);
          console.log('Current file components:', {
            targetVoice,
            number: currentFileInfo.number,
            originalType: currentFileInfo.type,
            targetType,
            topic: currentTopic
          });

          // Najdi původní cestu k souboru (složku)
          // Pokud currentAudioFile obsahuje cestu, použij ji, jinak použij jen název souboru
          let fullPath;
          if (currentAudioFile.includes('/')) {
            const originalPath = currentAudioFile.substring(0, currentAudioFile.lastIndexOf('/') + 1);
            fullPath = originalPath + newFileName;
          } else {
            // Pokud je to jen název souboru, použij jen nový název
            fullPath = newFileName;
          }

          console.log('Full path to new file:', fullPath);
          console.log('Current file info:', currentFileInfo);

          // Zkontroluj, jestli alternativní soubor existuje v allFiles
          const alternativeFile = allFiles.find(file =>
            file.fileName === fullPath || file.fileName === newFileName
          );

          if (alternativeFile) {
            console.log('Alternative file found:', alternativeFile);
            // Přepni na nový soubor
            setCurrentAudioFile(alternativeFile.audioSrc || fullPath);
          } else {
            console.warn('Alternative file not found:', fullPath);
            // Zkus najít soubor s podobným názvem
            const similarFile = allFiles.find(file =>
              file.fileName.includes(topicForFileName) &&
              file.fileName.includes(targetVoice)
            );

            if (similarFile) {
              console.log('Similar file found:', similarFile);
              setCurrentAudioFile(similarFile.audioSrc || similarFile.fileName);
            } else {
              console.error('No alternative file found for voice switch');
            }
          }
        } else {
          console.log('Cannot switch voice - missing file info or topic:', { currentFileInfo, currentTopic });
        }
      }, [currentFileInfo, currentTopic, currentAudioFile]);

  // Extrahuj název souboru z URL nebo použij přímo název souboru
  const getFileNameFromUrl = useCallback((urlOrFileName) => {
    if (!urlOrFileName) return null;

    // Pokud je to už název souboru (ne URL), vrať ho
    if (!urlOrFileName.startsWith('http')) {
      return urlOrFileName;
    }

    // Pokud je to URL, extrahuj název souboru z Firebase Storage URL
    try {
      const url = new URL(urlOrFileName);
      const pathname = decodeURIComponent(url.pathname);
      console.log('🔗 Parsing Firebase Storage URL:', { urlOrFileName, pathname });

      // Odstraň /o/ prefix a extrahuj cestu k souboru
      const match = pathname.match(/\/o\/(.+?)(?:\?|$)/);
      if (match) {
        const fileName = match[1];
        console.log('🔗 Extracted fileName:', fileName);
        return fileName;
      }
    } catch (error) {
      console.warn('Failed to parse URL:', urlOrFileName, error);
    }

    // Pokud se nepodařilo extrahovat název souboru, vrať null místo celé URL
    console.error('Failed to extract fileName from URL:', urlOrFileName);
    return null;
  }, []);

  const fileName = useMemo(() => getFileNameFromUrl(currentAudioFile), [currentAudioFile]);

  // Načtení URL z Firebase Storage
  const { audioUrl, loading: firebaseLoading, error: firebaseError } = useFirebaseAudio(fileName);

  // Debug logy pro audio URL
  useEffect(() => {
    if (audioUrl) {
      console.log('🎵 Audio URL loaded:', audioUrl);
    } else if (firebaseError) {
      console.log('🎵 Audio URL error:', firebaseError);
    }
  }, [audioUrl, firebaseError]);

  // Automatická aktivace audio při načtení stránky a při změně skladby
  useEffect(() => {
    if (audioUrl) {
      console.log('🎵 Activating audio for new track...');

      try {
        // Použij globální AudioContext pokud existuje, jinak vytvoř nový
        let audioContext = window.globalAudioContext;
        if (!audioContext) {
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
          window.globalAudioContext = audioContext;
        }

        if (audioContext.state === 'suspended') {
          audioContext.resume().then(() => {
            console.log('🎵 Audio activated for new track!');
            window.audioActivated = true;
          }).catch((error) => {
            console.log('🎵 Audio activation failed for new track');
          });
        } else {
          console.log('🎵 Audio already active for new track');
          window.audioActivated = true;
        }
      } catch (error) {
        console.log('🎵 Audio activation error for new track');
      }
    }
  }, [audioUrl]);

  const {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    isLoading,
    durationStable,
    progress,
    togglePlayPause,
    skipBackward,
    skipForward,
    handleSeek,
    formatTime,
    fadeOutAndClose,
  } = useAudioPlayer(audioUrl, albumTracks, currentTrackIndex, onTrackChange, autoplayEnabled);

  return (
    <motion.div
      className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 pointer-events-auto ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999
      }}
    >
      {/* Responsive Player Container */}
      <motion.div
        className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden"
        style={{
          backgroundColor: albumCover ? 'rgba(244, 221, 196, 0.7)' : '#f4ddc4'
        }}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{
          duration: 0.4,
          ease: "easeOut",
          type: "spring",
          stiffness: 200,
          damping: 25
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Album cover background */}
        {albumCover && (
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${albumCover})`,
              filter: 'blur(80px) brightness(1)',
              opacity: 1
            }}
          />
        )}

        {/* Side bars for wide screens */}
        <div className="hidden lg:block absolute inset-0 pointer-events-none z-5">
          <div className="absolute left-0 top-0 w-[calc((100vw-600px)/2)] h-full bg-gradient-to-r from-[#f4ddc4]/70 to-transparent"></div>
          <div className="absolute right-0 top-0 w-[calc((100vw-600px)/2)] h-full bg-gradient-to-l from-[#f4ddc4]/70 to-transparent"></div>
        </div>

        {/* Content overlay */}
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">

        {/* Main content container - max width 600px */}
        <div className="w-full max-w-[600px] h-full flex flex-col items-center justify-center relative">
          {/* Audio Element */}
          <audio
            ref={audioRef}
            src={audioUrl || undefined}
            preload="metadata"
          />

          {/* Close Button - Top Right */}
          <div className="absolute top-4 right-4 z-10">
            <CloseButton
              onClose={() => fadeOutAndClose(onClose, 3000)}
              className="w-10 h-10 sm:w-12 sm:h-12"
            />
          </div>

          {/* Loading Indicator - Top Left */}
          <div className="absolute top-4 left-4 z-10">
            <LoadingIndicator isLoading={isLoading || firebaseLoading} />
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
            onVoiceChange={handleVoiceChange}
            // Track switcher props
            albumTracks={albumTracks}
            currentTrackIndex={currentTrackIndex}
            onTrackChange={onTrackChange}
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
        </div>
      </motion.div>

      {/* Close Button - Touching Main Circle
      <div className="absolute bottom-[20vw] sm:bottom-20 left-1/2 transform -translate-x-1/2 translate-y-1/2 z-20">
        <CloseButton
          onClose={() => fadeOutAndClose(onClose, 3000)}
          className="w-[8vw] h-[8vw] max-w-[40px] max-h-[40px] min-w-[32px] min-h-[32px]"
        />
      </div>*/}

    </motion.div>
  );
};

export default AudioPlayer;
