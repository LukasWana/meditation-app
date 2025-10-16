import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAudioPlayer, useFirebaseAudio } from './hooks';
import {
  AudioControls,
  CloseButton,
  LoadingIndicator
} from './components';
import { parseAudioFileName } from '@utils/audioParser';

const AudioPlayer = ({
  audioSrc,
  title,
  onClose,
  className = ""
}) => {
  const [selectedVoice, setSelectedVoice] = useState('male'); // 'male', 'female'
  const [currentAudioFile, setCurrentAudioFile] = useState(audioSrc); // Aktuální soubor

  // Získej informace o aktuálním souboru
  const currentFileInfo = parseAudioFileName(currentAudioFile);
  const currentVoice = currentFileInfo?.voice; // 'muzsky' nebo 'zensky'

  // Získej téma pro hledání variant
  const currentTopic = currentFileInfo?.topic;

  // Aktualizuj currentAudioFile když se změní audioSrc
  useEffect(() => {
    setCurrentAudioFile(audioSrc);
  }, [audioSrc]);

  // Zobraz přepínač pro všechny soubory s mužským nebo ženským hlasem
  const hasVariants = currentAudioFile && (
    currentAudioFile.includes('muzsky') || currentAudioFile.includes('zensky')
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
      {/* Full Screen Player - Always Full Screen */}
      <motion.div
        className="bg-[#f4ddc4] w-full h-full flex flex-col items-center justify-center relative overflow-hidden"
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
        {/* Audio Element */}
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
        />

        {/* Close Button - Top Right for All Devices - Larger for Full Screen */}
        <div className="absolute top-6 right-6 z-10">
          <CloseButton
            onClose={onClose}
            className="w-14 h-14"
          />
        </div>

        {/* Loading Indicator - Top Left */}
        <div className="absolute top-6 left-6 z-10">
          <LoadingIndicator isLoading={isLoading || firebaseLoading} />
        </div>

        {/* Audio Controls */}
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
