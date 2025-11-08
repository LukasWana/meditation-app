import React from 'react';
import { motion } from 'framer-motion';
import CurrentTimeDisplay from '@features/audio/components/CurrentTimeDisplay';

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
  const phaseLabel = isBreathing
    ? (breathPhase === 'in' ? t('nadech') || 'nádech' : t('vydech') || 'výdech')
    : null;

  return (
    <div className="flex flex-col items-center text-center gap-3 mb-10">
      <motion.h1
        key={phaseLabel || 'breath-title'}
        className="text-[38px] leading-none font-serif text-gray-900 tracking-tight"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.25 }}
      >
        {t('dychani') || 'dýchání'}
      </motion.h1>

      <div className="flex flex-col items-center gap-2">
        <CurrentTimeDisplay
          currentTime={currentTime}
          formatTime={formatTime}
          className="text-2xl font-medium text-gray-900"
        />
        {phaseLabel && (
          <motion.span
            key={`${phaseLabel}-label`}
            className="text-sm uppercase tracking-[0.3em] text-gray-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {phaseLabel}
          </motion.span>
        )}
      </div>
    </div>
  );
};

export default BreathHeader;

