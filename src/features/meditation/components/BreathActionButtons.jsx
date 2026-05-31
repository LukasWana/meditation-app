import React from 'react';
import { RotateCcw, Music2, Bookmark, Clock } from 'lucide-react';
import { FramerSection } from '@components';
import { useTheme } from '@contexts/ThemeContext';

/**
 * Komponenta pro tlačítka reset, galerie, profily a pokračování
 *
 * @param {Function} onReset - Handler pro reset
 * @param {Function} onGalleryClick - Handler pro otevření galerie
 * @param {Function} onProfilesClick - Handler pro otevření profilů
 * @param {Function} t - Funkce pro překlad
 * @param {boolean} continueAfterEnd - Zda pokračovat v počítání po skončení
 * @param {Function} onContinueAfterEndChange - Handler pro změnu volby pokračování
 */
const BreathActionButtons = ({
  onReset,
  onGalleryClick,
  onProfilesClick,
  continueAfterEnd,
  onContinueAfterEndChange,
  t
}) => {
  const { getCurrentThemeColors } = useTheme();
  const themeColors = getCurrentThemeColors();

  // Získat barvu textu a detekovat dark mode
  const textColor = themeColors?.text || '#000000';
  const isDarkMode = textColor.includes('255, 255, 255') ||
                     textColor === '#ffffff' ||
                     textColor === 'white' ||
                     textColor.includes('rgba(255, 255, 255');

  // Všechny texty by měly být bílé v dark mode, černé v light mode
  const iconColor = isDarkMode ? '#ffffff' : '#000000';

  // Speciální barvy pro tlačítko "pokračovat po skončení"
  // Pozor: v ThemeContext je globální override `[style*="background-color"] { color: ... !important; }`,
  // takže tady nepoužíváme inline `backgroundColor`, aby se nám nepřebila barva ikonky.
  const continueBg = continueAfterEnd
    ? (isDarkMode ? '#ffffff' : '#000000')
    : (isDarkMode ? '#000000' : '#ffffff');
  const continueFg = continueAfterEnd
    ? (isDarkMode ? '#000000' : '#ffffff')
    : (isDarkMode ? '#ffffff' : '#000000');

  return (
    <FramerSection
      className="flex justify-center w-full px-4"
      animationType="fadeIn"
      delay={0.4}
    >
      <div className="flex items-center justify-center gap-2 sm:gap-6 px-4 py-3 sm:px-6 sm:py-4 mx-auto glass-panel rounded-[2rem]">
        {/* Reset tlačítko */}
        <button
          onClick={onReset}
          className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center transition-all cursor-pointer rounded-full hover:bg-white/10 active:scale-95"
          title={t('reset') || 'Reset'}
        >
          <RotateCcw size={26} style={{ color: iconColor }} />
        </button>

        {/* Tlačítko pro zvukovou galerii */}
        <button
          onClick={onGalleryClick}
          className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center transition-all cursor-pointer rounded-full hover:bg-white/10 active:scale-95"
          title={t('zvukovaGalerie') || 'Zvuková galerie'}
        >
          <Music2 size={26} style={{ color: iconColor }} />
        </button>

        {/* Tlačítko pro profily dýchání */}
        <button
          onClick={onProfilesClick}
          className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center transition-all cursor-pointer rounded-full hover:bg-white/10 active:scale-95"
          title={t('profilyDychani') || 'Profily dýchání'}
        >
          <Bookmark size={26} style={{ color: iconColor }} />
        </button>

        {/* Tlačítko pro pokračování v počítání po skončení */}
        <button
          onClick={() => onContinueAfterEndChange?.(!continueAfterEnd)}
          className={`w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center transition-all cursor-pointer rounded-full active:scale-95 ${continueAfterEnd ? 'bg-white/20 shadow-inner' : 'hover:bg-white/10'}`}
          title={t('pokracovatPoSkonceni') || 'Pokračovat v počítání po skončení'}
        >
          <Clock size={26} style={{ color: iconColor }} />
        </button>
      </div>
    </FramerSection>
  );
};

export default BreathActionButtons;

