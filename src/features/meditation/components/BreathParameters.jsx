import React from 'react';
import { motion } from 'framer-motion';
import FramerSection from '@components/FramerSection';
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
 * @param {string} activeParameter - Aktuálně aktivní parametr ('preparation' | 'duration' | 'rhythm' | null)
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
  t,
  activeParameter = null
}) => {
  const { getCurrentThemeColors, currentTheme } = useTheme();
  const themeColors = getCurrentThemeColors();
  const totalTime = breathDuration * 60; // v sekundách

  // Získat barvu textu a detekovat dark mode
  const textColor = themeColors?.text || '#000000';
  const isDarkMode = textColor.includes('255, 255, 255') ||
                     textColor === '#ffffff' ||
                     textColor === 'white' ||
                     textColor.includes('rgba(255, 255, 255');

  // Všechny texty by měly být bílé v dark mode, černé v light mode
  const displayTextColor = isDarkMode ? '#ffffff' : '#000000';
  const timeIndicatorColor = displayTextColor;
  const _borderColor = themeColors?.border || 'rgba(0, 0, 0, 0.1)';
  const _cardColor = themeColors?.card || 'rgba(255, 255, 255, 0.7)';

  return (
    <FramerSection
      className="mb-6"
      animationType="fadeIn"
      delay={0.3}
    >
      <div className="flex justify-center items-start gap-4 sm:gap-8 md:gap-12 mb-4">
        {/* Příprava */}
        <motion.div
          className="flex flex-col items-center"
          animate={{
            scale: activeParameter === 'preparation' ? 1.05 : 1,
          }}
          transition={{ duration: 0.2 }}
        >
          <button
            onClick={onPreparationClick}
            className={`text-3xl sm:text-4xl md:text-5xl font-sans font-medium transition-all duration-300 cursor-pointer mb-2 px-3 py-1 rounded-2xl whitespace-nowrap ${activeParameter === 'preparation' ? 'glass-panel scale-105' : 'hover:bg-white/10 active:scale-95'}`}
            style={{
              color: timeIndicatorColor,
              fontFamily: currentTheme?.fontFamily || "'Petrona', serif",
            }}
          >
            {formatPreparationTime(preparationTime)}
          </button>
          <span
            className="text-sm sm:text-base md:text-lg font-light tracking-wide opacity-80"
            style={{
              color: displayTextColor,
              fontFamily: currentTheme?.fontFamily || "'Petrona', serif"
            }}
          >
            {t('priprava') || 'příprava'}
          </span>
        </motion.div>

        {/* Délka */}
        <motion.div
          className="flex flex-col items-center"
          animate={{
            scale: activeParameter === 'duration' ? 1.05 : 1,
          }}
          transition={{ duration: 0.2 }}
        >
          <button
            onClick={onDurationClick}
            className={`text-3xl sm:text-4xl md:text-5xl font-sans font-medium transition-all duration-300 cursor-pointer mb-2 px-3 py-1 rounded-2xl whitespace-nowrap ${activeParameter === 'duration' ? 'glass-panel scale-105' : 'hover:bg-white/10 active:scale-95'}`}
            style={{
              color: timeIndicatorColor,
              fontFamily: currentTheme?.fontFamily || "'Petrona', serif",
            }}
          >
            {formatTime(totalTime)}
          </button>
          <span
            className="text-sm sm:text-base md:text-lg font-light tracking-wide opacity-80"
            style={{
              color: displayTextColor,
              fontFamily: currentTheme?.fontFamily || "'Petrona', serif"
            }}
          >
            {t('dlzka') || 'délka'}
          </span>
        </motion.div>

        {/* Rytmus */}
        <motion.div
          className="flex flex-col items-center"
          animate={{
            scale: activeParameter === 'rhythm' ? 1.05 : 1,
          }}
          transition={{ duration: 0.2 }}
        >
          <button
            onClick={onRhythmClick}
            className={`text-3xl sm:text-4xl md:text-5xl font-sans font-medium transition-all duration-300 cursor-pointer mb-2 px-3 py-1 rounded-2xl whitespace-nowrap ${activeParameter === 'rhythm' ? 'glass-panel scale-105' : 'hover:bg-white/10 active:scale-95'}`}
            style={{
              color: timeIndicatorColor,
              fontFamily: currentTheme?.fontFamily || "'Petrona', serif",
            }}
          >
            {breathInDuration} : {breathOutDuration}
          </button>
          <span
            className="text-sm sm:text-base md:text-lg font-light"
            style={{
              color: displayTextColor,
              fontFamily: currentTheme?.fontFamily || "'Petrona', serif"
            }}
          >
            {t('rytmus') || 'rytmus'}
          </span>
        </motion.div>
      </div>
    </FramerSection>
  );
};

export default BreathParameters;

