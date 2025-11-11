import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getShaderList } from '@utils/shaderLoader';

const ShaderSelector = ({
  selectedShader,
  onShaderChange,
  onNavigateToScreen = null, // Pokud je k dispozici, otevře stránku místo dropdownu
  isDarkMode = false
}) => {
  const textColor = isDarkMode ? 'text-white' : 'text-black';
  const bgColor = isDarkMode ? 'bg-white/20' : 'bg-white/20';
  const borderColor = isDarkMode ? 'border-white/30' : 'border-black/10';
  const hoverBg = isDarkMode ? 'hover:bg-white/30' : 'hover:bg-white/30';
  const dropdownBg = isDarkMode ? 'bg-gray-800/95' : 'bg-white/95';
  const dropdownBorder = isDarkMode ? 'border-white/20' : 'border-black/10';
  const categoryText = isDarkMode ? 'text-gray-300' : 'text-gray-500';
  const activeBg = isDarkMode ? 'bg-white text-black' : 'bg-black text-white';
  const inactiveHover = isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100';
  const [isOpen, setIsOpen] = useState(false);
  const [shaders, setShaders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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

  // Získej aktuální vybraný shader
  const currentShader = shaders.find(s => s.id === selectedShader) || shaders[0];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center">
        <div className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Načítám...</div>
      </div>
    );
  }

  // Pokud je k dispozici onNavigateToScreen, otevři stránku místo dropdownu
  const handleClick = () => {
    if (onNavigateToScreen) {
      // Ulož aktuální obrazovku do localStorage před otevřením shader-selection
      // Zjisti aktuální obrazovku z URL nebo z window
      // Pokud máme nějaký způsob, jak zjistit aktuální obrazovku, použij to
      // Jinak použijeme 'hudba' jako default (protože ShaderSelector je v AudioPlayer)
      const currentScreen = localStorage.getItem('meditation-app-current-screen') || 'hudba';
      localStorage.setItem('meditation-app-previous-screen', currentScreen);
      onNavigateToScreen('shader-selection');
    } else {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className="relative flex flex-col items-center">
      {/* Tlačítko pro otevření výběru */}
      <motion.button
        onClick={handleClick}
        className={`
          px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200
          ${bgColor} backdrop-blur-sm ${textColor} ${hoverBg}
          border ${borderColor}
        `}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 20
        }}
      >
        <div className="flex items-center space-x-1.5">
          <span className="text-sm">🎨</span>
          <span className="text-xs">{currentShader ? getShaderDisplayName(currentShader) : 'Shader'}</span>
          {!onNavigateToScreen && <span className="text-xs">{isOpen ? '▲' : '▼'}</span>}
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

