import React from 'react';
import { FramerSection } from '@components';
import { useTheme } from '@contexts/ThemeContext';

/**
 * Komponenta pro zobrazení tří parametrů dýchání (příprava, délka, rytmus)
 *
 * @param {number} preparationTime - Čas přípravy v sekundách
 * @param {number} breathDuration - Délka dýchání v minutách
 * @param {number} breathInDuration - Délka nádechu v sekundách
 * @param {number} breathOutDuration - Délka výdechu v sekundách
 * @param {Function} onPreparationClick - Handler pro kliknutí na přípravu
 * @param {Function} onDurationClick - Handler pro kliknutí na délku
 * @param {Function} onRhythmClick - Handler pro kliknutí na rytmus
 * @param {Function} formatTime - Funkce pro formátování času
 * @param {Function} formatPreparationTime - Funkce pro formátování času přípravy
 * @param {Function} t - Funkce pro překlad
 */
const BreathParameters = ({
  preparationTime,
  breathDuration,
  breathInDuration,
  breathOutDuration,
  onPreparationClick,
  onDurationClick,
  onRhythmClick,
  formatTime,
  formatPreparationTime,
  t
}) => {
  const { currentTheme } = useTheme();
  const totalTime = breathDuration * 60; // v sekundách

  return (
    <FramerSection
      className="mb-6"
      animationType="fadeIn"
      delay={0.3}
    >
      <div className="flex justify-center items-start gap-8 md:gap-12 mb-4">
        {/* Příprava */}
        <div className="flex flex-col items-center">
          <button
            onClick={onPreparationClick}
            className="text-4xl md:text-5xl font-sans font-medium transition-colors cursor-pointer mb-1"
            style={{
              color: currentTheme?.colors?.timeIndicator || currentTheme?.colors?.text || '#000000',
              fontFamily: currentTheme?.fontFamily || "'Petrona', serif"
            }}
          >
            {formatPreparationTime(preparationTime)}
          </button>
          <span
            className="text-base md:text-lg font-light"
            style={{
              color: currentTheme?.colors?.textSecondary || currentTheme?.colors?.text || '#000000',
              fontFamily: currentTheme?.fontFamily || "'Petrona', serif"
            }}
          >
            {t('priprava') || 'příprava'}
          </span>
        </div>

        {/* Délka */}
        <div className="flex flex-col items-center">
          <button
            onClick={onDurationClick}
            className="text-4xl md:text-5xl font-sans font-medium transition-colors cursor-pointer mb-1"
            style={{
              color: currentTheme?.colors?.timeIndicator || currentTheme?.colors?.text || '#000000',
              fontFamily: currentTheme?.fontFamily || "'Petrona', serif"
            }}
          >
            {formatTime(totalTime)}
          </button>
          <span
            className="text-base md:text-lg font-light"
            style={{
              color: currentTheme?.colors?.textSecondary || currentTheme?.colors?.text || '#000000',
              fontFamily: currentTheme?.fontFamily || "'Petrona', serif"
            }}
          >
            {t('dlzka') || 'délka'}
          </span>
        </div>

        {/* Rytmus */}
        <div className="flex flex-col items-center">
          <button
            onClick={onRhythmClick}
            className="text-4xl md:text-5xl font-sans font-medium transition-colors cursor-pointer mb-1"
            style={{
              color: currentTheme?.colors?.timeIndicator || currentTheme?.colors?.text || '#000000',
              fontFamily: currentTheme?.fontFamily || "'Petrona', serif"
            }}
          >
            {breathInDuration} : {breathOutDuration}
          </button>
          <span
            className="text-base md:text-lg font-light"
            style={{
              color: currentTheme?.colors?.textSecondary || currentTheme?.colors?.text || '#000000',
              fontFamily: currentTheme?.fontFamily || "'Petrona', serif"
            }}
          >
            {t('rytmus') || 'rytmus'}
          </span>
        </div>
      </div>
    </FramerSection>
  );
};

export default BreathParameters;

