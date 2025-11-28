import React, { useState, useContext, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ThemeContext } from '@contexts/ThemeContext';
import { useLanguage } from '@contexts/LanguageContext';
import { getThemeName } from '@data/themes';
import { ref, listAll, getDownloadURL } from 'firebase/storage';
import { storage } from '@config/secure-firebase';
import FramerSection from '@components/FramerSection';
import { X, Upload } from 'lucide-react';

// Načti náhledy ze Storage
const loadThumbnailsFromStorage = async () => {
  try {
    const thumbnailsRef = ref(storage, 'background/thumbnails');
    const result = await listAll(thumbnailsRef);

    const thumbnails = await Promise.all(
      result.items.map(async (itemRef) => {
        try {
          const thumbnailUrl = await getDownloadURL(itemRef);
          const fileName = itemRef.name;
          const fullImagePath = `background/${fileName}`;

          return {
            thumbnailUrl,
            fullImagePath,
            fileName
          };
        } catch (error) {
          console.warn(`Failed to load thumbnail ${itemRef.name}:`, error);
          return null;
        }
      })
    );

    return thumbnails.filter(Boolean);
  } catch (error) {
    console.error('Failed to load thumbnails from Storage:', error);
    return [];
  }
};

const ThemeSelector = () => {
  const { t, language } = useLanguage();

  // Bezpečné získání theme contextu - useContext vrací null pokud není Provider
  const themeContext = useContext(ThemeContext);
  const { themes, currentTheme, themeId, changeTheme, customBackground, setCustomBackground, removeCustomBackground, allowsCustomBackground } = themeContext || {};
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [thumbnails, setThumbnails] = useState([]);
  const [thumbnailsLoading, setThumbnailsLoading] = useState(false);
  const [showBackgroundSection, setShowBackgroundSection] = useState(false);
  const [loadingThumbnail, setLoadingThumbnail] = useState(null); // Trackování, který thumbnail se načítá
  const [isUploadingCustomImage, setIsUploadingCustomImage] = useState(false); // Trackování nahrávání vlastního obrázku
  const [customImagePreview, setCustomImagePreview] = useState(null); // Náhled vlastního obrázku

  // Načíst náhledy když se zobrazí sekce s pozadím
  useEffect(() => {
    if (allowsCustomBackground && !showBackgroundSection) {
      setShowBackgroundSection(true);
      setThumbnailsLoading(true);

      loadThumbnailsFromStorage()
        .then((loadedThumbnails) => {
          setThumbnails(loadedThumbnails);
          setThumbnailsLoading(false);
        })
        .catch((err) => {
          console.error('Error loading thumbnails:', err);
          setThumbnailsLoading(false);
        });
    }
  }, [allowsCustomBackground, showBackgroundSection]);

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
    setIsUploadingCustomImage(true); // Nastavit, že se nahrává vlastní obrázek

    try {
      // Validace typu souboru
      if (!file.type.startsWith('image/')) {
        throw new Error('Vyberte prosím obrázek');
      }

      // Vytvořit náhled obrázku pro zobrazení v tlačítku
      const previewUrl = URL.createObjectURL(file);
      setCustomImagePreview(previewUrl);

      // Vymazat předchozí uložený vlastní obrázek pokud existuje
      if (savedCustomImage && savedCustomImage.url?.startsWith('blob:')) {
        URL.revokeObjectURL(savedCustomImage.url);
      }
      setSavedCustomImage(null);

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

        // Ověřit, zda jsou barvy skutečně extrahované (ne null a ne prázdný objekt)
        if (!extractedColors || typeof extractedColors !== 'object' || Object.keys(extractedColors).length === 0) {
          console.warn('⚠️ Extrahované barvy jsou prázdné nebo neplatné:', extractedColors);
          extractedColors = null;
        }
      } catch (colorError) {
        console.warn('Nepodařilo se extrahovat barvy z fotky:', colorError);
        // Pokud je to chyba CORS, informovat uživatele (ale jemně)
        if (colorError.message?.includes('CORS') || colorError.message?.includes('Access-Control-Allow-Origin')) {
           console.error('CORS chyba při načítání obrázku - nelze extrahovat barvy. Je nutné nastavit CORS na Firebase Storage.');
        }
        // Pokračovat i bez extrahovaných barev
        extractedColors = null;
      }

      // Uložit obrázek s informací o rozměrech, barvách a vlastnostech tématu
      const backgroundData = {
        url: imageUrl,
        width: imageDimensions?.width || null,
        height: imageDimensions?.height || null,
        colors: extractedColors, // Uložit extrahované barvy (může být null)
        useRoundedStyle: currentTheme?.useRoundedStyle ?? false, // Uložit vlastnost kulatého stylu z aktuálního tématu
        fontFamily: currentTheme?.fontFamily || "'Petrona', serif" // Uložit font z aktuálního tématu
      };

      console.log('💾 Ukládám backgroundData:', {
        hasColors: !!backgroundData.colors,
        colorKeys: backgroundData.colors ? Object.keys(backgroundData.colors) : []
      });

      // Nastavení jako pozadí (uložit jako JSON string)
      setCustomBackground(JSON.stringify(backgroundData));
    } catch (err) {
      setError(err.message || 'Chyba při zpracování obrázku');
      console.error('Error processing image:', err);
    } finally {
      setIsProcessing(false);
      setIsUploadingCustomImage(false); // Resetovat tracking nahrávání
      // Reset input
      event.target.value = '';
    }
  };

  // Handler pro výběr náhledu - načte velký obrázek ze Storage
  const handleThumbnailSelect = async (thumbnail) => {
    setError(null);
    setIsProcessing(true);
    setLoadingThumbnail(thumbnail.fileName); // Nastavit, který thumbnail se načítá

    try {
      // Načíst velký obrázek ze Storage
      const fullImageRef = ref(storage, thumbnail.fullImagePath);
      const fullImageUrl = await getDownloadURL(fullImageRef);

      // Zjistit rozměry obrázku
      const imageDimensions = await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          resolve({ width: img.width, height: img.height });
        };
        img.onerror = () => {
          resolve(null);
        };
        img.src = fullImageUrl;
      });

      // Extrahovat barvy z obrázku
      let extractedColors = null;
      try {
        const { extractColorsFromImage } = await import('@utils/colorExtractor');
        extractedColors = await extractColorsFromImage(fullImageUrl, 5);
        console.log('🎨 Extrahované barvy z obrázku:', extractedColors);

        // Ověřit, zda jsou barvy skutečně extrahované (ne null a ne prázdný objekt)
        if (!extractedColors || typeof extractedColors !== 'object' || Object.keys(extractedColors).length === 0) {
          console.warn('⚠️ Extrahované barvy jsou prázdné nebo neplatné:', extractedColors);
          extractedColors = null;
        }
      } catch (colorError) {
        console.warn('Nepodařilo se extrahovat barvy z obrázku:', colorError);
        extractedColors = null;
      }

      // Uložit obrázek s informací o rozměrech, barvách a vlastnostech tématu
      const backgroundData = {
        url: fullImageUrl,
        width: imageDimensions?.width || null,
        height: imageDimensions?.height || null,
        colors: extractedColors, // Uložit extrahované barvy (může být null)
        useRoundedStyle: currentTheme?.useRoundedStyle ?? false,
        fontFamily: currentTheme?.fontFamily || "'Petrona', serif"
      };

      console.log('💾 Ukládám backgroundData z thumbnail:', {
        hasColors: !!backgroundData.colors,
        colorKeys: backgroundData.colors ? Object.keys(backgroundData.colors) : []
      });

      // Nastavení jako pozadí (uložit jako JSON string)
      setCustomBackground(JSON.stringify(backgroundData));
    } catch (err) {
      setError(err.message || 'Chyba při načítání obrázku');
      console.error('Error loading full image:', err);
    } finally {
      setIsProcessing(false);
      setLoadingThumbnail(null); // Resetovat tracking načítání
    }
  };

  // Handler pro volbu "bez obrázku"
  const handleNoImageSelect = () => {
    setError(null);
    removeCustomBackground();
    // Vymazat uložený vlastní obrázek
    setSavedCustomImage(null);
    if (customImagePreview && customImagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(customImagePreview);
    }
    setCustomImagePreview(null);
  };

  // Zjistit, který náhled je aktuálně vybraný
  const selectedThumbnail = useMemo(() => {
    if (!customBackground || thumbnails.length === 0) return null;

    try {
      const backgroundData = typeof customBackground === 'string' && customBackground.startsWith('{')
        ? JSON.parse(customBackground)
        : { url: customBackground };

      const selectedUrl = backgroundData.url;
      if (!selectedUrl) return null;

      // Pokud je to base64 URL (vlastní obrázek), není to thumbnail ze Storage
      if (selectedUrl.startsWith('data:image/')) {
        return null;
      }

      // Najít náhled podle fileName v URL
      // URL může být např. "https://firebasestorage.../background/pexels-arts-1496373.jpg"
      return thumbnails.find(thumb => {
        // Porovnat podle fileName - může být v URL nebo v fullImagePath
        return selectedUrl.includes(thumb.fileName) ||
               selectedUrl.includes(thumb.fullImagePath.replace('background/', ''));
      });
    } catch (error) {
      console.warn('Error parsing selected thumbnail:', error);
      return null;
    }
  }, [customBackground, thumbnails]);

  // Zjistit, zda je vybrán vlastní obrázek (ne ze Storage)
  const isCustomImageSelected = useMemo(() => {
    if (!customBackground) return false;
    try {
      const backgroundData = typeof customBackground === 'string' && customBackground.startsWith('{')
        ? JSON.parse(customBackground)
        : { url: customBackground };
      return backgroundData.url?.startsWith('data:image/') || false;
    } catch (error) {
      return false;
    }
  }, [customBackground]);

  // Uložit vlastní obrázek pro pozdější použití
  const [savedCustomImage, setSavedCustomImage] = useState(null);

  // Aktualizovat náhled vlastního obrázku když se změní customBackground
  useEffect(() => {
    if (isCustomImageSelected && customBackground) {
      try {
        const backgroundData = typeof customBackground === 'string' && customBackground.startsWith('{')
          ? JSON.parse(customBackground)
          : { url: customBackground };
        if (backgroundData.url?.startsWith('data:image/')) {
          setCustomImagePreview(backgroundData.url);
          // Uložit vlastní obrázek pro pozdější použití
          setSavedCustomImage(backgroundData);
        }
      } catch (error) {
        // Ignorovat chyby
      }
    } else if (!isCustomImageSelected && savedCustomImage) {
      // Pokud není vybrán vlastní obrázek, ale máme uložený, zachovat náhled
      if (savedCustomImage.url?.startsWith('data:image/')) {
        setCustomImagePreview(savedCustomImage.url);
      }
    } else if (!isCustomImageSelected && !savedCustomImage) {
      // Pokud není vybrán vlastní obrázek a nemáme uložený, vymazat náhled
      if (customImagePreview && customImagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(customImagePreview);
      }
      setCustomImagePreview(null);
    }
  }, [customBackground, isCustomImageSelected, savedCustomImage]);

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

            {/* Náhledy obrázků ze Storage */}
            <div className="mt-4">
              <p
                className="text-xs mb-2"
                style={{ color: textSecondaryColor }}
              >
                {t('vychoziObrazky') || 'Výchozí obrázky:'}
              </p>
              {thumbnailsLoading ? (
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div
                      key={`placeholder-${index}`}
                      className="w-full aspect-square rounded-lg border-2 bg-gray-200 dark:bg-gray-700 animate-pulse"
                      style={{ borderColor: borderColor }}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {/* Skrytý input pro upload */}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                    id="background-image-input"
                    disabled={isProcessing}
                  />

                  {/* První čtvereček - bez obrázku */}
                  <motion.button
                    onClick={handleNoImageSelect}
                    className="relative w-full aspect-square rounded-lg overflow-hidden border-2 flex items-center justify-center"
                    style={{
                      borderColor: !customBackground ? activeBorderColor : borderColor,
                      borderWidth: !customBackground ? '3px' : '2px',
                      backgroundColor: !customBackground ? activeBgColor : 'transparent'
                    }}
                    whileTap={{ scale: 0.95 }}
                    disabled={isProcessing}
                  >
                    {!customBackground && (
                      <div
                        className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: checkmarkBgColor }}
                      >
                        <svg
                          className="w-3 h-3"
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
                    <X className="w-6 h-6" style={{ color: textSecondaryColor }} />
                  </motion.button>

                  {/* Druhý čtvereček - Upload vlastního obrázku */}
                  <motion.label
                    htmlFor="background-image-input"
                    className="relative w-full aspect-square rounded-lg overflow-hidden border-2 flex items-center justify-center cursor-pointer"
                    style={{
                      borderColor: (isCustomImageSelected || savedCustomImage) ? activeBorderColor : borderColor,
                      borderWidth: (isCustomImageSelected || savedCustomImage) ? '3px' : '2px',
                      backgroundColor: (isCustomImageSelected || savedCustomImage) ? activeBgColor : 'transparent'
                    }}
                    whileTap={{ scale: 0.95 }}
                    disabled={isProcessing}
                    onClick={(e) => {
                      // Pokud máme uložený vlastní obrázek a klikneme na tlačítko, obnovit ho
                      if (savedCustomImage && !isCustomImageSelected) {
                        e.preventDefault();
                        setCustomBackground(JSON.stringify(savedCustomImage));
                      }
                    }}
                  >
                    {(customImagePreview || savedCustomImage) ? (
                      <>
                        <img
                          src={customImagePreview || savedCustomImage?.url}
                          alt="Custom image preview"
                          className="w-full h-full object-cover"
                        />
                        {isCustomImageSelected && (
                          <div
                            className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-lg"
                            style={{ backgroundColor: checkmarkBgColor }}
                          >
                            <svg
                              className="w-3 h-3"
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
                      </>
                    ) : (
                      <Upload className="w-6 h-6" style={{ color: textSecondaryColor }} />
                    )}
                    {isUploadingCustomImage && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </motion.label>

                  {/* Náhledy obrázků */}
                  {thumbnails.map((thumbnail, index) => {
                    const isSelected = selectedThumbnail?.fileName === thumbnail.fileName;
                    const isLoading = loadingThumbnail === thumbnail.fileName;

                    return (
                      <motion.button
                        key={`thumbnail-${thumbnail.fileName}`}
                        onClick={() => handleThumbnailSelect(thumbnail)}
                        className="relative w-full aspect-square rounded-lg overflow-hidden border-2"
                        style={{
                          borderColor: isSelected ? activeBorderColor : borderColor,
                          borderWidth: isSelected ? '3px' : '2px',
                          backgroundColor: isSelected ? activeBgColor : 'transparent'
                        }}
                        whileTap={{ scale: 0.95 }}
                        disabled={isProcessing}
                      >
                        <img
                          src={thumbnail.thumbnailUrl}
                          alt={`Background ${index + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {isLoading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                        {isSelected && !isLoading && (
                          <div
                            className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-lg"
                            style={{ backgroundColor: checkmarkBgColor }}
                          >
                            <svg
                              className="w-3 h-3"
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
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>

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

