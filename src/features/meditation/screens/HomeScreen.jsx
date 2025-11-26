import React, { useEffect } from 'react';
import { FramerPageTransition } from '@components';
import { useLanguage } from '@contexts/LanguageContext';

const HomeScreen = ({
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  audioPermission
}) => {
  const { t } = useLanguage();

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
        className="min-h-screen w-full max-w-full bg-[#f4ddc4] flex flex-col overflow-x-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ height: '100vh' }}
      >
        <div
          className="flex-1 flex items-center justify-center bg-[#f4ddc4] cursor-pointer relative"
          onClick={() => onNavigateToScreen('slova')}
          onTouchStart={onTouchStart}
        >
          <div className="text-center px-2 sm:px-8 py-4">
            <div className="text-5xl font-light tracking-wide py-4 leading-loose">
              {t('meditace') || 'meditace'}
            </div>
          </div>
        </div>

        <div
          className="flex-1 flex items-center justify-center bg-[#ffffff] cursor-pointer"
          onClick={() => onNavigateToScreen('hudba')}
          onTouchStart={onTouchStart}
        >
          <div className="text-center px-2 sm:px-8 py-4">
            <div className="text-5xl font-light tracking-wide py-4 leading-loose">
              {t('hudba')}
            </div>
          </div>
        </div>

        <div
          className="flex-1 flex items-center justify-center bg-[#f4ddc4] cursor-pointer"
          onClick={() => onNavigateToScreen('breath')}
        >
          <div className="text-center px-2 sm:px-8 py-4">
            <div className="text-5xl font-light tracking-wide mb-4 py-4 leading-loose">
              {t('dychanie') || 'dýchání'}
            </div>
          </div>
        </div>

        <div
          className="flex-1 flex items-center justify-center bg-[#ffffff] cursor-pointer"
          onClick={() => onNavigateToScreen('settings')}
        >
          <div className="text-center px-2 sm:px-8 py-4">
            <div className="text-5xl font-light tracking-wide py-4 leading-loose">
              {t('nastavenie')}
            </div>
          </div>
        </div>

      </div>
    </FramerPageTransition>
  );
};

export default HomeScreen;
