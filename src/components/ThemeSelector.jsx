import React, { useState, useContext } from 'react';
import { motion } from 'framer-motion';
import { ThemeContext } from '@contexts/ThemeContext';
import { useLanguage } from '@contexts/LanguageContext';
import { getThemeName } from '@data/themes';
import { processImageForBackground, validateImageHeight } from '@utils/imageCropper';
import { extractColorsFromImage } from '@utils/colorExtractor';
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

      // Validace výšky
      const hasMinHeight = await validateImageHeight(file);
      if (!hasMinHeight) {
        throw new Error('Obrázek musí mít minimální výšku 1080px. Vyberte větší obrázek.');
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

      // Zpracování obrázku
      const processedImage = await processImageForBackground(file);

      // Extrahovat barvy z obrázku
      let extractedColors = null;
      try {
        extractedColors = await extractColorsFromImage(processedImage, 5);
        console.log('🎨 Extrahované barvy z fotky:', extractedColors);
      } catch (colorError) {
        console.warn('Nepodařilo se extrahovat barvy z fotky:', colorError);
        // Pokračovat i bez extrahovaných barev
      }

      // Uložit obrázek s informací o rozměrech a barvách
      const backgroundData = {
        url: processedImage,
        width: imageDimensions?.width || null,
        height: imageDimensions?.height || null,
        colors: extractedColors // Uložit extrahované barvy
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

  return (
    <FramerSection
      animationType="slideInUp"
      delay={0.22}
    >
      <div className="w-full p-6 bg-white/50 backdrop-blur rounded-none border border-black/10">
        <h3 className="text-2xl font-light mb-4">
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
                className={`w-full p-4 rounded-lg border-2 transition-all duration-200 ${
                  isActive
                    ? 'border-black bg-black/5'
                    : 'border-gray-200 bg-white/80 hover:border-gray-300'
                }`}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Barevný náhled */}
                    <div
                      className="w-12 h-12 rounded-lg border border-gray-200 shadow-sm"
                      style={{
                        background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.background || theme.colors.primary} 100%)`
                      }}
                    />
                    <div className="text-left">
                      <div className={`text-lg font-medium ${isActive ? 'text-black' : 'text-gray-700'}`}>
                        {themeName}
                      </div>
                      {isActive && (
                        <div className="text-sm text-gray-500 mt-0.5">
                          {t('vybrany')}
                        </div>
                      )}
                    </div>
                  </div>
                  {isActive && (
                    <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-white"
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
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h4 className="text-lg font-light mb-3">
              {t('vlastniPozadi')}
            </h4>

            {customBackground ? (
              <div className="relative">
                <div className="relative w-full h-32 rounded-lg overflow-hidden border border-gray-200">
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
                  className="mt-3 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
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
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors border border-gray-200"
                  whileTap={{ scale: 0.98 }}
                >
                  <ImageIcon className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    {isProcessing ? t('nahravani') || 'Zpracovávání...' : t('vybratFotku')}
                  </span>
                </motion.label>
                <p className="text-xs text-gray-500 mt-2">
                  Minimální výška: 1080px
                </p>
              </div>
            )}

            {error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
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

