import React, { useEffect } from 'react';
import { FramerPageTransition } from '@components';
import { useLanguage } from '@contexts/LanguageContext';
import { useTheme } from '@contexts/ThemeContext';

const HomeScreen = ({
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  audioPermission
}) => {
  const { t } = useLanguage();
  const { currentTheme, getScreenBackgroundColor } = useTheme();

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
          backgroundColor: getScreenBackgroundColor()
        }}
      >
        <div
          className="flex-1 flex items-center justify-center cursor-pointer relative"
          onClick={() => onNavigateToScreen('slova')}
          onTouchStart={onTouchStart}
          style={{ backgroundColor: currentTheme?.colors?.primary || '#f4ddc4' }}
        >
          <div className="text-center px-2 sm:px-8 py-4">
            <div
              className="text-5xl font-light tracking-wide py-4 leading-loose"
              style={{ color: currentTheme?.colors?.text || '#000000' }}
            >
              {t('meditace') || 'meditace'}
            </div>
          </div>
        </div>

        <div
          className="flex-1 flex items-center justify-center cursor-pointer"
          onClick={() => onNavigateToScreen('hudba')}
          onTouchStart={onTouchStart}
          style={{ backgroundColor: currentTheme?.colors?.card || '#ffffff' }}
        >
          <div className="text-center px-2 sm:px-8 py-4">
            <div
              className="text-5xl font-light tracking-wide py-4 leading-loose"
              style={{ color: currentTheme?.colors?.text || '#000000' }}
            >
              {t('hudba')}
            </div>
          </div>
        </div>

        <div
          className="flex-1 flex items-center justify-center cursor-pointer"
          onClick={() => onNavigateToScreen('breath')}
          style={{ backgroundColor: currentTheme?.colors?.primary || '#f4ddc4' }}
        >
          <div className="text-center px-2 sm:px-8 py-4">
            <div
              className="text-5xl font-light tracking-wide mb-4 py-4 leading-loose"
              style={{ color: currentTheme?.colors?.text || '#000000' }}
            >
              {t('dychanie') || 'dýchání'}
            </div>
          </div>
        </div>

        <div
          className="flex-1 flex items-center justify-center cursor-pointer"
          onClick={() => onNavigateToScreen('settings')}
          style={{ backgroundColor: currentTheme?.colors?.card || '#ffffff' }}
        >
          <div className="text-center px-2 sm:px-8 py-4">
            <div
              className="text-5xl font-light tracking-wide py-4 leading-loose"
              style={{ color: currentTheme?.colors?.text || '#000000' }}
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
