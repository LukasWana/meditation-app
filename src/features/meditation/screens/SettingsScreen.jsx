import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FramerSection, FramerPageTransition, BackButton, BackgroundShader, ShaderGallery } from '@components';
import ShaderCategorySelector from '@components/ShaderCategorySelector';
import LanguageSwitcher from '@components/LanguageSwitcher';
import { useLanguage } from '@contexts/LanguageContext';
import { useShaderSettings } from '@contexts/ShaderSettingsContext';
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

const SettingsScreen = ({
  onNavigateToScreen,
  gender = 'none',
  onGenderChange
}) => {
  const { t } = useLanguage();
  const {
    setShaderForSection,
    getShaderForSection,
    getColorForSection,
    getOverlaySettings
  } = useShaderSettings();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSection, setSelectedSection] = useState('');

  // Nastavení pozadí pro sekci settings
  const colorOverride = getColorForSection('settings');
  const overlayConfig = getOverlaySettings('settings') || {};
  const shaderOpacity = Math.min(Math.max(overlayConfig.opacity ?? 0.75, 0), 1);
  const shaderIntensity = Math.min(Math.max(overlayConfig.intensity ?? 0.8, 0), 1);
  const blendMode = overlayConfig.blendMode || 'normal';
  const overlayBlendMode = BLEND_MODE_TO_CSS[blendMode] || 'normal';
  const baseBackgroundColor = colorOverride || '#f4ddc4';
  const overlayAlpha = blendMode === 'normal' ? 0.55 : 0.6;
  const overlayBackground = hexToRgba(baseBackgroundColor, overlayAlpha);

  const settingsShader = useMemo(() => {
    return getShaderForSection('settings') || 'settings';
  }, [getShaderForSection]);

  // Urči barvu pro text (pokud je shader barva, použij ji, jinak použij baseBackgroundColor)
  const backgroundColorForText = useMemo(() => {
    if (settingsShader?.startsWith('__COLOR__')) {
      return settingsShader.replace('__COLOR__', '');
    }
    return baseBackgroundColor;
  }, [settingsShader, baseBackgroundColor]);

  // Použij adaptivní barvy textů
  const textColors = useAdaptiveTextColors(backgroundColorForText, settingsShader);

  // Urči, zda je shader pouze barva
  const isColorOnly = useMemo(() => {
    return !settingsShader || settingsShader === 'default' || settingsShader.startsWith('__COLOR__');
  }, [settingsShader]);

  return (
    <FramerPageTransition screenKey="settings">
      {/* Pozadí stránky - barva */}
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

      {/* BackgroundShader - zobraz pouze pokud není pouze barva */}
      {!isColorOnly && (
        <BackgroundShader
          variant={settingsShader}
          intensity={shaderIntensity}
          enabled={true}
          opacity={shaderOpacity}
          zIndex={2}
        />
      )}

      {/* Overlay s blend mode */}
      {!isColorOnly && (
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
      )}

      {/* Hlavní obsah stránky */}
      <div
        className="min-h-screen w-full max-w-full flex flex-col items-center justify-start p-2 sm:p-8 pb-20 overflow-x-hidden relative"
        style={{ position: 'relative', zIndex: 10, backgroundColor: 'transparent' }}
      >
        <BackButton onClick={() => onNavigateToScreen('home')} />

        <div className="max-w-md w-full" style={{ marginTop: '4rem', paddingTop: 0, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          <FramerSection
            className="text-center mb-6"
            animationType="fadeIn"
            delay={0.1}
          >
            <div style={{ height: '3.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h1 className={`text-4xl font-light ${textColors.heading}`} style={{ minHeight: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {t('nastavenie')}
              </h1>
            </div>
          </FramerSection>

          <div className="space-y-4">
            {/* Language Settings */}
            <FramerSection
              animationType="slideInUp"
              delay={0.2}
            >
              <div className={`w-full p-6 ${textColors.bgCard} backdrop-blur rounded-none border ${textColors.border}`}>
                <h3 className={`text-2xl font-light mb-4 ${textColors.heading}`}>
                  {t('selectLanguage')}
                </h3>
                <LanguageSwitcher />
              </div>
            </FramerSection>

            {/* Gender Settings */}
            <FramerSection
              animationType="slideInUp"
              delay={0.21}
            >
              <div className={`w-full p-6 ${textColors.bgCard} backdrop-blur rounded-none border ${textColors.border}`}>
                <h3 className={`text-2xl font-light mb-4 ${textColors.heading}`}>
                  {t('pohlavie')}
                </h3>
                <motion.div
                  className={`inline-flex items-center gap-2 ${textColors.bgCard} backdrop-blur-sm border ${textColors.border} rounded-full p-1 shadow-sm`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <motion.button
                    onClick={() => onGenderChange && onGenderChange('male')}
                    className={`px-3 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                      gender === 'male'
                        ? textColors.isDark ? 'bg-white text-black' : 'bg-gray-800 text-white'
                        : textColors.muted
                    }`}
                    whileHover={{ scale: 1 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    {t('jsemMuz')}
                  </motion.button>
                  <motion.button
                    onClick={() => onGenderChange && onGenderChange('female')}
                    className={`px-3 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                      gender === 'female'
                        ? textColors.isDark ? 'bg-white text-black' : 'bg-gray-800 text-white'
                        : textColors.muted
                    }`}
                    whileHover={{ scale: 1 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    {t('jsemZena')}
                  </motion.button>
                  <motion.button
                    onClick={() => onGenderChange && onGenderChange('none')}
                    className={`px-3 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                      gender === 'none'
                        ? textColors.isDark ? 'bg-white text-black' : 'bg-gray-800 text-white'
                        : textColors.muted
                    }`}
                    whileHover={{ scale: 1 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    {t('obecnyObsah')}
                  </motion.button>
                </motion.div>
              </div>
            </FramerSection>

            {/* Shader Gallery */}
            <FramerSection
              animationType="slideInUp"
              delay={0.22}
            >
              <div className={`w-full p-6 ${textColors.bgCard} backdrop-blur rounded-none border ${textColors.border}`}>
                <h3 className={`text-2xl font-light mb-4 ${textColors.heading}`}>
                  {t('shadery') || 'Shadery'}
                </h3>

                {!selectedCategory ? (
                  // Výběr kategorie
                  <div className="space-y-6">
                    <div>
                      <h4 className={`text-lg font-light mb-4 ${textColors.heading}`}>
                        {t('vyberteKategorii') || 'Vyberte kategorii shaderů'}
                      </h4>
                      <ShaderCategorySelector
                        selectedCategory={selectedCategory}
                        onSelect={setSelectedCategory}
                      />
                    </div>

                    {/* Rychlý výběr sekce */}
                    <div>
                      <h4 className={`text-lg font-light mb-3 ${textColors.heading}`}>
                        {t('proSekci') || 'Pro sekci'}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                          { key: 'meditace', label: t('meditace') || 'Meditace' },
                          { key: 'dychani', label: t('dychani') || 'Dýchání' },
                          { key: 'hudba', label: t('hudba') || 'Hudba' }
                        ].map(section => {
                          const isMeditaceSection = section.key === 'meditace';
                          const activeShader = getShaderForSection(section.key) || 'default';
                          return (
                            <button
                              key={section.key}
                              type="button"
                              onClick={() => {
                                setSelectedSection(section.key);
                                setSelectedCategory(selectedCategory || 'shaders');
                              }}
                              className={`w-full h-full text-left px-4 py-3 rounded-xl border ${textColors.border} ${textColors.bgCard} backdrop-blur hover:${textColors.bgCardHover} transition-shadow shadow-sm hover:shadow-md focus:outline-none focus:ring-2 ${textColors.isDark ? 'focus:ring-white/20' : 'focus:ring-black/20'} ${
                                isMeditaceSection ? 'sm:col-span-1' : ''
                              }`}
                            >
                              <span className={`block text-sm font-medium uppercase tracking-wide ${textColors.muted} mb-2`}>
                                {section.label}
                              </span>
                              <span className={`block text-xs ${textColors.secondary}`}>
                                {(t('aktualniShader') || 'Aktuální shader') + ':'}
                                <span className={`block text-base font-light ${textColors.primary} mt-1 break-all`}>
                                  {activeShader}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Galerie shaderů
                  <div className="space-y-6">
                    <ShaderGallery
                      selectedVariant={selectedSection ? getShaderForSection(selectedSection) : null}
                      onSelect={(shaderId) => {
                        if (selectedSection) {
                          setShaderForSection(selectedSection, shaderId);
                          alert(`Shader přiřazen k sekci ${selectedSection}`);
                        } else {
                          alert('Nejdříve vyberte sekci pro přiřazení shaderu');
                        }
                      }}
                      section={selectedSection}
                      category={selectedCategory}
                    />
                  </div>
                )}
              </div>
            </FramerSection>

            {/* Informace */}
            <FramerSection
              animationType="slideInUp"
              delay={0.25}
            >
              <div className={`w-full p-6 ${textColors.bgCard} backdrop-blur rounded-none border ${textColors.border}`}>
                <h3 className={`text-2xl font-light mb-4 ${textColors.heading}`}>
                  {t('informacie')}
                </h3>
                <p className={`text-lg ${textColors.secondary} leading-relaxed whitespace-pre-line`}>
                  {t('informacieText')}
                </p>
              </div>
            </FramerSection>
          </div>
        </div>
      </div>

    </FramerPageTransition>
  );
};

export default SettingsScreen;
