import React, { useEffect } from 'react';
import { FramerPageTransition } from '@components';
import { useLanguage } from '@contexts/LanguageContext';
import { useTheme } from '@contexts/ThemeContext';
import { useThemeColors } from '@hooks';

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
        <div className="flex-1 p-4 flex flex-col gap-4 max-w-lg mx-auto w-full justify-center">
          <div
            className="glass-panel flex-1 flex items-center justify-center cursor-pointer transition-transform active:scale-95"
            onClick={() => onNavigateToScreen('meditace')}
            onTouchStart={onTouchStart}
          >
            <div className="text-center px-4 py-2">
              <div
                className="text-4xl sm:text-5xl font-light tracking-wide py-2"
                style={{ color: displayTextColor }}
              >
                {t('slova')}
              </div>
            </div>
          </div>

          <div
            className="glass-panel flex-1 flex items-center justify-center cursor-pointer transition-transform active:scale-95"
            onClick={() => onNavigateToScreen('hudba')}
            onTouchStart={onTouchStart}
          >
            <div className="text-center px-4 py-2">
              <div
                className="text-4xl sm:text-5xl font-light tracking-wide py-2"
                style={{ color: displayTextColor }}
              >
                {t('hudba')}
              </div>
            </div>
          </div>

          <div
            className="glass-panel flex-1 flex items-center justify-center cursor-pointer transition-transform active:scale-95"
            onClick={() => onNavigateToScreen('dychani')}
          >
            <div className="text-center px-4 py-2">
              <div
                className="text-4xl sm:text-5xl font-light tracking-wide py-2"
                style={{ color: displayTextColor }}
              >
                {t('dychanie') || 'dýchání'}
              </div>
            </div>
          </div>

          <div
            className="glass-panel flex-1 flex items-center justify-center cursor-pointer transition-transform active:scale-95"
            onClick={() => onNavigateToScreen('settings')}
          >
            <div className="text-center px-4 py-2">
              <div
                className="text-4xl sm:text-5xl font-light tracking-wide py-2"
                style={{ color: displayTextColor }}
              >
                {t('nastavenie')}
              </div>
            </div>
          </div>
        </div>

      </div>
    </FramerPageTransition>
  );
};

export default HomeScreen;
