import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAudioPlayer, useFirebaseAudio } from './hooks';
import {
  AudioControls,
  CloseButton,
  LoadingIndicator
} from './components';
import { parseAudioFileName as parseSpeechFileName } from '@utils/audioParser';
import { parseAudioFileName as parseMusicFileName } from '@utils/hudbaParser';
import { useSmartPreloader } from '@hooks/useSmartPreloader';
import cacheService from '@services/cacheService';

// Pomocná funkce pro extrakci názvu souboru z URL
const extractFileNameFromUrl = (url) => {
  if (!url || typeof url !== 'string') return null;

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
  const fileName = extractFileNameFromUrl(fileNameOrUrl);
  if (!fileName) return null;

  // Nejdřív zkusíme hudební formát (hudba/alba)
  const musicResult = parseMusicFileName(fileName);
  if (musicResult) {
    return musicResult;
  }

  // Pak zkusíme mluvené slovo formát
  const speechResult = parseSpeechFileName(fileName);
  if (speechResult) {
    return speechResult;
  }

  return null;
};

const AudioPlayer = ({
  audioSrc,
  title,
  onClose,
  className = "",
  albumCover = null
}) => {
  const [selectedVoice, setSelectedVoice] = useState('male'); // 'male', 'female'
  const [currentAudioFile, setCurrentAudioFile] = useState(audioSrc); // Aktuální soubor

  // Získej informace o aktuálním souboru
  const currentFileInfo = useMemo(() => {
    if (!currentAudioFile) return null;
    return parseAudioFileName(currentAudioFile);
  }, [currentAudioFile]);

  const currentVoice = currentFileInfo?.voice; // 'muzsky' nebo 'zensky'

  // Získej téma pro hledání variant
  const currentTopic = currentFileInfo?.topic;

  // Aktualizuj currentAudioFile když se změní audioSrc
  useEffect(() => {
    setCurrentAudioFile(audioSrc);

    // Preloading aktuálního souboru je už v useAudioPlayer hooku
    // Nemusíme ho duplikovat zde
  }, [audioSrc, title]);

  // Zobraz přepínač pouze pro mluvené slovo (hudební soubory nemají varianty)
  const hasVariants = currentFileInfo && currentFileInfo.voice && (
    currentFileInfo.voice === 'muzsky' || currentFileInfo.voice === 'zensky'
  );

  console.log('AudioPlayer debug:', {
    audioSrc,
    currentAudioFile,
    hasVariants,
    currentVoice,
    selectedVoice
  });

  // Funkce pro přepínání hlasů
  const handleVoiceChange = (voice) => {
    setSelectedVoice(voice);
    console.log('Voice changed to:', voice);

    // Najdi alternativní soubor s opačným hlasem
    if (currentFileInfo && currentTopic) {
      const targetVoice = voice === 'male' ? 'muzsky' : 'zensky';
      const currentVoiceType = currentFileInfo.voice;

      // Pokud už je vybraný správný hlas, nic nedělej
      if (currentVoiceType === targetVoice) {
        console.log('Already playing correct voice');
        return;
      }

      // Sestav název souboru s opačným hlasem
      const newFileName = `${targetVoice}${currentFileInfo.number}${currentFileInfo.codes}-${currentTopic}.mp3`;
      console.log('Switching to file:', newFileName);

      // Přepni na nový soubor
      setCurrentAudioFile(newFileName);
    }
  };

  // Načtení URL z Firebase Storage
  const { audioUrl, loading: firebaseLoading, error: firebaseError } = useFirebaseAudio(currentAudioFile);

  const {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    isLoading,
    progress,
    togglePlayPause,
    skipBackward,
    skipForward,
    handleSeek,
    formatTime
  } = useAudioPlayer(audioUrl);

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
          backgroundColor: albumCover ? 'rgba(244, 221, 196, 0.9)' : '#f4ddc4'
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
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30"
            style={{
              backgroundImage: `url(${albumCover})`,
              filter: 'blur(30px) brightness(0.7)'
            }}
          />
        )}

        {/* Side bars for wide screens */}
        <div className="hidden lg:block absolute inset-0 pointer-events-none z-5">
          <div className="absolute left-0 top-0 w-[calc((100vw-600px)/2)] h-full bg-gradient-to-r from-[#f4ddc4]/90 to-transparent"></div>
          <div className="absolute right-0 top-0 w-[calc((100vw-600px)/2)] h-full bg-gradient-to-l from-[#f4ddc4]/90 to-transparent"></div>
        </div>

        {/* Content overlay */}
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">

        {/* Main content container - max width 600px */}
        <div className="w-full max-w-[600px] h-full flex flex-col items-center justify-center relative">
          {/* Audio Element */}
          <audio
            ref={audioRef}
            src={audioUrl}
            preload="metadata"
          />

          {/* Close Button - Top Right */}
          <div className="absolute top-4 right-4 z-10">
            <CloseButton
              onClose={onClose}
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
            title={title}
            duration={duration}
            onSeek={handleSeek}
            onTogglePlayPause={togglePlayPause}
            onSkipBackward={skipBackward}
            onSkipForward={skipForward}
            formatTime={formatTime}
            // Voice switcher props
            hasVariants={hasVariants}
            selectedVoice={selectedVoice}
            onVoiceChange={handleVoiceChange}
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
          onClose={onClose}
          className="w-[8vw] h-[8vw] max-w-[40px] max-h-[40px] min-w-[32px] min-h-[32px]"
        />
      </div>*/}
    </motion.div>
  );
};

export default AudioPlayer;
