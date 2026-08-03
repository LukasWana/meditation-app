import React, { useEffect, memo } from 'react';
import FramerPageTransition from '@components/FramerPageTransition';
import { useLanguage } from '@contexts/LanguageContext';
import { useTheme } from '@contexts/ThemeContext';
import { useThemeColors } from '@hooks';

// Memoized sekce - prevence re-renderů při každém App update (rerender-memo rule)
const SectionButton = memo(({ onPress, onTouchStart, textColor, children }) => (
  <div
    className="glass-panel flex-1 flex items-center justify-center cursor-pointer transition-transform active:scale-95"
    onClick={onPress}
    onTouchStart={onTouchStart}
  >
    <div className="text-center px-4 py-2">
      <div
        className="text-4xl sm:text-5xl font-light tracking-wide py-2"
        style={{ color: textColor }}
      >
        {children}
      </div>
    </div>
  </div>
));
SectionButton.displayName = 'SectionButton';

const HomeScreen = ({
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  audioPermission
}) => {
  const { t } = useLanguage();
  const { getScreenBackgroundColor, getBackgroundStyle } = useTheme();
  const {
    getTextColor,
    hasImage
  } = useThemeColors();

  const bgStyle = getBackgroundStyle();
  const displayTextColor = getTextColor();
  const screenBg = getScreenBackgroundColor();

  // Aktivuj audio permission při prvním renderu HomeScreen
  useEffect(() => {
    if (audioPermission?.handleUserInteraction) {
      audioPermission.handleUserInteraction();
    }
  }, [audioPermission]);

  return (
    <FramerPageTransition screenKey="home">
      <div
        className="h-dvh w-full max-w-full flex flex-col overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          height: '100dvh',
          backgroundColor: screenBg,
          paddingTop: 'calc(5.5rem + env(safe-area-inset-top, 0px))',
          paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
          // Pokud máme obrázek, aplikovat ho přímo na tento div
          ...(hasImage && bgStyle.backgroundImage ? {
            backgroundImage: bgStyle.backgroundImage,
            backgroundSize: bgStyle.backgroundSize,
            backgroundPosition: bgStyle.backgroundPosition,
            backgroundRepeat: bgStyle.backgroundRepeat
          } : {})
        }}
      >
        <div className="flex-1 p-3 flex flex-col gap-3 max-w-lg mx-auto w-full justify-center overflow-visible">
          <SectionButton
            onPress={() => onNavigateToScreen('meditace')}
            onTouchStart={onTouchStart}
            textColor={displayTextColor}
          >
            {t('slova')}
          </SectionButton>

          <SectionButton
            onPress={() => onNavigateToScreen('hudba')}
            onTouchStart={onTouchStart}
            textColor={displayTextColor}
          >
            {t('hudba')}
          </SectionButton>

          <SectionButton
            onPress={() => onNavigateToScreen('dychani')}
            textColor={displayTextColor}
          >
            {t('dychanie') || 'dýchání'}
          </SectionButton>

          <SectionButton
            onPress={() => onNavigateToScreen('settings')}
            textColor={displayTextColor}
          >
            {t('nastavenie')}
          </SectionButton>
        </div>
      </div>
    </FramerPageTransition>
  );
};

export default HomeScreen;
