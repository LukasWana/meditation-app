import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getShaderList } from '@utils/shaderLoader';
import { useShaderSettings } from '@contexts/ShaderSettingsContext';
import BackgroundShader from '@components/BackgroundShader';

const FALLBACK_COLOR = '#f4ddc4';

const ShaderSelector = ({
  selectedShader,
  onShaderChange,
  onNavigateToScreen = null, // Pokud je k dispozici, otevře stránku místo dropdownu
  isDarkMode = false,
  section = 'hudba' // Sekce pro získání barvy
}) => {
  const textColor = isDarkMode ? 'text-white' : 'text-black';
  const dropdownBg = isDarkMode ? 'bg-gray-800/95' : 'bg-white/95';
  const dropdownBorder = isDarkMode ? 'border-white/20' : 'border-black/10';
  const categoryText = isDarkMode ? 'text-gray-300' : 'text-gray-500';
  const activeBg = isDarkMode ? 'bg-white text-black' : 'bg-black text-white';
  const inactiveHover = isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100';
  const [isOpen, setIsOpen] = useState(false);
  const [shaders, setShaders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Získej barvu pro sekci
  const { getColorForSection, getOverlaySettings } = useShaderSettings();
  const colorValue = useMemo(
    () => getColorForSection(section) || FALLBACK_COLOR,
    [getColorForSection, section]
  );

  const overlaySettings = getOverlaySettings(section) || {};

  // Render náhledu shaderu pro kruhové tlačítko
  const renderShaderPreview = useCallback(() => {
    const isColorOnly =
      !selectedShader ||
      selectedShader === 'default' ||
      selectedShader.startsWith('__COLOR__');

    if (isColorOnly) {
      const shaderColor = selectedShader?.startsWith('__COLOR__')
        ? selectedShader.replace('__COLOR__', '')
        : colorValue;

      return (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 30% 30%, ${shaderColor}, ${shaderColor}80)`
          }}
        />
      );
    }

    return (
      <div className="absolute inset-0 pointer-events-none">
        <BackgroundShader
          variant={selectedShader}
          intensity={overlaySettings.intensity ?? 0.8}
          opacity={overlaySettings.opacity ?? 0.9}
          enabled={true}
          forceSquare={true}
          zIndex={0}
        />
      </div>
    );
  }, [selectedShader, overlaySettings.intensity, overlaySettings.opacity, colorValue]);

  // Načti dostupné shadery
  useEffect(() => {
    setIsLoading(true);
    const loadShaders = async () => {
      try {
        // Vestavěné shadery
        const builtInShaders = [
          { id: 'default', name: 'Default', category: 'built-in' },
          { id: 'meditace', name: 'Meditace', category: 'built-in' },
          { id: 'dychani', name: 'Dýchání', category: 'built-in' },
          { id: 'hudba', name: 'Hudba', category: 'built-in' },
          { id: 'settings', name: 'Settings', category: 'built-in' }
        ];

        // Načti shadery
        const shadersList = getShaderList() || [];

        // Kombinuj všechny shadery
        const allShaders = [
          ...builtInShaders,
          ...shadersList
        ];

        setShaders(allShaders);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load shaders:', error);
        setIsLoading(false);
      }
    };

    loadShaders();
  }, []);

  const handleShaderSelect = (shaderId) => {
    onShaderChange(shaderId);
    setIsOpen(false);
  };

  // Získej zobrazovací jméno shaderu
  const getShaderDisplayName = (shader) => {
    if (shader.name) {
      // Formátuj jméno - první písmeno velké, zbytek malé
      return shader.name
        .split(/(?=[A-Z])/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
    return shader.id;
  };

  // Pokud je k dispozici onNavigateToScreen, otevři stránku místo dropdownu
  const handleClick = () => {
    if (onNavigateToScreen) {
      // Ulož aktuální obrazovku do localStorage před otevřením shader-selection
      // PageManager automaticky určí sekci na základě previousScreen
      try {
        const currentScreen = localStorage.getItem('meditation-app-current-screen') || section;
        localStorage.setItem('meditation-app-previous-screen', currentScreen);
      } catch (e) {
        console.error('Failed to save previous screen to localStorage:', e);
      }
      onNavigateToScreen('shader-selection');
    } else {
      setIsOpen(!isOpen);
    }
  };

  // Pokud je loading, zobraz placeholder
  if (isLoading) {
    return (
      <motion.button
        type="button"
        aria-label="Změnit pozadí"
        className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-gray-200 bg-white shadow-sm flex items-center justify-center"
        disabled
      >
        <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </motion.button>
    );
  }

  return (
    <div className="relative">
      {/* Kruhové tlačítko pro otevření výběru */}
      <motion.button
        onClick={handleClick}
        type="button"
        aria-label="Změnit pozadí"
        className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-gray-200 bg-white shadow-sm flex items-center justify-center transition-shadow duration-200 hover:shadow-md"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="absolute inset-1 sm:inset-1.5 rounded-full overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0"
            style={{
              background: colorValue,
              clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)'
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)'
            }}
          >
            {renderShaderPreview()}
          </div>
          <div className="absolute inset-y-1.5 sm:inset-y-2 left-1/2 w-[2px] bg-white/80 backdrop-blur" />
        </div>
      </motion.button>

      {/* Dropdown menu s shadery - pouze pokud není onNavigateToScreen */}
      {!onNavigateToScreen && (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`
              absolute top-full mt-2 w-56 max-h-64 overflow-y-auto
              ${dropdownBg} backdrop-blur-md rounded-lg shadow-lg
              border ${dropdownBorder} z-50
            `}
            style={{ maxHeight: '16rem' }}
          >
            <div className="p-2">
              {/* Vestavěné shadery */}
              <div className="mb-2">
                <div className={`text-xs font-semibold ${categoryText} px-2 py-1 mb-1`}>
                  Vestavěné
                </div>
                {shaders
                  .filter(s => s.category === 'built-in')
                  .map((shader) => (
                    <motion.button
                      key={shader.id}
                      onClick={() => handleShaderSelect(shader.id)}
                      className={`
                        w-full text-left px-2 py-1.5 rounded-md text-xs transition-all duration-200
                        ${selectedShader === shader.id
                          ? `${activeBg}`
                          : `${textColor} ${inactiveHover}`
                        }
                      `}
                      whileHover={{ scale: 1.02, x: 2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {getShaderDisplayName(shader)}
                    </motion.button>
                  ))}
              </div>

              {/* Shadery */}
              {shaders.filter(s => s.category === 'shaders').length > 0 && (
                <div className="mb-2">
                  <div className={`text-xs font-semibold ${categoryText} px-2 py-1 mb-1`}>
                    Shadery
                  </div>
                  {shaders
                    .filter(s => s.category === 'shaders')
                    .slice(0, 8) // Zobraz pouze prvních 8
                    .map((shader) => (
                      <motion.button
                        key={shader.id}
                        onClick={() => handleShaderSelect(shader.id)}
                        className={`
                          w-full text-left px-2 py-1.5 rounded-md text-xs transition-all duration-200
                          ${selectedShader === shader.id
                            ? 'bg-black text-white'
                            : 'text-black hover:bg-gray-100'
                          }
                        `}
                        whileHover={{ scale: 1.02, x: 2 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {getShaderDisplayName(shader)}
                      </motion.button>
                    ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      )}

      {/* Overlay pro zavření při kliknutí mimo - pouze pokud není onNavigateToScreen */}
      {!onNavigateToScreen && isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default ShaderSelector;

