import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getShaderList } from '@utils/shaderLoader';
import { useShaderSettings } from '@contexts/ShaderSettingsContext';
import BackgroundShader from '@components/BackgroundShader';
import { useTheme } from '@hooks/useTheme';

const ShaderSelector = ({
  selectedShader,
  onShaderChange,
  onNavigateToScreen = null, // Pokud je k dispozici, otevře stránku místo dropdownu
  isDarkMode = false,
  section = 'hudba' // Sekce pro získání barvy
}) => {
  const theme = useTheme();
  const textColor = isDarkMode ? theme.colors.white : theme.colors.black;
  const dropdownBgOpacity = isDarkMode ? theme.colors.overlay.black80 : theme.colors.overlay.white90;
  const dropdownBorder = isDarkMode ? theme.colors.overlay.white20 : theme.colors.overlay.black10;
  const categoryText = isDarkMode ? theme.colors.gray[300] : theme.colors.gray[500];
  const activeBg = isDarkMode ? theme.colors.white : theme.colors.black;
  const activeTextColor = isDarkMode ? theme.colors.black : theme.colors.white;
  const inactiveHover = isDarkMode ? theme.colors.gray[700] : theme.colors.gray[100];
  const [isOpen, setIsOpen] = useState(false);
  const [shaders, setShaders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Získej barvu pro sekci
  const { getColorForSection, getOverlaySettings } = useShaderSettings();
  const colorValue = useMemo(
    () => getColorForSection(section) || theme.colors.background,
    [getColorForSection, section, theme.colors.background]
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
        className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full border shadow-sm flex items-center justify-center"
        style={{
          backgroundColor: theme.colors.white,
          borderColor: theme.colors.gray[200]
        }}
        disabled
      >
        <div
          className="w-6 h-6 border-2 rounded-full animate-spin"
          style={{
            borderColor: theme.colors.gray[300],
            borderTopColor: theme.colors.gray[600]
          }}
        />
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
        className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full border shadow-sm flex items-center justify-center transition-shadow duration-200"
        style={{
          backgroundColor: theme.colors.white,
          borderColor: theme.colors.gray[200],
          boxShadow: theme.shadows.sm
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = theme.shadows.md;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = theme.shadows.sm;
        }}
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
          <div
            className="absolute inset-y-1.5 sm:inset-y-2 left-1/2 w-[2px] backdrop-blur"
            style={{ backgroundColor: theme.colors.overlay.white80 }}
          />
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
            className="absolute top-full mt-2 w-56 max-h-64 overflow-y-auto backdrop-blur-md rounded-lg border"
            style={{
              maxHeight: '16rem',
              backgroundColor: dropdownBgOpacity,
              borderColor: dropdownBorder,
              boxShadow: theme.shadows.lg,
              zIndex: theme.zIndex.dropdown
            }}
          >
            <div className="p-2">
              {/* Vestavěné shadery */}
              <div className="mb-2">
                <div
                  className="text-xs font-semibold px-2 py-1 mb-1"
                  style={{
                    color: categoryText,
                    fontSize: theme.typography.fontSize.xs,
                    fontWeight: theme.typography.fontWeight.semibold
                  }}
                >
                  Vestavěné
                </div>
                {shaders
                  .filter(s => s.category === 'built-in')
                  .map((shader) => {
                    const isActive = selectedShader === shader.id;
                    return (
                      <motion.button
                        key={shader.id}
                        onClick={() => handleShaderSelect(shader.id)}
                        className="w-full text-left px-2 py-1.5 rounded-md text-xs transition-all duration-200"
                        style={{
                          backgroundColor: isActive ? activeBg : 'transparent',
                          color: isActive ? activeTextColor : textColor,
                          fontSize: theme.typography.fontSize.xs
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.backgroundColor = inactiveHover;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                        whileHover={{ scale: 1.02, x: 2 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {getShaderDisplayName(shader)}
                      </motion.button>
                    );
                  })}
              </div>

              {/* Shadery */}
              {shaders.filter(s => s.category === 'shaders').length > 0 && (
                <div className="mb-2">
                  <div
                    className="text-xs font-semibold px-2 py-1 mb-1"
                    style={{
                      color: categoryText,
                      fontSize: theme.typography.fontSize.xs,
                      fontWeight: theme.typography.fontWeight.semibold
                    }}
                  >
                    Shadery
                  </div>
                  {shaders
                    .filter(s => s.category === 'shaders')
                    .slice(0, 8) // Zobraz pouze prvních 8
                    .map((shader) => {
                      const isActive = selectedShader === shader.id;
                      return (
                        <motion.button
                          key={shader.id}
                          onClick={() => handleShaderSelect(shader.id)}
                          className="w-full text-left px-2 py-1.5 rounded-md text-xs transition-all duration-200"
                          style={{
                            backgroundColor: isActive ? theme.colors.black : 'transparent',
                            color: isActive ? theme.colors.white : theme.colors.black,
                            fontSize: theme.typography.fontSize.xs
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive) {
                              e.currentTarget.style.backgroundColor = theme.colors.gray[100];
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }
                          }}
                          whileHover={{ scale: 1.02, x: 2 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {getShaderDisplayName(shader)}
                        </motion.button>
                      );
                    })}
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
          className="fixed inset-0"
          style={{ zIndex: theme.zIndex.dropdown - 1 }}
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default ShaderSelector;

