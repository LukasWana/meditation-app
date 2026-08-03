import React, { useState, useContext, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ThemeContext } from '@contexts/ThemeContext';
import { useLanguage } from '@contexts/LanguageContext';
import { getThemeName } from '@data/themes';
// Omezení odstraněna - obrázky se nahrávají bez validace a zpracování
import FramerSection from '@components/FramerSection';
import { ImageIcon, X, Palette } from 'lucide-react';
import { ref, listAll, getDownloadURL } from 'firebase/storage';
import { storage } from '@config/secure-firebase';
import log from '@services/logger';
import cacheService from '@services/cacheServiceRefactored';
import ProgressBarColorPicker from '@components/ProgressBarColorPicker';

const ThemeSelector = () => {
  const { t, language } = useLanguage();

  // Bezpečné získání theme contextu - useContext vrací null pokud není Provider
  const themeContext = useContext(ThemeContext);
  const { themes, currentTheme, themeId, changeTheme, customBackground, setCustomBackground, removeCustomBackground, allowsCustomBackground } = themeContext || {};
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [firebaseBackgrounds, setFirebaseBackgrounds] = useState([]);
  const [firebaseBackgroundsLoading, setFirebaseBackgroundsLoading] = useState(false);
  const [firebaseBackgroundsError, setFirebaseBackgroundsError] = useState(null);
  const [backgroundType, setBackgroundType] = useState('image'); // 'image' nebo 'color'
  const [extractedColors, setExtractedColors] = useState([]); // Extrahované barvy z aktuální fotky

  // Předdefinované barvy pro výběr
  const predefinedColors = [
    { name: 'Bílá', value: 'rgba(255, 255, 255, 1)' },
    { name: 'Černá', value: 'rgba(0, 0, 0, 1)' },
    { name: 'Šedá', value: 'rgba(128, 128, 128, 1)' },
    { name: 'Světle šedá', value: 'rgba(200, 200, 200, 1)' },
    { name: 'Tmavě šedá', value: 'rgba(64, 64, 64, 1)' },
    { name: 'Béžová', value: 'rgba(244, 221, 196, 1)' },
    { name: 'Světle béžová', value: 'rgba(250, 235, 215, 1)' },
    { name: 'Tmavě béžová', value: 'rgba(210, 180, 140, 1)' },
    { name: 'Modrá', value: 'rgba(59, 130, 246, 1)' },
    { name: 'Světle modrá', value: 'rgba(147, 197, 253, 1)' },
    { name: 'Tmavě modrá', value: 'rgba(30, 64, 175, 1)' },
    { name: 'Fialová', value: 'rgba(168, 85, 247, 1)' },
    { name: 'Světle fialová', value: 'rgba(196, 181, 253, 1)' },
    { name: 'Tmavě fialová', value: 'rgba(126, 34, 206, 1)' },
    { name: 'Růžová', value: 'rgba(236, 72, 153, 1)' },
    { name: 'Světle růžová', value: 'rgba(251, 182, 206, 1)' },
    { name: 'Tmavě růžová', value: 'rgba(190, 24, 93, 1)' },
    { name: 'Zelená', value: 'rgba(34, 197, 94, 1)' },
    { name: 'Světle zelená', value: 'rgba(134, 239, 172, 1)' },
    { name: 'Tmavě zelená', value: 'rgba(22, 101, 52, 1)' },
    { name: 'Oranžová', value: 'rgba(249, 115, 22, 1)' },
    { name: 'Světle oranžová', value: 'rgba(254, 215, 170, 1)' },
    { name: 'Tmavě oranžová', value: 'rgba(194, 65, 12, 1)' },
    { name: 'Červená', value: 'rgba(239, 68, 68, 1)' },
    { name: 'Světle červená', value: 'rgba(254, 202, 202, 1)' },
    { name: 'Tmavě červená', value: 'rgba(185, 28, 28, 1)' },
    { name: 'Žlutá', value: 'rgba(234, 179, 8, 1)' },
    { name: 'Světle žlutá', value: 'rgba(254, 240, 138, 1)' },
    { name: 'Tmavě žlutá', value: 'rgba(161, 98, 7, 1)' },
    { name: 'Hnědá', value: 'rgba(120, 53, 15, 1)' },
    { name: 'Světle hnědá', value: 'rgba(180, 83, 9, 1)' },
    { name: 'Tmavě hnědá', value: 'rgba(69, 26, 3, 1)' }
  ];

  // Detekovat typ pozadí při změně customBackground
  useEffect(() => {
    if (!customBackground) {
      setBackgroundType('image');
      return;
    }

    try {
      const parsed = JSON.parse(customBackground);
      if (parsed?.backgroundColor) {
        setBackgroundType('color');
      } else if (parsed?.url || parsed?.downloadURL) {
        setBackgroundType('image');
      }
    } catch (e) {
      // Starý formát - URL string, je to obrázek
      setBackgroundType('image');
    }
  }, [customBackground]);

  // Funkce pro načtení náhledu pro pozadí s cachováním
  const loadThumbnailForBackground = useCallback(async (imageName) => {
    try {
      const cacheKey = `background/thumbnails/${imageName}`;

      // Zkontroluj cache PRVNÍ
      const cachedUrl = cacheService.getImageUrl(cacheKey);
      if (cachedUrl) {
        log.debug(`✅ Thumbnail cache hit for: ${imageName}`);
        return cachedUrl;
      }

      // Pokud není v cache, načti z Firebase
      log.debug(`🔄 Loading thumbnail from Firebase: ${imageName}`);
      const thumbnailRef = ref(storage, cacheKey);
      const thumbnailURL = await getDownloadURL(thumbnailRef);

      // Ulož do cache
      cacheService.setImageUrl(cacheKey, thumbnailURL);
      // A rovnou přednačti do Cache Storage, aby se později nezdržovalo renderování gridu
      cacheService.preloadImage(thumbnailURL, cacheKey).catch(() => {});
      log.debug(`✅ Thumbnail cached: ${imageName}`);

      return thumbnailURL;
    } catch (error) {
      // Náhled neexistuje - není to chyba
      log.debug(`⚠️ Thumbnail not found: ${imageName}`);
      return null;
    }
  }, []);

  // Funkce pro načtení pozadí z Firebase Storage
  const loadFirebaseBackgrounds = useCallback(async () => {
    try {
      setFirebaseBackgroundsLoading(true);
      setFirebaseBackgroundsError(null);

      log.info('🔄 Loading backgrounds from Firebase Storage...');

      // Check if storage is properly initialized
      if (!storage) {
        throw new Error('Firebase Storage is not initialized');
      }

      // Načti soubory ze složky background/
      const backgroundRef = ref(storage, 'background');
      const backgroundResult = await listAll(backgroundRef);

      // Check if the background folder exists
      if (backgroundResult.items.length === 0 && backgroundResult.prefixes.length === 0) {
        log.warn('⚠️ [Firebase Backgrounds] Background folder is empty or does not exist!', {
          path: 'background/',
          bucket: storage?._bucket?.name
        });
      }

      // Filtruj pouze obrázky (ne složky)
      const imageFiles = backgroundResult.items.filter(item => {
        const name = item.name.toLowerCase();
        return name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.webp');
      });

      log.debug('Filtered image files count:', imageFiles.length);

      // PARALELNÍ načítání místo sekvenčního loopu - výrazně rychlejší
      const backgroundPromises = imageFiles.map(async (itemRef) => {
        try {
          const imageCacheKey = `background/${itemRef.name}`;

          // Zkontroluj cache pro plný obrázek
          let downloadURL = cacheService.getImageUrl(imageCacheKey);
          if (!downloadURL) {
            // Pokud není v cache, načti z Firebase
            downloadURL = await getDownloadURL(itemRef);
            // Ulož do cache
            cacheService.setImageUrl(imageCacheKey, downloadURL);
            log.debug(`✅ Full image cached: ${itemRef.name}`);
          } else {
            log.debug(`✅ Full image cache hit: ${itemRef.name}`);
          }

          // Zkusit načíst náhled (s cachováním) - paralelně
          const thumbnailURL = await loadThumbnailForBackground(itemRef.name);
          log.debug(`✅ Loaded ${itemRef.name}, thumbnail: ${thumbnailURL ? 'yes' : 'no'}`);

          // Prefetch: thumbnail (nebo fallback plný obrázek) do Cache Storage
          const bestPreviewUrl = thumbnailURL || downloadURL;
          cacheService.preloadImage(bestPreviewUrl, `background-preview:${itemRef.name}`).catch(() => {});

          // Metadata není nutné pro zobrazení - přeskočíme ho pro rychlejší načítání
          // Pokud bude potřeba, můžeme ho načíst později nebo z cache
          return {
            name: itemRef.name,
            fullPath: itemRef.fullPath,
            downloadURL: downloadURL,
            thumbnailURL: thumbnailURL,
            size: null, // Lazy load pokud bude potřeba
            contentType: null // Lazy load pokud bude potřeba
          };
        } catch (metaError) {
          log.warn(`Failed to process ${itemRef.name}:`, metaError.message);
          return null;
        }
      });

      // Počkej na všechny paralelní requesty
      const results = await Promise.all(backgroundPromises);
      const backgrounds = results.filter(bg => bg !== null);

      setFirebaseBackgrounds(backgrounds);
      log.success(`✅ Loaded ${backgrounds.length} backgrounds from Firebase Storage`);
    } catch (error) {
      log.error('❌ [Firebase Backgrounds] Failed to load backgrounds from Firebase Storage:', error);
      setFirebaseBackgroundsError(`Chyba při načítání pozadí: ${error.message} (${error.code || 'unknown'})`);
    } finally {
      setFirebaseBackgroundsLoading(false);
    }
  }, [loadThumbnailForBackground]);

  // Načti Firebase pozadí při mount komponenty
  useEffect(() => {
    // Načti pozadí z Firebase vždy, nezávisle na theme contextu
    loadFirebaseBackgrounds().catch(err => {
      log.error('❌ Failed to load Firebase backgrounds in useEffect:', err);
    });
  }, [loadFirebaseBackgrounds]);

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
        log.debug('🎨 Extrahované barvy z fotky:', extractedColors);
      } catch (colorError) {
        log.warn('Nepodařilo se extrahovat barvy z fotky:', colorError.message);
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
      setBackgroundType('image');

      // Uložit extrahované barvy pro výběr
      setExtractedColors(extractedColors || []);

      // Pokud existuje uložená barva progress baru, zkusit ji najít v extrahovaných barvách
      const savedProgressBarColor = localStorage.getItem('meditation-app-progress-bar-color');
      if (savedProgressBarColor && extractedColors && extractedColors.length > 0) {
        const colorExists = extractedColors.some(color => {
          const normalizeColor = (c) => c.replace(/\s+/g, '').toLowerCase();
          return normalizeColor(color) === normalizeColor(savedProgressBarColor);
        });
        if (!colorExists) {
          localStorage.removeItem('meditation-app-progress-bar-color');
          themeContext?.setProgressBarColor(null);
        }
      }
    } catch (err) {
      setError(err.message || 'Chyba při zpracování obrázku');
      log.error('Error processing image:', err);
    } finally {
      setIsProcessing(false);
      // Reset input
      event.target.value = '';
    }
  };

  const handleRemoveBackground = () => {
    removeCustomBackground();
    setError(null);
    setBackgroundType('image');
  };

  const handleColorSelect = (colorValue) => {
    setError(null);
    setIsProcessing(true);

    try {
      const backgroundData = {
        backgroundColor: colorValue,
        useRoundedStyle: currentTheme?.useRoundedStyle ?? false,
        fontFamily: currentTheme?.fontFamily || "'Petrona', serif"
      };

      setCustomBackground(JSON.stringify(backgroundData));
      setBackgroundType('color');
    } catch (err) {
      setError(err.message || 'Chyba při nastavení barvy');
      log.error('Error setting color:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCustomColorSelect = (event) => {
    const colorValue = event.target.value;
    // Převést hex na rgba
    const hex = colorValue.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const rgbaColor = `rgba(${r}, ${g}, ${b}, 1)`;
    handleColorSelect(rgbaColor);
  };

  const handleProgressBarColorSelect = (color) => {
    if (themeContext?.setProgressBarColor) {
      themeContext.setProgressBarColor(color);
    }
  };

  // Načíst uloženou barvu progress baru
  useEffect(() => {
    const savedColor = localStorage.getItem('meditation-app-progress-bar-color');
    if (savedColor) {
      // Zkusíme načíst barvy z aktuálního pozadí
      try {
        const bgData = customBackground ? JSON.parse(customBackground) : null;
        if (bgData?.colors && bgData.colors.length > 0) {
          setExtractedColors(bgData.colors);
        }
      } catch (e) {
        // Ignorovat chybu při parsování
      }
    }
  }, [customBackground]);

  const handleDefaultImageSelect = async (imageUrl) => {
    setError(null);
    setIsProcessing(true);

    try {
      // Zjistit rozměry obrázku
      const imageDimensions = await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          resolve({ width: img.width, height: img.height });
        };
        img.onerror = () => {
          resolve(null);
        };
        img.src = imageUrl;
      });

      // Extrahovat barvy z obrázku
      let extractedColors = null;
      try {
        const { extractColorsFromImage } = await import('@utils/colorExtractor');
        extractedColors = await extractColorsFromImage(imageUrl, 5);
        log.debug('🎨 Extrahované barvy z defaultního obrázku:', extractedColors);
      } catch (colorError) {
        log.warn('Nepodařilo se extrahovat barvy z obrázku:', colorError.message);
      }

      // Uložit obrázek s informací o rozměrech, barvách a vlastnostech tématu
      const backgroundData = {
        url: imageUrl,
        width: imageDimensions?.width || null,
        height: imageDimensions?.height || null,
        colors: extractedColors,
        useRoundedStyle: currentTheme?.useRoundedStyle ?? false,
        fontFamily: currentTheme?.fontFamily || "'Petrona', serif"
      };

      // Nastavení jako pozadí (uložit jako JSON string)
      setCustomBackground(JSON.stringify(backgroundData));
      setBackgroundType('image');

      // Uložit extrahované barvy pro výběr
      setExtractedColors(extractedColors || []);

      // Pokud existuje uložená barva progress baru, zkusit ji najít v extrahovaných barvách
      const savedProgressBarColor = localStorage.getItem('meditation-app-progress-bar-color');
      if (savedProgressBarColor && extractedColors && extractedColors.length > 0) {
        const colorExists = extractedColors.some(color => {
          const normalizeColor = (c) => c.replace(/\s+/g, '').toLowerCase();
          return normalizeColor(color) === normalizeColor(savedProgressBarColor);
        });
        if (!colorExists) {
          localStorage.removeItem('meditation-app-progress-bar-color');
          themeContext?.setProgressBarColor(null);
        }
      }
    } catch (err) {
      setError(err.message || 'Chyba při zpracování obrázku');
      log.error('Error processing default image:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const themeColors = themeContext?.getCurrentThemeColors?.() || {};
  const isDarkMode = themeContext?.colorMode === 'dark';
  const textColor = themeColors.text || (isDarkMode ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)');
  const textSecondaryColor = themeColors.textSecondary || (isDarkMode ? 'rgba(180, 180, 180, 1)' : 'rgba(100, 100, 100, 1)');
  const borderColor = themeColors.border || (isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)');
  const checkmarkBgColor = isDarkMode ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)';
  const checkmarkIconColor = isDarkMode ? 'rgba(0, 0, 0, 1)' : 'rgba(255, 255, 255, 1)';
  
  const glassClass = 'glass-panel';

  const tabActiveStyle = isDarkMode 
    ? { backgroundColor: 'rgba(255, 255, 255, 0.15)', color: 'rgba(255, 255, 255, 0.95)', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)' }
    : { backgroundColor: 'rgba(255, 255, 255, 0.8)', color: 'rgba(0, 0, 0, 0.9)', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' };

  const tabInactiveStyle = isDarkMode
    ? { color: 'rgba(255, 255, 255, 0.55)', backgroundColor: 'transparent' }
    : { color: 'rgba(0, 0, 0, 0.55)', backgroundColor: 'transparent' };

  const tabHoverStyle = isDarkMode
    ? { backgroundColor: 'rgba(255, 255, 255, 0.08)', color: 'rgba(255, 255, 255, 0.8)' }
    : { backgroundColor: 'rgba(0, 0, 0, 0.04)', color: 'rgba(0, 0, 0, 0.75)' };

  return (
    <FramerSection
      animationType="slideInUp"
      delay={0.22}
    >
      <div
        className={`w-full p-6 sm:p-8 mb-6 ${glassClass}`}
        style={{ color: textColor }}
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
                className={`w-full p-4 mb-3 rounded-theme-inner transition-all duration-300 flex items-center justify-between ${
                  isActive 
                    ? 'glass-button shadow-lg scale-[1.02]' 
                    : 'hover:opacity-80'
                }`}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-4">
                  {/* Barevný náhled */}
                  <div
                    className="w-14 h-14 rounded-theme-inner shadow-md"
                    style={{
                      background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.background || theme.colors.primary} 100%)`,
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
                      className="w-8 h-8 rounded-theme-full flex items-center justify-center shadow-sm"
                      style={{ backgroundColor: checkmarkBgColor }}
                    >
                      <svg
                        className="w-5 h-5"
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

            {/* Přepínač mezi fotkou a barvou */}
            <div 
              className="flex gap-2 mb-4 p-1 rounded-theme-full glass-panel"
              style={{ borderColor: borderColor }}
            >
              <motion.button
                onClick={() => setBackgroundType('image')}
                className="flex-1 px-4 py-2 rounded-theme-full text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2"
                style={backgroundType === 'image' ? tabActiveStyle : tabInactiveStyle}
                whileHover={backgroundType === 'image' ? {} : tabHoverStyle}
                whileTap={{ scale: 0.98 }}
              >
                <ImageIcon className="w-4 h-4" />
                {t('fotka') || 'Fotka'}
              </motion.button>
              <motion.button
                onClick={() => setBackgroundType('color')}
                className="flex-1 px-4 py-2 rounded-theme-full text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2"
                style={backgroundType === 'color' ? tabActiveStyle : tabInactiveStyle}
                whileHover={backgroundType === 'color' ? {} : tabHoverStyle}
                whileTap={{ scale: 0.98 }}
              >
                <Palette className="w-4 h-4" />
                {t('barva') || 'Barva'}
              </motion.button>
            </div>

            {customBackground ? (
              <div className="relative">
                {backgroundType === 'image' && (
                  <div
                    className="relative w-full h-32 rounded-theme-inner overflow-hidden glass-panel"
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
                )}

                {/* Výběr barvy pro progress bar - pokud jsou extrahované barvy */}
                {backgroundType === 'image' && extractedColors && extractedColors.length > 0 && (
                  <ProgressBarColorPicker
                    extractedColors={extractedColors}
                    currentColor={themeContext?.progressBarColor}
                    onColorSelect={handleProgressBarColorSelect}
                  />
                )}

                <motion.button
                  onClick={handleRemoveBackground}
                  className="mt-3 px-4 py-2 glass-button text-sm font-medium transition-colors flex items-center gap-2"
                  style={{ color: textColor }}
                  whileHover={{ opacity: 0.8 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X className="w-4 h-4" />
                  {t('odstranitPozadi')}
                </motion.button>
              </div>
            ) : backgroundType === 'color' ? (
              <div>
                {/* Předdefinované barvy */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {predefinedColors.map((color, index) => (
                    <motion.button
                      key={index}
                      onClick={() => handleColorSelect(color.value)}
                      className="relative w-full aspect-square rounded-theme-inner overflow-hidden transition-transform glass-panel hover:opacity-90"
                      style={{
                        backgroundColor: color.value
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      disabled={isProcessing}
                      title={color.name}
                    />
                  ))}
                </div>

                {/* Vlastní barva - color picker */}
                <div className="mt-4">
                  <label
                    className="block text-sm mb-2"
                    style={{ color: textColor }}
                  >
                    {t('vlastniBarva') || 'Vlastní barva:'}
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      onChange={handleCustomColorSelect}
                      className="w-16 h-16 rounded-theme-inner cursor-pointer glass-panel"
                      disabled={isProcessing}
                    />
                    <span className="text-xs" style={{ color: textSecondaryColor }}>
                      {t('klikniProVyber') || 'Klikni pro výběr barvy'}
                    </span>
                  </div>
                </div>
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
                  className="glass-button flex items-center justify-center gap-2 px-4 py-3 cursor-pointer transition-colors"
                  style={{ color: textColor }}
                  whileHover={{ opacity: 0.8 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <ImageIcon className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    {isProcessing ? t('nahravani') || 'Zpracovávání...' : t('vybratFotku')}
                  </span>
                </motion.label>
                <p
                  className="text-xs mt-2 mb-3"
                  style={{ color: textSecondaryColor }}
                >
                  {t('vyberteObrazek') || 'Vyberte libovolný obrázek'}
                </p>

                {/* Firebase pozadí */}
                <div className="mt-4">
                  <p
                    className="text-xs mb-2"
                    style={{ color: textSecondaryColor }}
                  >
                    {t('pozadiZFirebase') || 'Pozadí z Firebase:'}
                  </p>
                  {firebaseBackgroundsLoading && (
                    <div className="flex items-center justify-center py-4">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-current mx-auto" style={{ color: textSecondaryColor }}></div>
                        <p className="mt-2 text-xs" style={{ color: textSecondaryColor }}>
                          {t('nacitani') || 'Načítání...'}
                        </p>
                      </div>
                    </div>
                  )}
                  {firebaseBackgroundsError && (
                    <div
                      className="mb-3 p-2 rounded-theme-inner text-xs glass-panel"
                      style={{ color: isDarkMode ? 'rgba(254, 202, 202, 1)' : 'rgba(185, 28, 28, 1)' }}
                    >
                      {firebaseBackgroundsError}
                      {import.meta.env.MODE === 'development' && (
                        <div className="mt-2 text-xs opacity-75">
                          Zkontrolujte konzoli pro více informací
                        </div>
                      )}
                    </div>
                  )}
                  {!firebaseBackgroundsLoading && firebaseBackgrounds.length === 0 && !firebaseBackgroundsError && (
                    <p className="text-xs py-2" style={{ color: textSecondaryColor }}>
                      Žádná pozadí v Firebase Storage
                    </p>
                  )}
                  {!firebaseBackgroundsLoading && firebaseBackgrounds.length > 0 && (
                    <div className="grid grid-cols-4 gap-2">
                      {firebaseBackgrounds.map((bg, index) => (
                        <motion.button
                          key={index}
                          onClick={() => handleDefaultImageSelect(bg.downloadURL)}
                          className="relative w-full aspect-square rounded-theme-inner overflow-hidden glass-panel transition-transform hover:opacity-90"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          disabled={isProcessing}
                        >
                          <img
                            src={bg.thumbnailURL || bg.downloadURL}
                            alt={`Firebase background ${bg.name}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div
                className="mt-3 p-3 rounded-theme-inner text-sm glass-panel"
                style={{ color: isDarkMode ? 'rgba(254, 202, 202, 1)' : 'rgba(185, 28, 28, 1)' }}
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

