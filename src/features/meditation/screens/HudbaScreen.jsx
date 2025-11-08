import React, { useMemo } from 'react';
import { FramerSection, FramerPageTransition, BackButton, BackgroundShader } from '@components';
import { AlbumGrid } from '../components';
import { useHudbaScreenData } from '../hooks';
import { useLanguage } from '@contexts/LanguageContext';
import { useShaderSettings } from '@contexts/ShaderSettingsContext';
import { useAudioAnalysis } from '@contexts/AudioAnalysisContext';
import { usePlayback } from '@contexts/ShaderPlaybackContext';


const HudbaScreen = ({
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  gender = 'none',
  onPlayerStateChange
}) => {
  const { t } = useLanguage();
  const { getShaderForSection, getColorForSection } = useShaderSettings();
  const { transitionState } = usePlayback();

  // Debug: Zkontroluj, jaký shader se používá
  // Prioritizace: 1. transitionState, 2. barva z colorSettings, 3. shader z shaderSettings
  const colorOverride = getColorForSection('hudba');

  const currentShader = useMemo(() => {
    // Pokud je v transitionState něco kromě BLACK, použij to (může být barva __COLOR__ nebo shader)
    if (transitionState?.toShaderKey && transitionState.toShaderKey !== '__BLACK__') {
      return transitionState.toShaderKey;
    }

    // Pokud není v transitionState, zkontroluj barvu (má prioritu před shaderem)
    if (colorOverride) {
      return `__COLOR__${colorOverride}`;
    }

    // Jinak použij shader z settings (může být null pokud byla nastavena barva)
    const shader = getShaderForSection('hudba');
    return shader;
  }, [transitionState?.toShaderKey, colorOverride, getShaderForSection]);

  React.useEffect(() => {
    console.log('🎨 HudbaScreen: Shader info', {
      currentShader,
      transitionState: transitionState?.toShaderKey,
      shaderFromSettings: getShaderForSection('hudba'),
      colorFromSettings: getColorForSection('hudba'),
      isColorMode: currentShader && currentShader.startsWith('__COLOR__')
    });
  }, [currentShader, transitionState, getShaderForSection, getColorForSection]);

  // Hlavní logika pro data HudbaScreen
  const {
    hudbaItems,
    isLoading,
    error,
    stats,
    isLoadingCovers,
    isLoadingDurations,
    getDisplayDuration
  } = useHudbaScreenData();

  const handleItemClick = (item) => {
    // Ulož data o vybrané skladbě do localStorage pro přehrávač
    let audioData = null;

    if (item.type === 'album') {
      // Spusť první skladbu z alba
      if (item.tracks && item.tracks.length > 0) {
        const firstTrack = item.tracks[0];
        audioData = {
          audioSrc: firstTrack.audioSrc,
          title: firstTrack.trackName,
          fileName: firstTrack.fileName,
          albumCover: item.coverImage,
          albumTracks: item.tracks,
          currentTrackIndex: 0
        };
      }
    } else if (item.type === 'song' || item.audioSrc) {
      // Pro samostatné skladby - vytvoř "album" s jednou skladbou pro autoplay
      audioData = {
        ...item,
        albumCover: item.coverImage,
        albumTracks: [{
          audioSrc: item.audioSrc,
          trackName: item.title,
          fileName: item.fileName
        }],
        currentTrackIndex: 0
      };
    }

    // Ulož do localStorage a naviguj na stránku s přehrávačem
    if (audioData) {
      try {
        localStorage.setItem('meditation-app-active-audio-hudba', JSON.stringify(audioData));
        localStorage.setItem('meditation-app-previous-screen', 'hudba'); // Ulož, odkud jsme přišli
        localStorage.setItem('meditation-app-before-player-screen', 'hudba');
        onPlayerStateChange?.(true);
        onNavigateToScreen('audio-player-hudba'); // Naviguj na stránku s přehrávačem
      } catch (e) {
        console.error('Failed to save audio data:', e);
      }
    }
  };

  // Loading state - Hidden, show content immediately
  // if (isLoading) {
  //   return (
  //     <FramerPageTransition screenKey="hudba">
  //       <div className="min-h-screen w-full max-w-full bg-[#f4ddc4] flex flex-col items-center justify-center p-2 sm:p-8 pb-20 overflow-x-hidden relative">
  //         <BackButton onClick={() => onNavigateToScreen('home')} />
  //         <div className="text-center">
  //           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-700 mx-auto mb-4"></div>
  //           <p className="text-xl text-gray-700">Načítám hudbu...</p>
  //         </div>
  //       </div>
  //     </FramerPageTransition>
  //   );
  // }

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
      {/* Vrstvení:
          - Pozadí (bg-[#f4ddc4]): zIndex 0 (nejnižší)
          - BackgroundShader: zIndex 1 (nad pozadím, pod obsahem)
          - Obsah: zIndex 10 (nad shaderem)
      */}
      {/* Pozadí stránky */}
      <div
        className="min-h-screen w-full max-w-full fixed inset-0"
        style={{
          zIndex: 0,
          backgroundColor: colorOverride || '#f4ddc4'
        }}
      />

      {/* BackgroundShader - zobraz pouze barvu (shadery se zobrazují na stránce s přehrávačem) */}
      {/* Použij shader z PlaybackContext, pokud je k dispozici, jinak z ShaderSettingsContext */}
      {/* Zobraz pouze pokud je to barva (shadery se zobrazují až na stránce s přehrávačem) */}
      {currentShader && currentShader.startsWith('__COLOR__') && (
        <BackgroundShader
          variant={currentShader}
          intensity={1.0}
          enabled={true}
          opacity={1.0} // Barva zobraz vždy s plnou opacity
          zIndex={5} // Udrž barvu pod UI vrstvy
          audioData={null} // Na této stránce nepoužíváme audio data
        />
      )}

      {/* Hlavní obsah stránky */}
      <div
        className="min-h-screen w-full max-w-full bg-[#f4ddc4] flex flex-col items-center justify-start p-2 sm:p-8 pb-20 overflow-x-hidden relative"
        style={{ position: 'relative', zIndex: 10 }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <BackButton
          onClick={() => onNavigateToScreen('home')}
        />

        <div className="max-w-md w-full" style={{ marginTop: '4rem', paddingTop: 0, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          <FramerSection
            className="text-center mb-6"
            animationType="fadeIn"
            delay={0.1}
          >
            <div style={{ height: '3.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h1 className="text-4xl font-light" style={{ minHeight: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {t('hudba')}
              </h1>
            </div>

            {/* Loading indikátory - Hidden */}
            {/* {(isLoadingCovers || isLoadingDurations) && (
              <div className="mt-4 text-sm text-gray-600">
                {isLoadingCovers && <div>🖼️ Načítám obrázky alb...</div>}
                {isLoadingDurations && <div>⏱️ Načítám délky skladeb...</div>}
              </div>
            )} */}
            {/* <p className="text-xl text-center text-gray-700 mb-8">
              hudobné meditácie a relaxačné zvuky
            </p> */}

            {/* Zobraz statistiky - ZAKOMENTOVÁNO */}
            {/* {stats && (
              <div className="text-center mb-8 p-4 bg-white/30 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">
                  Dostupné skladby: {stats.availableFiles} z {stats.totalFiles}
                </p>
                <p className="text-xs text-gray-500 mb-1">
                  Hudební meditace a relaxační zvuky
                </p>
                {stats.lastUpdated && (
                  <p className="text-xs text-gray-400">
                    Aktualizováno: {new Date(stats.lastUpdated).toLocaleTimeString('sk-SK')}
                  </p>
                )}
              </div>
            )} */}
          </FramerSection>

          <AlbumGrid
            hudbaItems={hudbaItems}
            activeAudio={null} // Není žádný aktivní audio na této stránce
            onItemClick={handleItemClick}
            getDisplayDuration={getDisplayDuration}
            isLoadingCovers={isLoadingCovers}
          />

        </div>

        {/* Duration Tests - pouze v development módu */}
      </div>
    </FramerPageTransition>
  );
};

export default HudbaScreen;