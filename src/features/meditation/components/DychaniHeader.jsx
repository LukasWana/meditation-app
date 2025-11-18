import React, { memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import CurrentTimeDisplay from '@features/audio/components/CurrentTimeDisplay';

/**
 * Komponenta pro nadpis a zobrazení času dýchání
 *
 * @param {boolean} isBreathing - Zda probíhá dýchání
 * @param {'in'|'out'} breathPhase - Aktuální fáze dýchání
 * @param {number} currentTime - Aktuální uplynulý čas v sekundách
 * @param {Function} formatTime - Funkce pro formátování času
 * @param {Function} t - Funkce pro překlad
 */
const DychaniHeader = ({
  isBreathing,
  breathPhase,
  currentTime,
  formatTime,
  t
}) => {
  const phaseLabel = isBreathing
    ? (breathPhase === 'in' ? t('nadech') || 'nádech' : t('vydech') || 'výdech')
    : null;

  return (
    <div className="flex flex-col items-center text-center gap-3 mb-10">
      <h1 className="text-[38px] leading-none font-serif text-gray-900 tracking-tight">
        {t('dychani') || 'dýchání'}
      </h1>

      <div className="flex flex-col items-center gap-2">
        <CurrentTimeDisplay
          currentTime={currentTime}
          formatTime={formatTime}
          className="text-2xl font-medium text-gray-900"
        />
        <AnimatePresence mode="wait">
          {phaseLabel && (
            <motion.span
              key={phaseLabel}
              className="text-sm uppercase tracking-[0.3em] text-gray-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {phaseLabel}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default memo(DychaniHeader);

