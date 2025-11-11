import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FramerPageTransition, BackButton, ShaderGallery } from '@components';
import { useLanguage } from '@contexts/LanguageContext';
import { useShaderSettings } from '@contexts/ShaderSettingsContext';
import { usePlayback } from '@contexts/ShaderPlaybackContext';

const ShaderSelectionScreen = ({
  onNavigateToScreen,
  section = 'hudba' // Sekce pro kterou se vybírá shader
}) => {
  const { t } = useLanguage();
  const { getShaderForSection, setShaderForSection, getColorForSection, setColorForSection } = useShaderSettings();
  const { transitionState, startTransition } = usePlayback();
  const [selectedCategory, setSelectedCategory] = useState('built-in'); // 'built-in' nebo 'shaders'
  const [selectedColor, setSelectedColor] = useState(getColorForSection(section) || '#000000');
  const selectedShader = getShaderForSection(section);
  const sectionLabel = t(section) || section;

  // Získej cílovou obrazovku na základě sekce
  // Pokud přišel uživatel z audio-player-hudba, vrať se tam
  const getTargetScreen = () => {
    // Zkontroluj, odkud uživatel přišel
    const previousScreen = localStorage.getItem('meditation-app-previous-screen') || '';

    // Pokud přišel z audio-player-hudba, vrať se tam
    if (previousScreen === 'audio-player-hudba') {
      return 'audio-player-hudba';
    }

    // Jinak použij mapování podle sekce
    const screenMap = {
      'hudba': 'hudba',
      'meditace': 'meditace',
      'dychani': 'dychani'
    };
    return screenMap[section] || 'hudba';
  };

  // Handler pro výběr shaderu
  const handleShaderSelect = (shaderId) => {
    // NEZRUŠUJ barvu - umožni kombinovat barvu + shader
    // Barva bude použita jako overlay nad shaderem nebo jako pozadí

    // Ulož do ShaderSettingsContext
    setShaderForSection(section, shaderId);

    // Nastav shader v PlaybackContext pomocí startTransition
    // Pokud je nastavena barva, použij shader, barva se použije jako overlay
    const currentColor = getColorForSection(section);
    const from = { shaderKey: transitionState?.toShaderKey || '__BLACK__' };
    const to = { shaderKey: shaderId || '__BLACK__' };

    console.log('🎨 ShaderSelectionScreen: Volám startTransition', {
      from: from.shaderKey,
      to: to.shaderKey,
      section,
      currentColor,
      willNavigateTo: getTargetScreen()
    });

    startTransition(from, to);

    // Vrať se zpět na správnou obrazovku
    // POZNÁMKA: Navigace proběhne okamžitě, ale transitionState se aktualizuje asynchronně
    // AudioPlayerHudbaScreen má fallback na getShaderForSection, takže shader se zobrazí i pokud transitionState není ještě aktualizován
    const targetScreen = getTargetScreen();
    onNavigateToScreen(targetScreen);
  };

  // Handler pro výběr barvy
  const handleColorSelect = (color) => {
    setSelectedColor(color);
    setColorForSection(section, color);

    // NEZRUŠUJ shader - umožni kombinovat barvu + shader
    // Pokud je nastaven shader, barva se použije jako overlay nad shaderem
    // Pokud není shader, barva se použije jako pozadí

    const currentShader = getShaderForSection(section);

    // Pokud není shader, použij barvu jako pozadí
    if (!currentShader || currentShader === 'default') {
      const from = { shaderKey: transitionState?.toShaderKey || '__BLACK__' };
      const to = { shaderKey: `__COLOR__${color}` };
      startTransition(from, to);
    } else {
      // Pokud je shader, ponech shader, barva se použije jako overlay v AudioPlayerAnimations
      // Shader zůstane aktivní, barva se přidá jako backgroundColor do přehrávače
      const from = { shaderKey: transitionState?.toShaderKey || '__BLACK__' };
      const to = { shaderKey: currentShader };
      startTransition(from, to);
    }

    // Vrať se zpět na správnou obrazovku
    const targetScreen = getTargetScreen();
    onNavigateToScreen(targetScreen);
  };

  // Předdefinované barvy
  const predefinedColors = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
    '#FFC0CB', '#A52A2A', '#808080', '#FFD700', '#4B0082'
  ];

  return (
    <FramerPageTransition screenKey="shader-selection">
      <div className="min-h-screen w-full max-w-full bg-[#f4ddc4] flex flex-col items-center justify-start p-2 sm:p-8 pb-20 overflow-x-hidden relative">
        <BackButton onClick={() => {
          const targetScreen = getTargetScreen();
          onNavigateToScreen(targetScreen);
        }} />

        <div className="max-w-2xl w-full" style={{ marginTop: '4rem', paddingTop: 0 }}>
          {/* Nadpis */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-light mb-2">
              {sectionLabel} - {t('shader') || 'Shader'}
            </h1>
            <p className="text-gray-600 text-sm">
              Vyberte shader pro pozadí
            </p>
          </div>

          {/* Kategorie - Vestavěné / Shadery */}
          <div className="flex gap-2 mb-6">
            <motion.button
              onClick={() => setSelectedCategory('built-in')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedCategory === 'built-in'
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-gray-100'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Vestavěné
            </motion.button>
            <motion.button
              onClick={() => setSelectedCategory('shaders')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedCategory === 'shaders'
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-gray-100'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Shadery
            </motion.button>
          </div>

          {/* ShaderGallery s náhledy */}
          <ShaderGallery
            selectedVariant={selectedShader}
            onSelect={handleShaderSelect}
            section={section}
            category={selectedCategory}
          />

          {/* Barva místo shaderu */}
          <div className="mt-8">
            <h2 className="text-xl font-medium mb-4 text-gray-700">
              Barva místo shaderu
            </h2>
            <div className="grid grid-cols-5 sm:grid-cols-8 gap-3">
              {predefinedColors.map((color) => (
                <motion.button
                  key={color}
                  onClick={() => handleColorSelect(color)}
                  className={`
                    w-12 h-12 rounded-lg border-2 transition-all
                    ${selectedColor === color
                      ? 'border-black scale-110 shadow-lg'
                      : 'border-gray-300 hover:scale-105'
                    }
                  `}
                  style={{ backgroundColor: color }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  title={color}
                />
              ))}
            </div>
            {/* Color picker input */}
            <div className="mt-4 flex items-center gap-3">
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="w-16 h-16 rounded-lg border-2 border-gray-300 cursor-pointer"
              />
              <motion.button
                onClick={() => handleColorSelect(selectedColor)}
                className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Použít barvu
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </FramerPageTransition>
  );
};

export default ShaderSelectionScreen;

