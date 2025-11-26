import React from 'react';
import { motion } from 'framer-motion';
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
 */
const BreathHeader = ({
  isBreathing,
  breathPhase,
  currentTime,
  totalTime,
  formatTime,
  t
}) => {
  const { currentTheme } = useTheme();

  return (
    <div
      className="text-center flex flex-col justify-start"
      style={{ height: 'calc(3.5rem + clamp(32px, 3.5vw, 40px) + 1rem + 0.5rem)', paddingTop: 0, paddingBottom: 0, marginTop: 0, marginBottom: '1.5rem', position: 'relative', top: 0 }}
    >
      <motion.h1
        key={isBreathing ? breathPhase : 'default'}
        className="text-4xl text-gray-800 leading-normal overflow-visible"
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
          fontFamily: currentTheme?.fontFamily || "'Petrona', serif"
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {isBreathing
          ? (breathPhase === 'in' ? t('nadech') || 'nádech' : t('vydech') || 'výdech')
          : t('dychanie') || 'dýchání'
        }
      </motion.h1>
      {/* Current Time Display - pod nadpisem */}
      <div className="flex items-center justify-center mt-4 mb-2 pointer-events-auto w-full gap-4" style={{ height: 'clamp(32px, 3.5vw, 40px)', minHeight: 'clamp(32px, 3.5vw, 40px)', maxHeight: 'clamp(32px, 3.5vw, 40px)' }}>
        <div className="pointer-events-none z-10 text-center" style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <CurrentTimeDisplay
            currentTime={currentTime}
            formatTime={formatTime}
            className="font-medium text-center text-clamp-time"
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              color: currentTheme?.colors?.timeIndicator || '#000000'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default BreathHeader;

