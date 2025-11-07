import { useEffect } from 'react';

export const useAutoplay = (audioUrl, isPlaying, togglePlayPause, userPaused = false, shouldAutoplay = false) => {
  // Automatické spuštění při každém otevření přehrávače
  useEffect(() => {
    // Spusť autoplay pokud:
    // 1. Je to první spuštění (audioUrl se změnil a uživatel nevypnul přehrávání)
    // 2. Nebo je to změna tracku s povoleným autoplay
    if (audioUrl && window.audioActivated && !isPlaying && (!userPaused || shouldAutoplay)) {
      // Malé zpoždění pro připravení audio elementu
      setTimeout(() => {
        togglePlayPause();
      }, 1000);
    }
  }, [audioUrl, togglePlayPause, isPlaying, userPaused, shouldAutoplay]);

  return {
    autoPlayTriggered: true // Vždy true, protože se spouští pokaždé
  };
};
