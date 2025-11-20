import React, { useMemo, memo } from 'react';
import { FramerSection } from '@components';
import CircularProgress from '@features/audio/components/CircularProgress';
import CurrentTimeDisplay from '@features/audio/components/CurrentTimeDisplay';
import DychaniActionButtons from './DychaniActionButtons';

/**
 * Komponenta pro sekci přípravy
 *
 * @param {number} preparationCountdown - Aktuální hodnota countdownu
 * @param {number} preparationTime - Celkový čas přípravy v sekundách
 * @param {Function} onStop - Handler pro zastavení přípravy
 * @param {Function} onGalleryClick - Handler pro otevření galerie
 * @param {Function} onProfilesClick - Handler pro otevření profilů
 * @param {Function} formatTime - Funkce pro formátování času
 * @param {Function} t - Funkce pro překlad
 */
const PreparationSection = ({
  preparationCountdown,
  preparationTime,
  onStop,
  onGalleryClick,
  onProfilesClick,
  formatTime,
  t
}) => {
  const progress = useMemo(() => {
    return preparationCountdown > 0 && preparationTime > 0
      ? ((preparationTime - preparationCountdown) / preparationTime) * 100
      : 0;
  }, [preparationCountdown, preparationTime]);

  return (
    <div style={{ width: '100%' }}>
      {/* Nadpis - přesně stejná struktura jako obrazovka dýchání */}
      <div
        className="text-center flex flex-col justify-start"
        style={{ height: 'calc(3.5rem + clamp(32px, 3.5vw, 40px) + 1rem + 0.5rem)', paddingTop: 0, paddingBottom: 0, marginTop: 0, marginBottom: '1.5rem', position: 'relative', top: 0 }}
      >
        <h1
          className="text-4xl font-serif text-gray-800 leading-normal overflow-visible"
          style={{ height: '3.5rem', minHeight: '3.5rem', maxHeight: '3.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: '1.2', marginTop: 0, paddingTop: 0, paddingBottom: 0, marginBottom: 0 }}
        >
          {t('priprava') || 'příprava'}
        </h1>
        {/* Current Time Display - pod nadpisem - stejná struktura jako na obrazovce dýchání, ale skryté */}
        <div className="flex items-center justify-center mt-4 mb-2 pointer-events-auto w-full gap-4" style={{ height: 'clamp(32px, 3.5vw, 40px)', minHeight: 'clamp(32px, 3.5vw, 40px)', maxHeight: 'clamp(32px, 3.5vw, 40px)' }}>
          <div className="pointer-events-none z-10 text-center" style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <CurrentTimeDisplay
              currentTime={0}
              formatTime={formatTime}
              className="text-black font-medium text-center text-clamp-time"
              style={{ height: '100%', display: 'flex', alignItems: 'center', visibility: 'hidden' }}
            />
          </div>
        </div>
      </div>

      {/* CircularProgress - přesně stejná struktura jako obrazovka dýchání */}
      <div
        className="flex flex-col items-center"
        style={{ marginTop: 0, marginBottom: '1.5rem' }}
      >
        {/* Circular Progress - stejná struktura jako na obrazovce dýchání */}
        <div className="relative flex-shrink-0">
          <CircularProgress
            progress={progress}
            onSeek={null}
            className="w-[50vw] h-[50vw] max-w-[400px] max-h-[400px] min-w-[250px] min-h-[250px]"
            section="dychani"
          />

          {/* Odpočítávání v centru - stejná struktura jako Play/Pause tlačítko na obrazovce dýchání */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span
              className="text-6xl font-light text-black"
              style={{ transition: 'opacity 0.1s ease-in-out' }}
            >
              {preparationCountdown}
            </span>
          </div>
        </div>
      </div>

      {/* Prázdná sekce s parametry - pro zachování stejné struktury jako na stránce dýchání */}
      <FramerSection
        className="mb-6"
        animationType="fadeIn"
        delay={0.3}
      >
        <div className="flex justify-center items-start gap-8 md:gap-12 mb-4">
          {/* Příprava - prázdné */}
          <div className="flex flex-col items-center" style={{ opacity: 0, pointerEvents: 'none' }}>
            <div className="text-4xl md:text-5xl font-sans font-medium mb-1" style={{ height: 'clamp(2.5rem, 5vw, 3rem)' }}>
              &nbsp;
            </div>
            <div className="text-base md:text-lg font-serif" style={{ height: '1.25rem' }}>
              &nbsp;
            </div>
          </div>

          {/* Délka - prázdné */}
          <div className="flex flex-col items-center" style={{ opacity: 0, pointerEvents: 'none' }}>
            <div className="text-4xl md:text-5xl font-sans font-medium mb-1" style={{ height: 'clamp(2.5rem, 5vw, 3rem)' }}>
              &nbsp;
            </div>
            <div className="text-base md:text-lg font-serif" style={{ height: '1.25rem' }}>
              &nbsp;
            </div>
          </div>

          {/* Rytmus - prázdné */}
          <div className="flex flex-col items-center" style={{ opacity: 0, pointerEvents: 'none' }}>
            <div className="text-4xl md:text-5xl font-sans font-medium mb-1" style={{ height: 'clamp(2.5rem, 5vw, 3rem)' }}>
              &nbsp;
            </div>
            <div className="text-base md:text-lg font-serif" style={{ height: '1.25rem' }}>
              &nbsp;
            </div>
          </div>
        </div>
      </FramerSection>

      {/* Reset tlačítko, tlačítko pro zvukovou galerii a tlačítko pro profily - vedle sebe - stejná struktura jako na stránce dýchání */}
      <DychaniActionButtons
        onReset={onStop}
        onGalleryClick={onGalleryClick}
        onProfilesClick={onProfilesClick}
        t={t}
      />
    </div>
  );
};

export default memo(PreparationSection);

