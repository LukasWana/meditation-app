import React, { useState, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { FramerButton, FramerSection, FramerPageTransition, BackButton, BackgroundShader } from '@components';
import { AudioPlayer } from '@features/audio';
import { useFirebaseHudbaFilter } from '@features/audio/hooks/useFirebaseHudbaFilter';
import { useShaderSettings } from '@contexts/ShaderSettingsContext';
import { useAudioAnalysis } from '@contexts/AudioAnalysisContext';
import { usePlayback } from '@contexts/ShaderPlaybackContext';
import { useLanguage } from '@contexts/LanguageContext';
import { shouldUseDarkMode } from '@utils/colorUtils';

const HudbaScreen = ({
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onPlayerStateChange
}) => {
  const [activeAudio, setActiveAudio] = useState(null);
  const { t } = useLanguage();

  // Použij hudební filtrovací systém
  const { hudbaItems, isLoading, isLoadingCovers, error } = useFirebaseHudbaFilter();

  // Shader settings pro pozadí přehrávače
  const { getShaderForSection, getColorForSection } = useShaderSettings();
  const { audioData } = useAudioAnalysis();
  const { transitionState } = usePlayback();

  // Urči, jaký shader/barva se má zobrazit
  const currentShader = useMemo(() => {
    // Prioritizace: 1. transitionState (aktivní přehrávání), 2. shader z settings, 3. barva z settings
    if (transitionState?.toShaderKey && transitionState.toShaderKey !== '__BLACK__') {
      const transitionKey = transitionState.toShaderKey;
      if (transitionKey.startsWith('__COLOR__')) {
        const shader = getShaderForSection('hudba');
        if (shader && shader !== 'default') {
          return shader;
        }
      }
      return transitionKey;
    }

    const shader = getShaderForSection('hudba');
    if (shader) {
      return shader;
    }

    const color = getColorForSection('hudba');
    if (color) {
      return `__COLOR__${color}`;
    }

    return 'default';
  }, [transitionState, getShaderForSection, getColorForSection]);

  const backgroundColor = getColorForSection('hudba');
  const isColorMode = currentShader?.startsWith('__COLOR__');
  const isDarkMode = shouldUseDarkMode(currentShader, backgroundColor);

  const handleItemClick = (item) => {
    // Pokud je to album, použij první track
    if (item.type === 'album' && item.tracks && item.tracks.length > 0) {
      const firstTrack = item.tracks[0];
      setActiveAudio({
        ...firstTrack,
        title: `${item.title} - ${firstTrack.trackName}`,
        albumCover: item.coverImage || null, // Předaj obrázek alba pro pozadí přehrávače
        albumTracks: item.tracks, // Předaj všechny tracky pro možnost přepínání
        currentTrackIndex: 0
      });
      onPlayerStateChange?.(true);
    } else if (item.audioSrc) {
      // Samostatná skladba
      setActiveAudio(item);
      onPlayerStateChange?.(true);
    }
  };

  const handleCloseAudio = () => {
    setActiveAudio(null);
    onPlayerStateChange?.(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <FramerPageTransition screenKey="hudba">
        <div className="min-h-screen w-full max-w-full bg-[#f4ddc4] flex flex-col items-center justify-center p-2 sm:p-8 pb-20 overflow-x-hidden relative">
          <BackButton onClick={() => onNavigateToScreen('home')} />
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-700 mx-auto mb-4"></div>
            <p className="text-xl text-gray-700">Načítám hudbu...</p>
          </div>
        </div>
      </FramerPageTransition>
    );
  }

  // Error state
  if (error) {
    return (
      <FramerPageTransition screenKey="hudba">
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
    <FramerPageTransition screenKey="hudba">
      <div
        className={`min-h-screen w-full max-w-full bg-[#f4ddc4] flex flex-col items-center justify-center p-2 sm:p-8 pb-20 overflow-x-hidden relative ${
          activeAudio ? 'pointer-events-none' : ''
        }`}
        onTouchStart={activeAudio ? undefined : onTouchStart}
        onTouchMove={activeAudio ? undefined : onTouchMove}
        onTouchEnd={activeAudio ? undefined : onTouchEnd}
      >
        {!activeAudio && (
          <BackButton
            onClick={() => onNavigateToScreen('home')}
          />
        )}

        <div className="max-w-md w-full mt-16">
          <FramerSection
            className="text-center mb-8"
            animationType="fadeIn"
            delay={0.1}
          >
            <h1 className="text-6xl font-light">
              {t('hudba')}
            </h1>
          </FramerSection>

          <div className="space-y-4">
            {hudbaItems.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 text-lg">Žiadne skladby nie sú dostupné</p>
                <p className="text-gray-500 text-sm mt-2">Skúste zmeniť nastavenia v menu</p>
              </div>
            ) : (
              hudbaItems.map((item, idx) => (
                <FramerSection
                  key={item.key || idx}
                  animationType="slideInUp"
                  delay={0.2 + idx * 0.1}
                >
                  <FramerButton
                    variant="ghost"
                    className={`w-full p-6 text-left bg-white/50 backdrop-blur rounded-none border border-black/10 ${
                      activeAudio ? 'pointer-events-none opacity-50' : ''
                    }`}
                    onClick={activeAudio ? undefined : () => handleItemClick(item)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {item.type === 'album' && (
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                            {item.coverImage ? (
                              <img
                                src={item.coverImage}
                                alt={item.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  if (e.target.nextSibling) {
                                    e.target.nextSibling.style.display = 'flex';
                                  }
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-400">
                                {isLoadingCovers ? (
                                  <div className="animate-spin text-lg">⏳</div>
                                ) : (
                                  <div className="text-2xl">🎵</div>
                                )}
                              </div>
                            )}
                            <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-400 placeholder-hidden" style={{ display: 'none' }}>
                              <div className="text-2xl">🎵</div>
                            </div>
                          </div>
                        )}
                        <div>
                          <h3 className="text-2xl font-light">
                            {item.title}
                          </h3>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {item.type === 'album' ? (
                          <span className="text-sm text-gray-500">
                            {item.tracks?.length || 0} skladieb
                          </span>
                        ) : (
                          <span className="text-2xl font-light text-gray-500">
                            {item.duration || 'N/A'}
                          </span>
                        )}
                      </div>
                    </div>
                  </FramerButton>
                </FramerSection>
              ))
            )}
          </div>

        </div>

        {/* BackgroundShader - zobraz pouze když je aktivní přehrávač */}
        {activeAudio && (
          <BackgroundShader
            variant={currentShader}
            intensity={0.8}
            enabled={true}
            opacity={isColorMode ? 1.0 : 1.0}
            audioData={audioData}
            forceSquare={currentShader?.startsWith('shader-') ? true : null}
            zIndex={5}
          />
        )}

        {/* Pozadí stránky - průhledné, aby shader prosvítal */}
        {activeAudio && (
          <div
            className="fixed max-w-full bg-[#f4ddc4]"
            style={{
              zIndex: 0,
              top: 0,
              left: 0,
              right: 0,
              bottom: '-20px',
              height: 'calc(100dvh + 20px)',
              opacity: isColorMode ? 1 : 0.3
            }}
          />
        )}

        {/* Audio Player Modal */}
        <AnimatePresence>
          {activeAudio && (
            <AudioPlayer
              key="audio-player"
              sectionKey="hudba"
              audioSrc={activeAudio.audioSrc}
              title={activeAudio.title}
              onClose={handleCloseAudio}
              albumCover={activeAudio.albumCover || null}
              albumTracks={activeAudio.albumTracks || null}
              currentTrackIndex={activeAudio.currentTrackIndex || 0}
              onNavigateToScreen={onNavigateToScreen}
              isDarkMode={isDarkMode}
              backgroundColor={backgroundColor || undefined}
            />
          )}
        </AnimatePresence>
      </div>
    </FramerPageTransition>
  );
};

export default HudbaScreen;