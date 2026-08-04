import React, { useState, Suspense, lazy } from 'react';
import { Music2, Plus, Minus } from 'lucide-react';
import FramerPageTransition from '@components/FramerPageTransition';
import BackButton from '@components/BackButton';
import { Heading } from '@components/ui/Heading';
import { useLanguage } from '@contexts/LanguageContext';
import { useTheme } from '@contexts/ThemeContext';
import { useBreathStore } from '@stores/breathStore';

// Lazy loading WheelPicker komponent
const WheelPicker = lazy(() => import('@components/WheelPicker').then(m => ({ default: m.default })));

const DurationPickerScreen = ({
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}) => {
  const { t } = useLanguage();
  const { getScreenBackgroundColor, getCurrentThemeColors } = useTheme();
  const { breathDuration, setBreathDuration } = useBreathStore();
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
  const _cardColor = themeColors?.card || 'rgba(255, 255, 255, 0.7)';

  const handleConfirm = () => {
    setBreathDuration(tempValue); // Sets both breathDuration and breathTime
    onNavigateToScreen('breath');
  };

  const handleSoundButtonClick = () => {
    onNavigateToScreen('sound-theme-gallery');
  };

  // Haptic feedback helper
  const triggerHaptic = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  const handleIncrement = () => {
    triggerHaptic();
    setTempValue(Math.min(60, tempValue + 1));
  };

  const handleDecrement = () => {
    triggerHaptic();
    setTempValue(Math.max(1, tempValue - 1));
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
          {/* Středový blok: nadpis + wheel (vertikálně doprostřed) */}
          <div className="flex flex-col items-center justify-center flex-1 w-full">
            <Heading level={2} className="mb-6 text-center" style={{ color: displayTextColor }}>
              {t('dlzka') || 'délka'}
            </Heading>

            <div className="flex flex-col items-center">
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
                  itemHeight={70}
                  visibleItems={5}
                  pickerWidth={110}
                  className="w-48"
                />
              </Suspense>

              {/* +/- tlačítka pod wheelpickerem vedle sebe */}
              <div className="flex items-center gap-4 mt-5">
                <button
                  onClick={handleDecrement}
                  disabled={tempValue <= 1}
                  className="glass-button flex items-center justify-center w-14 h-12 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ color: displayTextColor }}
                >
                  <Minus size={20} />
                </button>
                <button
                  onClick={handleIncrement}
                  disabled={tempValue >= 60}
                  className="glass-button flex items-center justify-center w-14 h-12 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ color: displayTextColor }}
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Footer - tlačítka */}
          <div className="flex flex-row justify-center gap-3 pt-4 pb-2 w-full border-t" style={{ borderColor }}>
            {/* Tlačítko ZVUKY */}
            <button
              onClick={handleSoundButtonClick}
              className="glass-button px-6 py-3 transition-colors flex items-center justify-center gap-2"
              style={{ color: displayTextColor }}
            >
              <Music2 size={18} />
              <span>{t('zvuky') || 'zvuky'}</span>
            </button>
            {/* Hlavní tlačítko */}
            <button
              onClick={handleConfirm}
              className="glass-button px-8 py-3 transition-colors"
              style={{ color: displayTextColor }}
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

