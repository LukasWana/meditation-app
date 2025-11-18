import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FramerPageTransition, BackgroundShader } from '@components';
import { useLanguage } from '@contexts/LanguageContext';
import { useShaderSettings } from '@contexts/ShaderSettingsContext';
import { useAdaptiveTextColors } from '@hooks';
// useTouchPreloader odstraněn - nepoužívaný

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

const HomeScreen = ({
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  audioPermission
}) => {
  const { t } = useLanguage();
  const { getShaderForSection, getColorForSection, getOverlaySettings } = useShaderSettings();

  // Touch preloading odstraněn - nepoužívaný

  // Aktivuj audio permission při prvním renderu HomeScreen
  useEffect(() => {
    if (audioPermission?.handleUserInteraction) {
      // Simuluj user interaction pro aktivaci audio permission
      audioPermission.handleUserInteraction();
    }
  }, [audioPermission]);

  // Funkce pro získání nastavení pozadí pro sekci
  const getSectionBackground = (section) => {
    const colorOverride = getColorForSection(section);
    const overlayConfig = getOverlaySettings(section) || {};
    const shaderOpacity = Math.min(Math.max(overlayConfig.opacity ?? 0.75, 0), 1);
    const shaderIntensity = Math.min(Math.max(overlayConfig.intensity ?? 0.8, 0), 1);
    const blendMode = overlayConfig.blendMode || 'normal';
    const overlayBlendMode = BLEND_MODE_TO_CSS[blendMode] || 'normal';
    const baseBackgroundColor = colorOverride || '#f4ddc4';
    const overlayAlpha = blendMode === 'normal' ? 0.55 : 0.6;
    const overlayBackground = hexToRgba(baseBackgroundColor, overlayAlpha);
    const selectedShader = getShaderForSection(section) || section;

    // Urči barvu pro text (pokud je shader barva, použij ji, jinak použij baseBackgroundColor)
    let backgroundColorForText = baseBackgroundColor;
    if (selectedShader?.startsWith('__COLOR__')) {
      backgroundColorForText = selectedShader.replace('__COLOR__', '');
    }

    return {
      baseBackgroundColor,
      selectedShader,
      shaderOpacity,
      shaderIntensity,
      overlayBlendMode,
      overlayBackground,
      backgroundColorForText,
      isColorOnly: !selectedShader || selectedShader === 'default' || selectedShader.startsWith('__COLOR__')
    };
  };

  const meditaceBg = useMemo(() => getSectionBackground('meditace'), [getShaderForSection, getColorForSection, getOverlaySettings]);
  const hudbaBg = useMemo(() => getSectionBackground('hudba'), [getShaderForSection, getColorForSection, getOverlaySettings]);
  const dychaniBg = useMemo(() => getSectionBackground('dychani'), [getShaderForSection, getColorForSection, getOverlaySettings]);
  const settingsBg = useMemo(() => getSectionBackground('settings'), [getShaderForSection, getColorForSection, getOverlaySettings]);

  const meditaceTextColors = useAdaptiveTextColors(meditaceBg.backgroundColorForText, meditaceBg.selectedShader);
  const hudbaTextColors = useAdaptiveTextColors(hudbaBg.backgroundColorForText, hudbaBg.selectedShader);
  const dychaniTextColors = useAdaptiveTextColors(dychaniBg.backgroundColorForText, dychaniBg.selectedShader);
  const settingsTextColors = useAdaptiveTextColors(settingsBg.backgroundColorForText, settingsBg.selectedShader);

  // Zablokuj scrollování na body a html když je HomeScreen aktivní
  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyHeight = document.body.style.height;
    const originalHtmlHeight = document.documentElement.style.height;

    document.body.style.overflow = 'hidden';
    document.body.style.height = '100dvh';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.height = '100dvh';

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.height = originalBodyHeight;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.documentElement.style.height = originalHtmlHeight;
    };
  }, []);

  return (
    <FramerPageTransition screenKey="home">
      <motion.div
        className="h-screen w-full max-w-full flex flex-col overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        style={{
          height: '100dvh',
          maxHeight: '100dvh',
          overflow: 'hidden',
          width: '100%',
          position: 'relative'
        }}
      >
        {/* Sekce Meditace */}
        <motion.div
          className="flex-1 flex items-center justify-center cursor-pointer relative"
          onClick={() => onNavigateToScreen('meditace')}
          onTouchStart={onTouchStart}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{ backgroundColor: meditaceBg.baseBackgroundColor }}
        >
          {/* BackgroundShader pro Meditace */}
          {!meditaceBg.isColorOnly && (
            <>
              <div
                className="fixed pointer-events-none"
                style={{
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: '75%',
                  clipPath: 'inset(0)',
                  zIndex: 1
                }}
              >
                <BackgroundShader
                  variant={meditaceBg.selectedShader}
                  intensity={meditaceBg.shaderIntensity}
                  enabled={true}
                  opacity={meditaceBg.shaderOpacity}
                  zIndex={0}
                />
              </div>
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  zIndex: 2,
                  background: meditaceBg.overlayBackground,
                  mixBlendMode: meditaceBg.overlayBlendMode,
                  transition: 'background 0.6s ease, mix-blend-mode 0.6s ease'
                }}
              />
            </>
          )}
          <motion.div
            className="text-center px-2 sm:px-8 py-4 relative z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div
              className={`text-5xl font-light tracking-wide py-4 leading-loose ${meditaceTextColors.primary}`}
            >
              {t('meditace') || 'meditace'}
            </div>
          </motion.div>
        </motion.div>

        {/* Sekce Hudba */}
        <motion.div
          className="flex-1 flex items-center justify-center cursor-pointer relative"
          onClick={() => onNavigateToScreen('hudba')}
          onTouchStart={onTouchStart}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{ backgroundColor: hudbaBg.baseBackgroundColor }}
        >
          {/* BackgroundShader pro Hudba */}
          {!hudbaBg.isColorOnly && (
            <>
              <div
                className="fixed pointer-events-none"
                style={{
                  top: '25%',
                  left: 0,
                  right: 0,
                  bottom: '50%',
                  clipPath: 'inset(0)',
                  zIndex: 1
                }}
              >
                <BackgroundShader
                  variant={hudbaBg.selectedShader}
                  intensity={hudbaBg.shaderIntensity}
                  enabled={true}
                  opacity={hudbaBg.shaderOpacity}
                  zIndex={0}
                />
              </div>
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  zIndex: 2,
                  background: hudbaBg.overlayBackground,
                  mixBlendMode: hudbaBg.overlayBlendMode,
                  transition: 'background 0.6s ease, mix-blend-mode 0.6s ease'
                }}
              />
            </>
          )}
          <motion.div
            className="text-center px-2 sm:px-8 py-4 relative z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div
              className={`text-5xl font-light tracking-wide py-4 leading-loose ${hudbaTextColors.primary}`}
            >
              {t('hudba')}
            </div>
          </motion.div>
        </motion.div>

        {/* Sekce Dýchání */}
        <motion.div
          className="flex-1 flex items-center justify-center cursor-pointer relative"
          onClick={() => onNavigateToScreen('dychani')}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{ backgroundColor: dychaniBg.baseBackgroundColor }}
        >
          {/* BackgroundShader pro Dýchání */}
          {!dychaniBg.isColorOnly && (
            <>
              <div
                className="fixed pointer-events-none"
                style={{
                  top: '50%',
                  left: 0,
                  right: 0,
                  bottom: '25%',
                  clipPath: 'inset(0)',
                  zIndex: 1
                }}
              >
                <BackgroundShader
                  variant={dychaniBg.selectedShader}
                  intensity={dychaniBg.shaderIntensity}
                  enabled={true}
                  opacity={dychaniBg.shaderOpacity}
                  zIndex={0}
                />
              </div>
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  zIndex: 2,
                  background: dychaniBg.overlayBackground,
                  mixBlendMode: dychaniBg.overlayBlendMode,
                  transition: 'background 0.6s ease, mix-blend-mode 0.6s ease'
                }}
              />
            </>
          )}
          <motion.div
            className="text-center px-2 sm:px-8 py-4 relative z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div
              className={`text-5xl font-light tracking-wide py-4 leading-loose ${dychaniTextColors.primary}`}
            >
              {t('dychani') || t('dychanie') || 'dýchání'}
            </div>
          </motion.div>
        </motion.div>

        {/* Sekce Nastavení */}
        <motion.div
          className="flex-1 flex items-center justify-center cursor-pointer relative"
          onClick={() => onNavigateToScreen('settings')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{ backgroundColor: settingsBg.baseBackgroundColor }}
        >
          {/* BackgroundShader pro Nastavení */}
          {!settingsBg.isColorOnly && (
            <>
              <div
                className="fixed pointer-events-none"
                style={{
                  top: '75%',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  clipPath: 'inset(0)',
                  zIndex: 1
                }}
              >
                <BackgroundShader
                  variant={settingsBg.selectedShader}
                  intensity={settingsBg.shaderIntensity}
                  enabled={true}
                  opacity={settingsBg.shaderOpacity}
                  zIndex={0}
                />
              </div>
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  zIndex: 2,
                  background: settingsBg.overlayBackground,
                  mixBlendMode: settingsBg.overlayBlendMode,
                  transition: 'background 0.6s ease, mix-blend-mode 0.6s ease'
                }}
              />
            </>
          )}
          <motion.div
            className="text-center px-2 sm:px-8 py-4 relative z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div
              className={`text-5xl font-light tracking-wide py-4 leading-loose ${settingsTextColors.primary}`}
            >
              {t('nastavenie')}
            </div>
          </motion.div>
        </motion.div>

      </motion.div>
    </FramerPageTransition>
  );
};

export default HomeScreen;
