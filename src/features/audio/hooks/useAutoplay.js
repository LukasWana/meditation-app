import { useEffect } from 'react';

/**
 * Hook pro management autoplay funkcionality
 * Zajišťuje automatické spuštění při každém otevření přehrávače
 */
export const useAutoplay = (audioUrl, isPlaying, togglePlayPause) => {
  // Automatické spuštění při každém otevření přehrávače
  useEffect(() => {
    if (audioUrl && window.audioActivated && !isPlaying) {
      console.log('🎵 AUTOMATICKÉ SPUŠTĚNÍ: Spouštím přehrávání automaticky...');
      // Malé zpoždění pro připravení audio elementu
      setTimeout(() => {
        togglePlayPause();
      }, 1000);
    }
  }, [audioUrl, togglePlayPause, isPlaying]);

  return {
    autoPlayTriggered: true // Vždy true, protože se spouští pokaždé
  };
};
