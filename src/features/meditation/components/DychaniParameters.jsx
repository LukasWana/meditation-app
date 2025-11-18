import React from 'react';
import { FramerSection } from '@components';

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
const DychaniParameters = ({
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
  const totalTime = breathDuration * 60; // v sekundách

  return (
    <FramerSection
      className="mb-10"
      animationType="fadeIn"
      delay={0.3}
    >
      <div className="flex justify-center gap-10 md:gap-16 text-gray-900">
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={onPreparationClick}
            className="text-[28px] md:text-[32px] font-semibold font-sans tracking-tight hover:text-black transition-colors"
          >
            {formatPreparationTime(preparationTime)}
          </button>
          <span className="text-sm uppercase tracking-[0.2em] text-gray-600">
            {t('priprava') || 'příprava'}
          </span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <button
            onClick={onDurationClick}
            className="text-[28px] md:text-[32px] font-semibold font-sans tracking-tight hover:text-black transition-colors"
          >
            {formatTime(totalTime)}
          </button>
          <span className="text-sm uppercase tracking-[0.2em] text-gray-600">
            {t('dlzkaDychania') || t('dlzka') || 'délka'}
          </span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <button
            onClick={onRhythmClick}
            className="text-[28px] md:text-[32px] font-semibold font-sans tracking-tight hover:text-black transition-colors"
          >
            {breathInDuration} : {breathOutDuration}
          </button>
          <span className="text-sm uppercase tracking-[0.2em] text-gray-600">
            {t('rytmus') || 'rytmus'}
          </span>
        </div>
      </div>
    </FramerSection>
  );
};

export default DychaniParameters;

