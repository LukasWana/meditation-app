import React, { useMemo, useEffect } from 'react';
import { FramerButton, FramerSection, FramerPageTransition, BackButton } from '@components';
import { useLanguage } from '@contexts/LanguageContext';
import { useRealtimeMeditaceFilter } from '@hooks/useRealtimeMeditaceFilter';

const STORAGE_KEY = 'meditation-app-active-audio-meditace';

const MeditaceScreen = ({
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  gender = 'none',
  onPlayerStateChange,
  onGenderChange
}) => {
  const { t, language } = useLanguage();

  useEffect(() => {
    try {
      localStorage.setItem('meditation-app-current-screen', 'meditace');
      localStorage.setItem('meditation-app-previous-screen', 'meditace');
    } catch (e) {
      console.warn('⚠️ MeditaceScreen: Failed to persist current screen', e);
    }
  }, []);

  console.log(`🔍 MeditaceScreen - Current language: ${language}`);
  console.log(`🔍 MeditaceScreen - Current gender: ${gender}`);

  const normalizedLanguage = useMemo(() => language.toLowerCase(), [language]);

  const { meditaceItems, isLoading, error } = useRealtimeMeditaceFilter(gender, normalizedLanguage);

  console.log(`🔍 MeditaceScreen - meditaceItems:`, meditaceItems);
  console.log(`🔍 MeditaceScreen - isLoading:`, isLoading);
  console.log(`🔍 MeditaceScreen - error:`, error);

  const handleItemClick = (item) => {
    const audioSrc = item.audioSrc || item.fileName;
    if (!audioSrc) {
      console.warn('⚠️ MeditaceScreen: Item nemá audioSrc ani fileName', item);
      return;
    }

    const payload = {
      audioSrc,
      title: item.title,
      fileName: item.fileName || item.audioSrc,
      albumTracks: [{
        audioSrc,
        trackName: item.title,
        fileName: item.fileName || item.audioSrc
      }],
      currentTrackIndex: 0,
      allFiles: item.allFiles || []
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      localStorage.setItem('meditation-app-previous-screen', 'meditace');
    } catch (e) {
      console.error('❌ MeditaceScreen: Failed to persist active audio', e);
    }

    onPlayerStateChange?.(true);
    onNavigateToScreen('audio-player-meditace');
  };

  if (isLoading) {
    return (
      <FramerPageTransition screenKey="meditace">
        <div className="min-h-screen w-full max-w-full bg-[#f4ddc4] flex flex-col items-center justify-center p-2 sm:p-8 pb-20 overflow-x-hidden relative">
          <BackButton onClick={() => onNavigateToScreen('home')} />
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-700 mx-auto mb-4"></div>
            <p className="text-xl text-gray-700">Načítám meditace...</p>
          </div>
        </div>
      </FramerPageTransition>
    );
  }

  if (error) {
    return (
      <FramerPageTransition screenKey="meditace">
        <div className="min-h-screen w-full max-w-full bg-[#f4ddc4] flex flex-col items-center justify-center p-2 sm:p-8 pb-20 overflow-x-hidden relative">
          <BackButton onClick={() => onNavigateToScreen('home')} />
          <div className="text-center">
            <p className="text-xl text-red-600 mb-4">Chyba při načítání</p>
            <p className="text-gray-700">{error}</p>
          </div>
        </div>
      </FramerPageTransition>
    );
  }

  return (
    <FramerPageTransition screenKey="meditace">
      <div
        className="min-h-screen w-full max-w-full bg-[#f4ddc4] flex flex-col items-center justify-start p-2 sm:p-8 pb-20 overflow-x-hidden relative"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 px-2">
          <button
            onClick={() => onNavigateToScreen('home')}
            className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-black/10 hover:bg-white/30 flex items-center justify-center p-0 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 19-7-7 7-7"/>
              <path d="M19 12H5"/>
            </svg>
          </button>
        </div>

        <div className="max-w-md w-full" style={{ marginTop: '4rem', paddingTop: 0, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          <FramerSection
            className="text-center mb-6"
            animationType="fadeIn"
            delay={0.1}
          >
            <div style={{ height: '3.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h1 className="text-4xl font-light" style={{ minHeight: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {t('meditace')}
              </h1>
            </div>
            <p className="text-xl text-center text-gray-700 mb-8">
              {t('mluvene')}
            </p>
          </FramerSection>

          <div className="space-y-4">
            {meditaceItems.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 text-lg">Žiadne meditácie nie sú dostupné</p>
                <p className="text-gray-500 text-sm mt-2">Skúste zmeniť nastavenia v menu</p>
              </div>
            ) : (
              meditaceItems.map((item, idx) => (
                <FramerSection
                  key={item.key || idx}
                  animationType="slideInUp"
                  delay={0.2 + idx * 0.1}
                >
                  <FramerButton
                    variant="ghost"
                    className="w-full p-6 text-left bg-white/50 backdrop-blur rounded-none border border-black/10"
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div>
                          <h3 className="text-2xl font-light">
                            {item.title}
                          </h3>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl font-light text-gray-500">
                          {item.duration}
                        </span>
                      </div>
                    </div>
                  </FramerButton>
                </FramerSection>
              ))
            )}
          </div>
        </div>
      </div>
    </FramerPageTransition>
  );
};

export default MeditaceScreen;
