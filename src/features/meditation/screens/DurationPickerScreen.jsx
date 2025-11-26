import React, { useState, Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { Music2 } from 'lucide-react';
import { FramerPageTransition, BackButton } from '@components';
import { useLanguage } from '@contexts/LanguageContext';
import { useTheme } from '@contexts/ThemeContext';

// Lazy loading WheelPicker komponent
const WheelPicker = lazy(() => import('@components/WheelPicker').then(m => ({ default: m.default })));

const DurationPickerScreen = ({
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  breathDuration,
  onBreathDurationChange,
  setBreathTime
}) => {
  const { t } = useLanguage();
  const { getScreenBackgroundColor, getCurrentThemeColors } = useTheme();
  const [tempValue, setTempValue] = useState(breathDuration || 1);

  const themeColors = getCurrentThemeColors();
  const backgroundColor = getScreenBackgroundColor() || themeColors?.background || '#f4ddc4';
  const textColor = themeColors?.text || '#000000';
  const isDarkMode = textColor.includes('255, 255, 255') ||
                     textColor === '#ffffff' ||
                     textColor === 'white' ||
                     textColor.includes('rgba(255, 255, 255');

  // Všechny texty by měly být bílé v dark mode, černé v light mode
  const displayTextColor = isDarkMode ? '#ffffff' : '#000000';
  const borderColor = themeColors?.border || 'rgba(0, 0, 0, 0.1)';
  const cardColor = themeColors?.card || 'rgba(255, 255, 255, 0.7)';

  const handleConfirm = () => {
    onBreathDurationChange(tempValue);
    if (setBreathTime) {
      setBreathTime(tempValue * 60);
    }
    onNavigateToScreen('breath');
  };

  const handleSoundButtonClick = () => {
    onNavigateToScreen('sound-theme-gallery');
  };

  return (
    <FramerPageTransition screenKey="duration-picker">
      <div
        className="min-h-screen w-full max-w-full flex flex-col items-center justify-start p-6 overflow-x-hidden overflow-y-auto relative"
        style={{ backgroundColor }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <BackButton onClick={() => onNavigateToScreen('breath')} />

        <div className="max-w-md w-full flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8 w-full">
            <h2 className="text-2xl font-light" style={{ color: displayTextColor }}>
              {t('dlzka') || 'délka'}
            </h2>
          </div>

          {/* Picker - velký, na středu */}
          <div className="flex flex-col items-center justify-center mb-8 flex-1 w-full min-h-[calc(100vh-280px)]">
            <div className="transform scale-[1.6] origin-center">
              <Suspense fallback={
                <div className="flex items-center justify-center w-32 h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: textColor }}></div>
                </div>
              }>
                <WheelPicker
                  value={tempValue}
                  onChange={setTempValue}
                  min={1}
                  max={60}
                  step={1}
                  label={t('minut')}
                  className="w-48"
                />
              </Suspense>
            </div>
          </div>

          {/* Footer - tlačítka */}
          <div className="flex flex-row justify-center gap-3 pt-4 pb-2 w-full border-t" style={{ borderColor }}>
            {/* Tlačítko ZVUKY */}
            <button
              onClick={handleSoundButtonClick}
              className="px-6 py-3 rounded transition-colors flex items-center justify-center gap-2"
              style={{
                backgroundColor: cardColor,
                color: displayTextColor,
                borderColor,
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
            >
              <Music2 size={18} />
              <span>{t('zvuky') || 'zvuky'}</span>
            </button>
            {/* Hlavní tlačítko */}
            <button
              onClick={handleConfirm}
              className="px-8 py-3 rounded transition-colors"
              style={{
                backgroundColor: cardColor,
                color: displayTextColor,
                borderColor,
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
            >
              {t('hotovo')}
            </button>
          </div>
        </div>
      </div>
    </FramerPageTransition>
  );
};

export default DurationPickerScreen;

