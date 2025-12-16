import React, { useState, Suspense, lazy } from 'react';
import { Music2, Plus, Minus } from 'lucide-react';
import { FramerPageTransition, BackButton } from '@components';
import { useLanguage } from '@contexts/LanguageContext';
import { useTheme } from '@contexts/ThemeContext';

// Lazy loading WheelPicker komponent
const WheelPicker = lazy(() => import('@components/WheelPicker').then(m => ({ default: m.default })));

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

  // Haptic feedback helper
  const triggerHaptic = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  const handleLeftIncrement = () => {
    triggerHaptic();
    setTempLeftValue(Math.min(20, tempLeftValue + 1));
  };

  const handleLeftDecrement = () => {
    triggerHaptic();
    setTempLeftValue(Math.max(1, tempLeftValue - 1));
  };

  const handleRightIncrement = () => {
    triggerHaptic();
    setTempRightValue(Math.min(20, tempRightValue + 1));
  };

  const handleRightDecrement = () => {
    triggerHaptic();
    setTempRightValue(Math.max(1, tempRightValue - 1));
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
          {/* Středový blok: nadpis + wheel (vertikálně doprostřed) */}
          <div className="flex flex-col items-center justify-center flex-1 w-full">
            <h2 className="text-2xl font-light mb-6 text-center" style={{ color: displayTextColor }}>
              {t('rytmus') || 'rytmus'}
            </h2>

            <div
              style={{
                transform: 'scale(1.6)',
                transformOrigin: 'center',
                padding: '60px 40px',
                margin: '-60px -40px'
              }}
            >
              <Suspense fallback={
                <div className="flex items-center justify-center w-full max-w-md h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: textColor }}></div>
                </div>
              }>
                <div className="flex items-center gap-4">
                  {/* Nádech picker s +/- tlačítky */}
                  <div className="flex flex-col items-center">
                    <WheelPicker
                      value={tempLeftValue}
                      onChange={setTempLeftValue}
                      min={1}
                      max={20}
                      step={1}
                      label={t('nadech') || 'nádech'}
                    />
                    {/* +/- pod wheelem */}
                    <div className="flex items-center gap-3 mt-3">
                      <button
                        onClick={handleLeftDecrement}
                        disabled={tempLeftValue <= 1}
                        className="flex items-center justify-center w-10 h-9 rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: cardColor,
                          border: `2px solid ${borderColor}`,
                          color: displayTextColor
                        }}
                      >
                        <Minus size={16} />
                      </button>
                      <button
                        onClick={handleLeftIncrement}
                        disabled={tempLeftValue >= 20}
                        className="flex items-center justify-center w-10 h-9 rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: cardColor,
                          border: `2px solid ${borderColor}`,
                          color: displayTextColor
                        }}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="text-3xl font-light pt-8" style={{ color: displayTextColor }}>:</div>

                  {/* Výdech picker s +/- tlačítky */}
                  <div className="flex flex-col items-center">
                    <WheelPicker
                      value={tempRightValue}
                      onChange={setTempRightValue}
                      min={1}
                      max={20}
                      step={1}
                      label={t('vydech') || 'výdech'}
                    />
                    {/* +/- pod wheelem */}
                    <div className="flex items-center gap-3 mt-3">
                      <button
                        onClick={handleRightDecrement}
                        disabled={tempRightValue <= 1}
                        className="flex items-center justify-center w-10 h-9 rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: cardColor,
                          border: `2px solid ${borderColor}`,
                          color: displayTextColor
                        }}
                      >
                        <Minus size={16} />
                      </button>
                      <button
                        onClick={handleRightIncrement}
                        disabled={tempRightValue >= 20}
                        className="flex items-center justify-center w-10 h-9 rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: cardColor,
                          border: `2px solid ${borderColor}`,
                          color: displayTextColor
                        }}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>
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

