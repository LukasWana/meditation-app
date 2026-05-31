import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CurrentTimeDisplay from '@features/audio/components/CurrentTimeDisplay';
import { useTheme } from '@contexts/ThemeContext';

/**
 * Komponenta pro nadpis a zobrazení času dýchání
 *
 * @param {boolean} isBreathing - Zda probíhá dýchání
 * @param {'in'|'out'} breathPhase - Aktuální fáze dýchání
 * @param {number} currentTime - Aktuální uplynulý čas v sekundách
 * @param {number} totalTime - Celkový čas v sekundách
 * @param {Function} formatTime - Funkce pro formátování času
 * @param {Function} t - Funkce pro překlad
 * @param {number} extraTime - Čas navíc po skončení nastaveného času v sekundách
 * @param {boolean} continueAfterEnd - Zda pokračovat v počítání po skončení
 */
const BreathHeader = ({
  isBreathing,
  breathPhase,
  currentTime,
  // eslint-disable-next-line no-unused-vars
  totalTime, // Předáváno pro konzistenci s jinými komponentami
  formatTime,
  extraTime,
  continueAfterEnd,
  t
}) => {
  const { getCurrentThemeColors, currentTheme } = useTheme();
  const themeColors = getCurrentThemeColors();

  // Získat barvu textu a detekovat dark mode
  const textColor = themeColors?.text || '#000000';
  const isDarkMode = textColor.includes('255, 255, 255') ||
                     textColor === '#ffffff' ||
                     textColor === 'white' ||
                     textColor.includes('rgba(255, 255, 255');

  // Všechny texty by měly být bílé v dark mode, černé v light mode
  const displayTextColor = isDarkMode ? '#ffffff' : '#000000';
  const timeIndicatorColor = displayTextColor;

  return (
    <div
      className="text-center flex flex-col justify-start"
      style={{ height: 'calc(3.5rem + clamp(32px, 3.5vw, 40px) + 1rem + 0.5rem)', paddingTop: 0, paddingBottom: 0, marginTop: 0, marginBottom: '1.5rem', position: 'relative', top: 0 }}
    >
      <AnimatePresence mode="wait">
        <motion.h1
          key={isBreathing ? breathPhase : 'default'}
          className="text-4xl md:text-5xl font-light tracking-wide overflow-visible"
          style={{
            height: '3.5rem',
            minHeight: '3.5rem',
            maxHeight: '3.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: '1.2',
            marginTop: 0,
            paddingTop: 0,
            paddingBottom: 0,
            marginBottom: 0,
            color: displayTextColor,
            fontFamily: currentTheme?.fontFamily || "'Petrona', serif"
          }}
          initial={{ opacity: 0, y: 15, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -15, filter: 'blur(8px)' }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          {isBreathing
            ? (breathPhase === 'in' ? t('nadech') || 'nádech' : t('vydech') || 'výdech')
            : t('dychanie') || 'dýchání'
          }
        </motion.h1>
      </AnimatePresence>
      {/* Current Time Display - pod nadpisem */}
      <div className="flex flex-col items-center justify-center mt-4 mb-2 pointer-events-auto w-full gap-2">
        <div className="flex items-center justify-center gap-4" style={{ height: 'clamp(32px, 3.5vw, 40px)', minHeight: 'clamp(32px, 3.5vw, 40px)', maxHeight: 'clamp(32px, 3.5vw, 40px)' }}>
          <div className="pointer-events-none z-10 text-center" style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <CurrentTimeDisplay
              currentTime={currentTime}
              formatTime={formatTime}
              className="font-medium text-center text-clamp-time"
              style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                color: timeIndicatorColor
              }}
            />
          </div>
        </div>
        {/* Zobrazení času navíc po skončení - zobrazíme jen pokud je čas navíc větší než 0 */}
        {continueAfterEnd && extraTime > 0 && (
          <div className="text-sm font-light" style={{ color: displayTextColor, fontFamily: currentTheme?.fontFamily || "'Petrona', serif" }}>
            {t('casNavic') || 'Čas navíc'}: {formatTime(extraTime)}
          </div>
        )}
      </div>
    </div>
  );
};

export default BreathHeader;

