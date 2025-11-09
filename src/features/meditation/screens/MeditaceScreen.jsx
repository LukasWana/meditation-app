import React, { useMemo, useEffect } from 'react';
import { FramerButton, FramerSection, FramerPageTransition, BackButton, BackgroundShader } from '@components';
import { useLanguage } from '@contexts/LanguageContext';
import { useRealtimeMeditaceFilter } from '@hooks/useRealtimeMeditaceFilter';
import { useShaderSettings } from '@contexts/ShaderSettingsContext';
import { usePlayback } from '@contexts/ShaderPlaybackContext';
import { BackgroundSettingsControls } from '../components';

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

const STORAGE_KEY = 'meditation-app-active-audio-meditace';

const MeditaceScreen = ({
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  gender = 'none',
  onPlayerStateChange
}) => {
  const { t, language } = useLanguage();
  const {
    getShaderForSection,
    getColorForSection,
    getOverlaySettings
  } = useShaderSettings();
  const { transitionState } = usePlayback();

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

  const colorOverride = getColorForSection('meditace');
  const overlayConfig = getOverlaySettings('meditace') || {};
  const shaderOpacity = Math.min(Math.max(overlayConfig.opacity ?? 0.75, 0), 1);
  const shaderIntensity = Math.min(Math.max(overlayConfig.intensity ?? 0.8, 0), 1);
  const blendMode = overlayConfig.blendMode || 'normal';
  const overlayBlendMode = BLEND_MODE_TO_CSS[blendMode] || 'normal';
  const baseBackgroundColor = colorOverride || '#f4ddc4';
  const overlayAlpha = blendMode === 'normal' ? 0.55 : 0.6;
  const overlayBackground = hexToRgba(baseBackgroundColor, overlayAlpha);

  const meditaceShader = useMemo(() => {
    return getShaderForSection('meditace') || 'meditace';
  }, [getShaderForSection, transitionState?.toShaderKey]);

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
      localStorage.setItem('meditation-app-before-player-screen', 'meditace');
    } catch (e) {
      console.error('❌ MeditaceScreen: Failed to persist active audio', e);
    }

    onPlayerStateChange?.(true);
    onNavigateToScreen('audio-player-meditace');
  };

  if (isLoading) {
    return (
      <FramerPageTransition screenKey="meditace">
        <div
          className="fixed inset-0 min-h-screen max-w-full"
          style={{
            zIndex: 0,
            backgroundColor: baseBackgroundColor
          }}
        />
        <BackgroundShader
          variant={meditaceShader}
          intensity={shaderIntensity}
          enabled={true}
          opacity={shaderOpacity}
          zIndex={2}
        />
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            zIndex: 3,
            background: overlayBackground,
            mixBlendMode: overlayBlendMode,
            transition: 'background 0.6s ease, mix-blend-mode 0.6s ease'
          }}
        />
        <div className="min-h-screen w-full max-w-full flex flex-col items-center justify-center p-2 sm:p-8 pb-20 overflow-x-hidden relative" style={{ position: 'relative', zIndex: 10, backgroundColor: 'transparent' }}>
          <BackButton onClick={() => onNavigateToScreen('home')} />
          <div className="text-center mt-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-700 mx-auto mb-4"></div>
            <p className="text-xl text-gray-700">{t('nacitamMeditace') || 'Načítám meditace...'}</p>
          </div>
        </div>
      </FramerPageTransition>
    );
  }

  if (error) {
    return (
      <FramerPageTransition screenKey="meditace">
        <div
          className="fixed inset-0 min-h-screen max-w-full"
          style={{
            zIndex: 0,
            backgroundColor: baseBackgroundColor
          }}
        />
        <BackgroundShader
          variant={meditaceShader}
          intensity={shaderIntensity}
          enabled={true}
          opacity={shaderOpacity}
          zIndex={2}
        />
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            zIndex: 3,
            background: overlayBackground,
            mixBlendMode: overlayBlendMode,
            transition: 'background 0.6s ease, mix-blend-mode 0.6s ease'
          }}
        />
        <div className="min-h-screen w-full max-w-full flex flex-col items-center justify-center p-2 sm:p-8 pb-20 overflow-x-hidden relative" style={{ position: 'relative', zIndex: 10, backgroundColor: 'transparent' }}>
          <BackButton onClick={() => onNavigateToScreen('home')} />
          <div className="text-center mt-10">
            <p className="text-xl text-red-600 mb-4">{t('chybaPriNacitani') || 'Chyba při načítání'}</p>
            <p className="text-gray-700">{error}</p>
          </div>
        </div>
      </FramerPageTransition>
    );
  }

  return (
    <FramerPageTransition screenKey="meditace">
      <div
        className="fixed inset-0 min-h-screen max-w-full"
        style={{
          zIndex: 0,
          backgroundColor: baseBackgroundColor
        }}
      />

      <BackgroundShader
        variant={meditaceShader}
        intensity={shaderIntensity}
        enabled={true}
        opacity={shaderOpacity}
        zIndex={2}
      />

      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 3,
          background: overlayBackground,
          mixBlendMode: overlayBlendMode,
          transition: 'background 0.6s ease, mix-blend-mode 0.6s ease'
        }}
      />

      <div
        className="min-h-screen w-full max-w-full flex flex-col items-center justify-start p-2 sm:p-8 pb-20 overflow-x-hidden relative"
        style={{ position: 'relative', zIndex: 10, backgroundColor: 'transparent' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <BackButton onClick={() => onNavigateToScreen('home')} />

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
              <div className="text-center py-8 bg-white/50 rounded-3xl border border-black/10 backdrop-blur">
                <p className="text-gray-600 text-lg">{t('zadneMeditace') || 'Žiadne meditácie nie sú dostupné'}</p>
                <p className="text-gray-500 text-sm mt-2">{t('zkusteZmenitNastaveni') || 'Skúste zmeniť nastavenia v menu'}</p>
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
                    className="w-full p-6 text-left bg-white/60 backdrop-blur rounded-3xl border border-black/10 transition-all duration-200 hover:-translate-y-1"
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-2xl font-light text-gray-900">
                          {item.title}
                        </h3>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-xl font-light text-gray-500">
                          {item.duration}
                        </span>
                      </div>
                    </div>
                  </FramerButton>
                </FramerSection>
              ))
            )}
          </div>

          <FramerSection
            className="w-full flex justify-center mt-10 mb-6"
            animationType="fadeIn"
            delay={0.35}
          >
            <BackgroundSettingsControls section="meditace" />
          </FramerSection>
        </div>
      </div>
    </FramerPageTransition>
  );
};

export default MeditaceScreen;
