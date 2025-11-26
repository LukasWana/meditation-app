import React from 'react';
import { RotateCcw, Music2, Bookmark } from 'lucide-react';
import { FramerSection } from '@components';
import { useTheme } from '@contexts/ThemeContext';

/**
 * Komponenta pro tlačítka reset, galerie a profily
 *
 * @param {Function} onReset - Handler pro reset
 * @param {Function} onGalleryClick - Handler pro otevření galerie
 * @param {Function} onProfilesClick - Handler pro otevření profilů
 * @param {Function} t - Funkce pro překlad
 */
const BreathActionButtons = ({
  onReset,
  onGalleryClick,
  onProfilesClick,
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

  return (
    <FramerSection
      className="flex justify-center gap-4"
      animationType="fadeIn"
      delay={0.4}
    >
      {/* Reset tlačítko - bílé kulaté tlačítko s dark grey refresh ikonou */}
      <button
        onClick={onReset}
        className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        title={t('reset') || 'Reset'}
      >
        <RotateCcw size={28} style={{ color: iconColor }} />
      </button>

      {/* Tlačítko pro zvukovou galerii - bílé kulaté tlačítko s dark grey notičkou */}
      <button
        onClick={onGalleryClick}
        className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        title={t('zvukovaGalerie') || 'Zvuková galerie'}
      >
        <Music2 size={28} style={{ color: iconColor }} />
      </button>

      {/* Tlačítko pro profily dýchání - bílé kulaté tlačítko s dark grey bookmark ikonou */}
      <button
        onClick={onProfilesClick}
        className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        title={t('profilyDychani') || 'Profily dýchání'}
      >
        <Bookmark size={28} style={{ color: iconColor }} />
      </button>
    </FramerSection>
  );
};

export default BreathActionButtons;

