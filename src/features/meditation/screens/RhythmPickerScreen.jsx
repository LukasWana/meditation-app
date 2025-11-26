import React, { useState, Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { Music2 } from 'lucide-react';
import { FramerPageTransition, BackButton } from '@components';
import { useLanguage } from '@contexts/LanguageContext';
import { useTheme } from '@contexts/ThemeContext';

// Lazy loading DualWheelPicker komponent
const DualWheelPicker = lazy(() => import('@components/WheelPicker').then(m => ({ default: m.DualWheelPicker })));

const RhythmPickerScreen = ({
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  breathInDuration,
  breathOutDuration,
  onBreathRhythmChange
}) => {
  const { t } = useLanguage();
  const { getScreenBackgroundColor, getCurrentThemeColors } = useTheme();
  const [tempLeftValue, setTempLeftValue] = useState(breathInDuration || 4);
  const [tempRightValue, setTempRightValue] = useState(breathOutDuration || 4);

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
    onBreathRhythmChange(tempLeftValue, tempRightValue);
    onNavigateToScreen('breath');
  };

  const handleSoundButtonClick = () => {
    onNavigateToScreen('sound-theme-gallery');
  };

  return (
    <FramerPageTransition screenKey="rhythm-picker">
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
              {t('rytmus') || 'rytmus'}
            </h2>
          </div>

          {/* Picker - velký, na středu */}
          <div className="flex flex-col items-center justify-center mb-8 flex-1 w-full min-h-[calc(100vh-280px)]">
            <div className="transform scale-[1.6] origin-center">
              <Suspense fallback={
                <div className="flex items-center justify-center w-full max-w-md h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: textColor }}></div>
                </div>
              }>
                <DualWheelPicker
                  leftValue={tempLeftValue}
                  rightValue={tempRightValue}
                  onLeftChange={setTempLeftValue}
                  onRightChange={setTempRightValue}
                  leftLabel={t('nadech') || 'nádech'}
                  rightLabel={t('vydech') || 'výdech'}
                  leftMin={1}
                  leftMax={20}
                  leftStep={1}
                  rightMin={1}
                  rightMax={20}
                  rightStep={1}
                  className="w-full max-w-md"
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

export default RhythmPickerScreen;

