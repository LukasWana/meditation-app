import React, { memo, useMemo } from 'react';
import DychaniHeader from './DychaniHeader';
import DychaniProgressCircle from './DychaniProgressCircle';
import DychaniParameters from './DychaniParameters';
import DychaniActionButtons from './DychaniActionButtons';

/**
 * Komponenta pro sekci dýchání
 *
 * @param {boolean} isBreathing - Zda probíhá dýchání
 * @param {'in'|'out'} breathPhase - Aktuální fáze dýchání
 * @param {number} breathTime - Zbývající čas v sekundách
 * @param {number} totalTime - Celkový čas v sekundách
 * @param {number} progress - Progress (0-100)
 * @param {number} preparationTime - Čas přípravy v sekundách
 * @param {number} breathDuration - Délka dýchání v minutách
 * @param {number} breathInDuration - Délka nádechu v sekundách
 * @param {number} breathOutDuration - Délka výdechu v sekundách
 * @param {Function} onPlayPause - Handler pro play/pause
 * @param {Function} onReset - Handler pro reset
 * @param {Function} onPreparationClick - Handler pro kliknutí na přípravu
 * @param {Function} onDurationClick - Handler pro kliknutí na délku
 * @param {Function} onRhythmClick - Handler pro kliknutí na rytmus
 * @param {Function} onGalleryClick - Handler pro otevření galerie
 * @param {Function} onProfilesClick - Handler pro otevření profilů
 * @param {Function} formatTime - Funkce pro formátování času
 * @param {Function} formatPreparationTime - Funkce pro formátování času přípravy
 * @param {Function} t - Funkce pro překlad
 */
const DychaniSection = ({
  isBreathing,
  breathPhase,
  breathTime,
  totalTime,
  progress,
  preparationTime,
  breathDuration,
  breathInDuration,
  breathOutDuration,
  onPlayPause,
  onReset,
  onPreparationClick,
  onDurationClick,
  onRhythmClick,
  onGalleryClick,
  onProfilesClick,
  formatTime,
  formatPreparationTime,
  t
}) => {
  // Vypočítat aktuální uplynulý čas - memoizované pro správnou aktualizaci
  const currentTime = useMemo(() => {
    return Math.max(0, totalTime - breathTime);
  }, [totalTime, breathTime]);

  return (
    <div style={{ width: '100%' }}>
      {/* Nadpis a zobrazení času */}
      <DychaniHeader
        isBreathing={isBreathing}
        breathPhase={breathPhase}
        currentTime={currentTime}
        totalTime={totalTime}
        formatTime={formatTime}
        t={t}
      />

      {/* CircularProgress s play button a animací */}
      <div
        className="flex flex-col items-center"
        style={{ marginTop: 0, marginBottom: '1.5rem' }}
      >
        <DychaniProgressCircle
          progress={progress}
          isBreathing={isBreathing}
          breathPhase={breathPhase}
          breathInDuration={breathInDuration}
          breathOutDuration={breathOutDuration}
          onPlayPause={onPlayPause}
        />
      </div>

      {/* Tři parametry: příprava, délka, rytmus */}
      <DychaniParameters
        preparationTime={preparationTime}
        breathDuration={breathDuration}
        breathInDuration={breathInDuration}
        breathOutDuration={breathOutDuration}
        onPreparationClick={onPreparationClick}
        onDurationClick={onDurationClick}
        onRhythmClick={onRhythmClick}
        formatTime={formatTime}
        formatPreparationTime={formatPreparationTime}
        t={t}
      />

      {/* Reset tlačítko, tlačítko pro zvukovou galerii a tlačítko pro profily */}
      <DychaniActionButtons
        onReset={onReset}
        onGalleryClick={onGalleryClick}
        onProfilesClick={onProfilesClick}
        t={t}
      />
    </div>
  );
};

export default memo(DychaniSection);

