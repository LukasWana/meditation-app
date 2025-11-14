import React, { useMemo } from 'react';
import { FramerButton, FramerSection, FramerPageTransition, BackButton, BackgroundShader } from '@components';
import { useFirebaseHudbaFilter } from '@features/audio/hooks/useFirebaseHudbaFilter';
import { useShaderSettings } from '@contexts/ShaderSettingsContext';
import { usePlayback } from '@contexts/ShaderPlaybackContext';
import { useLanguage } from '@contexts/LanguageContext';

const STORAGE_KEY = 'meditation-app-active-audio-hudba';

const HudbaScreen = ({
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onPlayerStateChange
}) => {
  const { t } = useLanguage();

  // Použij hudební filtrovací systém
  const { hudbaItems, isLoading, isLoadingCovers, error } = useFirebaseHudbaFilter();

  // Shader settings pro pozadí přehrávače
  const { shaderSettings, getColorForSection, getOverlaySettings } = useShaderSettings();
  const { transitionState } = usePlayback();

  const colorOverride = getColorForSection('hudba');
  const overlayConfig = getOverlaySettings('hudba') || {};
  const shaderOpacity = Math.min(Math.max(overlayConfig.opacity ?? 0.75, 0), 1);
  const shaderIntensity = Math.min(Math.max(overlayConfig.intensity ?? 0.8, 0), 1);
  const blendMode = overlayConfig.blendMode || 'normal';

  // Urči, jaký shader/barva se má zobrazit
  const currentShader = useMemo(() => {
    // Prioritizace: 1. transitionState (aktivní přehrávání), 2. shader z settings
    if (transitionState?.toShaderKey && transitionState.toShaderKey !== '__BLACK__') {
      return transitionState.toShaderKey;
    }

    // Použij přímo shaderSettings místo getShaderForSection, aby se shader načetl hned při prvním renderu
    const shader = shaderSettings?.hudba;
    if (shader === null) {
      return null; // Barva má prioritu
    }
    return shader || 'hudba';
  }, [transitionState, shaderSettings]);

  // Získej barvu pro pozadí
  const baseBackgroundColor = colorOverride || '#f4ddc4';

  // Overlay pro sjednocení s UI
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

  const overlayBlendMode = BLEND_MODE_TO_CSS[blendMode] || 'normal';
  const overlayAlpha = blendMode === 'normal' ? 0.55 : 0.6;
  const overlayBackground = hexToRgba(baseBackgroundColor, overlayAlpha);

  const handleItemClick = (item) => {
    // Pokud je to album, použij první track
    if (item.type === 'album' && item.tracks && item.tracks.length > 0) {
      const firstTrack = item.tracks[0];
      const payload = {
        ...firstTrack,
        title: `${item.title} - ${firstTrack.trackName}`,
        albumCover: item.coverImage || null, // Předaj obrázek alba pro pozadí přehrávače
        albumTracks: item.tracks, // Předaj všechny tracky pro možnost přepínání
        currentTrackIndex: 0
      };

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        localStorage.setItem('meditation-app-previous-screen', 'hudba');
        localStorage.setItem('meditation-app-before-player-screen', 'hudba');
      } catch (e) {
        console.error('❌ HudbaScreen: Failed to persist active audio', e);
      }

      onPlayerStateChange?.(true);
      onNavigateToScreen('audio-player-hudba');
    } else if (item.audioSrc) {
      // Samostatná skladba
      const payload = {
        ...item,
        albumTracks: [item],
        currentTrackIndex: 0
      };

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        localStorage.setItem('meditation-app-previous-screen', 'hudba');
        localStorage.setItem('meditation-app-before-player-screen', 'hudba');
      } catch (e) {
        console.error('❌ HudbaScreen: Failed to persist active audio', e);
      }

      onPlayerStateChange?.(true);
      onNavigateToScreen('audio-player-hudba');
    }
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
      {/* Pozadí stránky - pod shaderem */}
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

      {/* BackgroundShader - stejně jako v MeditaceScreen */}
      <BackgroundShader
        variant={currentShader}
        intensity={shaderIntensity}
        enabled={true}
        opacity={shaderOpacity}
        forceSquare={currentShader?.startsWith('shader-') ? true : null}
        zIndex={2}
      />

      {/* Jemný barevný overlay pro sjednocení se zbytkem UI - stejně jako v MeditaceScreen */}
      {/* Zobraz VŽDY, stejně jako v MeditaceScreen */}
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

      {/* Hlavní obsah stránky - nad shaderem - průhledné pozadí, aby shader prosvítal */}
      <div
        className="min-h-screen w-full max-w-full flex flex-col items-center justify-center p-2 sm:p-8 pb-20 overflow-x-hidden relative"
        style={{ position: 'relative', zIndex: 10, backgroundColor: 'transparent' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <BackButton
          onClick={() => onNavigateToScreen('home')}
        />

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
                    className="w-full p-6 text-left bg-white/50 backdrop-blur rounded-none border border-black/10"
                    onClick={() => handleItemClick(item)}
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
      </div>
    </FramerPageTransition>
  );
};

export default HudbaScreen;