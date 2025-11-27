import React, { useState, useContext } from 'react';
import { motion } from 'framer-motion';
import { ThemeContext } from '@contexts/ThemeContext';
import { useLanguage } from '@contexts/LanguageContext';
import { getThemeName } from '@data/themes';
// Omezení odstraněna - obrázky se nahrávají bez validace a zpracování
import FramerSection from '@components/FramerSection';
import { ImageIcon, X } from 'lucide-react';

const ThemeSelector = () => {
  const { t, language } = useLanguage();

  // Bezpečné získání theme contextu - useContext vrací null pokud není Provider
  const themeContext = useContext(ThemeContext);
  const { themes, currentTheme, themeId, changeTheme, customBackground, setCustomBackground, removeCustomBackground, allowsCustomBackground } = themeContext || {};
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  // Fallback pokud data nejsou dostupná
  if (!themeContext || !themes || !currentTheme || !themeId) {
    return null;
  }

  const handleThemeChange = (newThemeId) => {
    changeTheme(newThemeId);
    setError(null);
  };

  const handleImageSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset error
    setError(null);
    setIsProcessing(true);

    try {
      // Validace typu souboru
      if (!file.type.startsWith('image/')) {
        throw new Error('Vyberte prosím obrázek');
      }

      // Zjistit rozměry obrázku
      const imageDimensions = await new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve({ width: img.width, height: img.height });
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(null);
        };
        img.src = url;
      });

      // Přečíst obrázek jako base64 bez jakéhokoliv zpracování
      const imageUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Extrahovat barvy z obrázku - dynamic import pro zajištění správné inicializace
      let extractedColors = null;
      try {
        const { extractColorsFromImage } = await import('@utils/colorExtractor');
        extractedColors = await extractColorsFromImage(imageUrl, 5);
        console.log('🎨 Extrahované barvy z fotky:', extractedColors);
      } catch (colorError) {
        console.warn('Nepodařilo se extrahovat barvy z fotky:', colorError);
        // Pokračovat i bez extrahovaných barev
      }

      // Uložit obrázek s informací o rozměrech, barvách a vlastnostech tématu
      const backgroundData = {
        url: imageUrl,
        width: imageDimensions?.width || null,
        height: imageDimensions?.height || null,
        colors: extractedColors, // Uložit extrahované barvy
        useRoundedStyle: currentTheme?.useRoundedStyle ?? false, // Uložit vlastnost kulatého stylu z aktuálního tématu
        fontFamily: currentTheme?.fontFamily || "'Petrona', serif" // Uložit font z aktuálního tématu
      };

      // Nastavení jako pozadí (uložit jako JSON string)
      setCustomBackground(JSON.stringify(backgroundData));
    } catch (err) {
      setError(err.message || 'Chyba při zpracování obrázku');
      console.error('Error processing image:', err);
    } finally {
      setIsProcessing(false);
      // Reset input
      event.target.value = '';
    }
  };

  const handleRemoveBackground = () => {
    removeCustomBackground();
    setError(null);
  };

  const themeColors = themeContext?.getCurrentThemeColors?.() || {};
  const isDarkMode = themeContext?.colorMode === 'dark';
  const cardColor = themeColors.card || (isDarkMode ? 'rgba(15, 15, 15, 0.95)' : 'rgba(255, 255, 255, 0.95)');
  const textColor = themeColors.text || (isDarkMode ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)');
  const textSecondaryColor = themeColors.textSecondary || (isDarkMode ? 'rgba(180, 180, 180, 1)' : 'rgba(100, 100, 100, 1)');
  const borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)';
  const activeBorderColor = isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.3)';
  const activeBgColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
  const checkmarkBgColor = isDarkMode ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)';
  const checkmarkIconColor = isDarkMode ? 'rgba(0, 0, 0, 1)' : 'rgba(255, 255, 255, 1)';

  return (
    <FramerSection
      animationType="slideInUp"
      delay={0.22}
    >
      <div
        className="w-full p-6 backdrop-blur rounded-none border"
        style={{
          backgroundColor: cardColor,
          borderColor: borderColor,
          color: textColor
        }}
      >
        <h3 className="text-2xl font-light mb-4" style={{ color: textColor }}>
          {t('vzhledAplikace')}
        </h3>

        {/* Výběr tématu */}
        <div className="space-y-3 mb-6">
          {themes.map((theme) => {
            const isActive = theme.id === themeId;
            const themeName = getThemeName(theme, language);

            return (
              <motion.button
                key={theme.id}
                onClick={() => handleThemeChange(theme.id)}
                className="w-full p-4 rounded-lg border-2 transition-all duration-200"
                style={{
                  borderColor: isActive ? activeBorderColor : borderColor,
                  backgroundColor: isActive ? activeBgColor : 'transparent'
                }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Barevný náhled */}
                    <div
                      className="w-12 h-12 rounded-lg border shadow-sm"
                      style={{
                        background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.background || theme.colors.primary} 100%)`,
                        borderColor: borderColor
                      }}
                    />
                    <div className="text-left">
                      <div
                        className="text-lg font-medium"
                        style={{ color: isActive ? textColor : textSecondaryColor }}
                      >
                        {themeName}
                      </div>
                      {isActive && (
                        <div
                          className="text-sm mt-0.5"
                          style={{ color: textSecondaryColor }}
                        >
                          {t('vybrany')}
                        </div>
                      )}
                    </div>
                  </div>
                  {isActive && (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: checkmarkBgColor }}
                    >
                      <svg
                        className="w-4 h-4"
                        style={{ color: checkmarkIconColor }}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Vlastní pozadí - pouze pokud aktuální téma podporuje */}
        {allowsCustomBackground && (
          <div
            className="border-t pt-4 mt-4"
            style={{ borderColor: borderColor }}
          >
            <h4
              className="text-lg font-light mb-3"
              style={{ color: textColor }}
            >
              {t('vlastniPozadi')}
            </h4>

            {customBackground ? (
              <div className="relative">
                <div
                  className="relative w-full h-32 rounded-lg overflow-hidden border"
                  style={{ borderColor: borderColor }}
                >
                  <img
                    src={typeof customBackground === 'string' && customBackground.startsWith('{')
                      ? JSON.parse(customBackground).url
                      : customBackground}
                    alt="Custom background"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20" />
                </div>
                <motion.button
                  onClick={handleRemoveBackground}
                  className="mt-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  style={{
                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                    color: textColor
                  }}
                  whileHover={{ opacity: 0.8 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X className="w-4 h-4" />
                  {t('odstranitPozadi')}
                </motion.button>
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  id="background-image-input"
                  disabled={isProcessing}
                />
                <motion.label
                  htmlFor="background-image-input"
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg cursor-pointer transition-colors border"
                  style={{
                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                    borderColor: borderColor,
                    color: textColor
                  }}
                  whileHover={{ opacity: 0.8 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <ImageIcon className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    {isProcessing ? t('nahravani') || 'Zpracovávání...' : t('vybratFotku')}
                  </span>
                </motion.label>
                <p
                  className="text-xs mt-2"
                  style={{ color: textSecondaryColor }}
                >
                  {t('vyberteObrazek') || 'Vyberte libovolný obrázek'}
                </p>
              </div>
            )}

            {error && (
              <div
                className="mt-3 p-3 rounded-lg text-sm border"
                style={{
                  backgroundColor: isDarkMode ? 'rgba(220, 38, 38, 0.2)' : 'rgba(254, 242, 242, 1)',
                  borderColor: isDarkMode ? 'rgba(220, 38, 38, 0.5)' : 'rgba(254, 202, 202, 1)',
                  color: isDarkMode ? 'rgba(254, 202, 202, 1)' : 'rgba(185, 28, 28, 1)'
                }}
              >
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </FramerSection>
  );
};

export default ThemeSelector;

