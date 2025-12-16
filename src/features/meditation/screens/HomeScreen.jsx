import React, { useEffect } from 'react';
import { FramerPageTransition } from '@components';
import { useLanguage } from '@contexts/LanguageContext';
import { useTheme } from '@contexts/ThemeContext';
import { useThemeColors } from '@hooks/useThemeColors';

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
    getSectionBackgroundColor,
    hasImage
  } = useThemeColors();

  const bgStyle = getBackgroundStyle();
  const displayTextColor = getTextColor();

  // Aktivuj audio permission při prvním renderu HomeScreen
  useEffect(() => {
    if (audioPermission?.handleUserInteraction) {
      // Simuluj user interaction pro aktivaci audio permission
      audioPermission.handleUserInteraction();
    }
  }, [audioPermission]);

  return (
    <FramerPageTransition screenKey="home">
      <div
        className="min-h-screen w-full max-w-full flex flex-col overflow-x-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          height: '100vh',
          backgroundColor: getScreenBackgroundColor(),
          // Pokud máme obrázek, aplikovat ho přímo na tento div
          ...(hasImage && bgStyle.backgroundImage ? {
            backgroundImage: bgStyle.backgroundImage,
            backgroundSize: bgStyle.backgroundSize,
            backgroundPosition: bgStyle.backgroundPosition,
            backgroundRepeat: bgStyle.backgroundRepeat
          } : {})
        }}
      >
        <div
          className="flex-1 flex items-center justify-center cursor-pointer relative"
          onClick={() => onNavigateToScreen('meditace')}
          onTouchStart={onTouchStart}
          style={{
            backgroundColor: getSectionBackgroundColor(true) // true = primary color
          }}
        >
          <div className="text-center px-2 sm:px-8 py-4">
            <div
              className="text-5xl font-light tracking-wide py-4 leading-loose"
              style={{ color: displayTextColor }}
            >
              {t('slova')}
            </div>
          </div>
        </div>

        <div
          className="flex-1 flex items-center justify-center cursor-pointer"
          onClick={() => onNavigateToScreen('hudba')}
          onTouchStart={onTouchStart}
          style={{
            backgroundColor: getSectionBackgroundColor(false) // false = card color
          }}
        >
          <div className="text-center px-2 sm:px-8 py-4">
            <div
              className="text-5xl font-light tracking-wide py-4 leading-loose"
              style={{ color: displayTextColor }}
            >
              {t('hudba')}
            </div>
          </div>
        </div>

        <div
          className="flex-1 flex items-center justify-center cursor-pointer"
          onClick={() => onNavigateToScreen('dychani')}
          style={{
            backgroundColor: getSectionBackgroundColor(true) // true = primary color
          }}
        >
          <div className="text-center px-2 sm:px-8 py-4">
            <div
              className="text-5xl font-light tracking-wide mb-4 py-4 leading-loose"
              style={{ color: displayTextColor }}
            >
              {t('dychanie') || 'dýchání'}
            </div>
          </div>
        </div>

        <div
          className="flex-1 flex items-center justify-center cursor-pointer"
          onClick={() => onNavigateToScreen('settings')}
          style={{
            backgroundColor: getSectionBackgroundColor(false) // false = card color
          }}
        >
          <div className="text-center px-2 sm:px-8 py-4">
            <div
              className="text-5xl font-light tracking-wide py-4 leading-loose"
              style={{ color: displayTextColor }}
            >
              {t('nastavenie')}
            </div>
          </div>
        </div>

      </div>
    </FramerPageTransition>
  );
};

export default HomeScreen;
