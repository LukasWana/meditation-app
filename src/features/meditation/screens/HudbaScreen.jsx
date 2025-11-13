import React, { useMemo } from 'react';
import { FramerSection, FramerPageTransition, BackButton, BackgroundShader } from '@components';
import { AlbumGrid } from '../components';
import { useHudbaScreenData } from '../hooks';
import { useLanguage } from '@contexts/LanguageContext';
import { useShaderSettings } from '@contexts/ShaderSettingsContext';
import { usePlayback } from '@contexts/ShaderPlaybackContext';
import { BackgroundSettingsControls } from '../components';
import { useAdaptiveTextColors } from '@hooks';

const BLEND_MODE_TO_CSS = {
  normal: 'normal',
  overlay: 'overlay',
  multiply: 'multiply',
  shines: 'screen',
  light: 'lighten',
  dark: 'darken'
};

const hexToRgba = (hex, alpha = 1) => {
  if (!hex) {
    return `rgba(244, 221, 196, ${alpha})`;
  }

  let normalized = hex.trim();
  if (normalized.startsWith('#')) {
    normalized = normalized.slice(1);
  }
  if (normalized.length === 3) {
    normalized = normalized.split('').map(char => `${char}${char}`).join('');
  }

  const bigint = Number.parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const HudbaScreen = ({
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onPlayerStateChange
}) => {
  const { t } = useLanguage();
  const {
    getShaderForSection,
    getColorForSection,
    getOverlaySettings
  } = useShaderSettings();
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
    if (import.meta.env.MODE === 'development') {
      console.log('🎨 HudbaScreen: Shader info', {
        currentShader,
        transitionState: transitionState?.toShaderKey,
        shaderFromSettings: getShaderForSection('hudba'),
        colorFromSettings: getColorForSection('hudba'),
        isColorMode: currentShader && currentShader.startsWith('__COLOR__')
      });
    }
  }, [currentShader, transitionState, getShaderForSection, getColorForSection]);

  // Hlavní logika pro data HudbaScreen
  const {
    hudbaItems,
    error,
    isLoadingCovers,
    getDisplayDuration
  } = useHudbaScreenData();

  const overlayConfig = getOverlaySettings('hudba') || {};
  const shaderOpacity = Math.min(Math.max(overlayConfig.opacity ?? 0.75, 0), 1);
  const shaderIntensity = Math.min(Math.max(overlayConfig.intensity ?? 0.8, 0), 1);
  const blendMode = overlayConfig.blendMode || 'normal';
  const overlayBlendMode = BLEND_MODE_TO_CSS[blendMode] || 'normal';
  const baseBackgroundColor = colorOverride || '#f4ddc4';
  const overlayAlpha = blendMode === 'normal' ? 0.55 : 0.6;
  const overlayBackground = hexToRgba(baseBackgroundColor, overlayAlpha);

  // Získej barvu pro pozadí (pokud je shader barva, použij ji, jinak použij baseBackgroundColor)
  const backgroundColorForText = useMemo(() => {
    if (currentShader?.startsWith('__COLOR__')) {
      return currentShader.replace('__COLOR__', '');
    }
    return baseBackgroundColor;
  }, [currentShader, baseBackgroundColor]);

  // Použij adaptivní barvy textů
  const textColors = useAdaptiveTextColors(backgroundColorForText, currentShader);
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
        <div
          className="fixed max-w-full"
          style={{
            zIndex: 0,
            backgroundColor: baseBackgroundColor,
            top: 0,
            left: 0,
            right: 0,
            bottom: '-20px',
            height: 'calc(100dvh + 20px)'
          }}
        />
        <BackgroundShader
          variant={currentShader}
          intensity={shaderIntensity}
          enabled={true}
          opacity={shaderOpacity}
          zIndex={2}
        />
        <div
          className="fixed pointer-events-none"
          style={{
            zIndex: 3,
            top: 0,
            left: 0,
            right: 0,
            bottom: '-20px',
            height: 'calc(100dvh + 20px)',
            background: overlayBackground,
            mixBlendMode: overlayBlendMode,
            transition: 'background 0.6s ease, mix-blend-mode 0.6s ease'
          }}
        />
        <div className="min-h-screen w-full max-w-full flex flex-col items-center justify-center p-2 sm:p-8 pb-20 overflow-x-hidden relative" style={{ position: 'relative', zIndex: 10, backgroundColor: 'transparent' }}>
          <BackButton onClick={() => onNavigateToScreen('home')} />
          <div className="text-center">
            <p className={`text-xl ${textColors.isDark ? 'text-red-400' : 'text-red-600'} mb-4`}>Chyba při načítání</p>
            <p className={textColors.secondary}>{error}</p>
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
        className="fixed max-w-full"
        style={{
          zIndex: 0,
          backgroundColor: baseBackgroundColor,
          top: 0,
          left: 0,
          right: 0,
          bottom: '-20px',
          height: 'calc(100dvh + 20px)'
        }}
      />

      <BackgroundShader
        variant={currentShader}
        intensity={shaderIntensity}
        enabled={true}
        opacity={shaderOpacity}
        zIndex={2}
      />

      <div
        className="fixed pointer-events-none"
        style={{
          zIndex: 3,
          top: 0,
          left: 0,
          right: 0,
          bottom: '-20px',
          height: 'calc(100dvh + 20px)',
          background: overlayBackground,
          mixBlendMode: overlayBlendMode,
          transition: 'background 0.6s ease, mix-blend-mode 0.6s ease'
        }}
      />

      {/* Hlavní obsah stránky */}
      <div
        className="min-h-screen w-full max-w-full flex flex-col items-center justify-start p-2 sm:p-8 pb-20 overflow-x-hidden relative"
        style={{ position: 'relative', zIndex: 10, backgroundColor: 'transparent' }}
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
              <h1 className={`text-4xl font-light ${textColors.heading}`} style={{ minHeight: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
            textColors={textColors}
          />

        <FramerSection
          className="w-full flex justify-center mb-8"
          animationType="fadeIn"
          delay={0.4}
        >
          <BackgroundSettingsControls section="hudba" />
        </FramerSection>

        </div>

        {/* Duration Tests - pouze v development módu */}
      </div>
    </FramerPageTransition>
  );
};

export default HudbaScreen;