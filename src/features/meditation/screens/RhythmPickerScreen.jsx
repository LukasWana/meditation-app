import React, { useState, Suspense, lazy } from 'react';
import { Music2, Plus, Minus } from 'lucide-react';
import FramerPageTransition from '@components/FramerPageTransition';
import FramerSection from '@components/FramerSection';
import BackButton from '@components/BackButton';
import { Heading } from '@components/ui/Heading';
import { useLanguage } from '@contexts/LanguageContext';
import { useTheme } from '@contexts/ThemeContext';
import { useBreathStore } from '@stores/breathStore';

// Lazy loading WheelPicker komponent
const WheelPicker = lazy(() => import('@components/WheelPicker').then(m => ({ default: m.default })));

const RhythmPickerScreen = ({
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}) => {
  const { t } = useLanguage();
  const { getScreenBackgroundColor, getCurrentThemeColors } = useTheme();
  const { breathInDuration, breathOutDuration, setBreathRhythm } = useBreathStore();
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
  const _cardColor = themeColors?.card || 'rgba(255, 255, 255, 0.7)';

  const handleConfirm = () => {
    setBreathRhythm(tempLeftValue, tempRightValue);
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
        className="min-h-screen w-full max-w-full flex flex-col items-center justify-start p-6 overflow-x-hidden overflow-y-auto relative screen-safe-top"
        style={{ backgroundColor }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <BackButton onClick={() => onNavigateToScreen('breath')} />

        <div className="max-w-md w-full flex flex-col items-center justify-center min-h-[calc(100dvh-4rem)] py-8">
          {/* Středový blok: nadpis + wheel (vertikálně doprostřed) */}
          <div className="flex flex-col items-center justify-center flex-1 w-full">
            <FramerSection
              className="text-center mb-6"
              animationType="fadeIn"
              delay={0.1}
            >
              <div style={{ height: '3.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '0.5rem' }}>
                <Heading level={1}>
                  {t('rytmus') || 'rytmus'}
                </Heading>
              </div>
            </FramerSection>

            <Suspense fallback={
              <div className="flex items-center justify-center w-full max-w-md h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: textColor }}></div>
              </div>
            }>
              {/* Bez scale: nativně větší wheel, responzivní mezery (mobile safe) */}
              <div className="flex items-start justify-center gap-6 sm:gap-10 w-full">
                {/* Nádech */}
                <div className="flex flex-col items-center">
                  <WheelPicker
                    value={tempLeftValue}
                    onChange={setTempLeftValue}
                    min={1}
                    max={20}
                    step={1}
                    label={t('nadech') || 'nádech'}
                    itemHeight={70}
                    visibleItems={5}
                    pickerWidth={110}
                  />
                  <div className="flex items-center gap-4 mt-5">
                    <button
                      onClick={handleLeftDecrement}
                      disabled={tempLeftValue <= 1}
                      className="glass-button flex items-center justify-center w-14 h-12 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ color: displayTextColor }}
                    >
                      <Minus size={18} />
                    </button>
                    <button
                      onClick={handleLeftIncrement}
                      disabled={tempLeftValue >= 20}
                      className="glass-button flex items-center justify-center w-14 h-12 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ color: displayTextColor }}
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>

                {/* Výdech */}
                <div className="flex flex-col items-center">
                  <WheelPicker
                    value={tempRightValue}
                    onChange={setTempRightValue}
                    min={1}
                    max={20}
                    step={1}
                    label={t('vydech') || 'výdech'}
                    itemHeight={70}
                    visibleItems={5}
                    pickerWidth={110}
                  />
                  <div className="flex items-center gap-4 mt-5">
                    <button
                      onClick={handleRightDecrement}
                      disabled={tempRightValue <= 1}
                      className="glass-button flex items-center justify-center w-14 h-12 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ color: displayTextColor }}
                    >
                      <Minus size={18} />
                    </button>
                    <button
                      onClick={handleRightIncrement}
                      disabled={tempRightValue >= 20}
                      className="glass-button flex items-center justify-center w-14 h-12 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ color: displayTextColor }}
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </Suspense>
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

export default RhythmPickerScreen;

