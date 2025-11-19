import React, { memo } from 'react';
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
        {phaseLabel && (
          <span
            className="text-sm uppercase tracking-[0.3em] text-gray-500 transition-opacity duration-200 ease-in-out"
            style={{ opacity: phaseLabel ? 1 : 0 }}
          >
            {phaseLabel}
          </span>
        )}
      </div>
    </div>
  );
};

export default memo(DychaniHeader);

