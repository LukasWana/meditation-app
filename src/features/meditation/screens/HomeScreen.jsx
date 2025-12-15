import React, { useEffect } from 'react';
import { FramerPageTransition } from '@components';
import { useLanguage } from '@contexts/LanguageContext';
import { useTheme } from '@contexts/ThemeContext';

const HomeScreen = ({
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  audioPermission
}) => {
  const { t } = useLanguage();
  const { currentTheme, getScreenBackgroundColor, getCurrentThemeColors, getBackgroundStyle, getBackgroundImageUrl, allowsCustomBackground, colorMode } = useTheme();
  const themeColors = getCurrentThemeColors();

  // Zkontrolovat, zda máme obrázek pozadí
  const backgroundUrl = getBackgroundImageUrl();
  const hasImage = !!backgroundUrl && allowsCustomBackground;
  const bgStyle = getBackgroundStyle();

  // Helper funkce pro přidání průhlednosti k barvě
  // Pro light mode použít nižší opacity (světlejší efekt), pro dark mode vyšší
  const getOpacityForMode = () => {
    return colorMode === 'light' ? 0.5 : 0.8; // Light mode: 50% průhlednost (světlejší), Dark mode: 80%
  };

  const addOpacityToColor = (color, opacity = null) => {
    // Pokud není opacity specifikována, použít hodnotu podle colorMode
    const finalOpacity = opacity !== null ? opacity : getOpacityForMode();
    if (!color) return color;
    // Pokud je barva v rgba formátu, upravit alpha hodnotu
    if (color.startsWith('rgba')) {
      return color.replace(/rgba?\(([^)]+)\)/, (match, values) => {
        const parts = values.split(',').map(v => v.trim());
        if (parts.length === 4) {
          // Už máme alpha hodnotu, nahradit ji
          return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${finalOpacity})`;
        } else if (parts.length === 3) {
          // Přidat alpha hodnotu
          return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${finalOpacity})`;
        }
        return match;
      });
    }
    // Pokud je barva v rgb formátu, převést na rgba
    if (color.startsWith('rgb(')) {
      return color.replace('rgb(', 'rgba(').replace(')', `, ${finalOpacity})`);
    }
    // Pokud je barva v hex formátu, přidat alpha hodnotu
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const alphaHex = Math.round(finalOpacity * 255).toString(16).padStart(2, '0');
      return `#${hex}${alphaHex}`;
    }
    return color;
  };

  // Získat barvu textu a detekovat dark mode
  const textColor = themeColors?.text || '#000000';
  const isDarkMode = textColor.includes('255, 255, 255') ||
                     textColor === '#ffffff' ||
                     textColor === 'white' ||
                     textColor.includes('rgba(255, 255, 255');

  // Všechny texty by měly být bílé v dark mode, černé v light mode
  const displayTextColor = isDarkMode ? '#ffffff' : '#000000';

  // Aktivuj audio permission při prvním renderu HomeScreen
  useEffect(() => {
    if (audioPermission?.handleUserInteraction) {
      // Simuluj user interaction pro aktivaci audio permission
      audioPermission.handleUserInteraction();
    }
  }, [audioPermission]);

  return (
    <FramerPageTransition screenKey="home">
      <div
        className="min-h-screen w-full max-w-full flex flex-col overflow-x-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          height: '100vh',
          backgroundColor: getScreenBackgroundColor(),
          // Pokud máme obrázek, aplikovat ho přímo na tento div
          ...(hasImage && bgStyle.backgroundImage ? {
            backgroundImage: bgStyle.backgroundImage,
            backgroundSize: bgStyle.backgroundSize,
            backgroundPosition: bgStyle.backgroundPosition,
            backgroundRepeat: bgStyle.backgroundRepeat
          } : {})
        }}
      >
        <div
          className="flex-1 flex items-center justify-center cursor-pointer relative"
          onClick={() => onNavigateToScreen('meditace')}
          onTouchStart={onTouchStart}
          style={{
            backgroundColor: hasImage
              ? addOpacityToColor(currentTheme?.colors?.primary || '#f4ddc4') // Průhlednost podle colorMode (light: 0.5, dark: 0.8)
              : (currentTheme?.colors?.primary || '#f4ddc4')
          }}
        >
          <div className="text-center px-2 sm:px-8 py-4">
            <div
              className="text-5xl font-light tracking-wide py-4 leading-loose"
              style={{ color: displayTextColor }}
            >
              {t('slova')}
            </div>
          </div>
        </div>

        <div
          className="flex-1 flex items-center justify-center cursor-pointer"
          onClick={() => onNavigateToScreen('hudba')}
          onTouchStart={onTouchStart}
          style={{
            backgroundColor: hasImage
              ? addOpacityToColor(currentTheme?.colors?.card || '#ffffff') // Průhlednost podle colorMode (light: 0.5, dark: 0.8)
              : (currentTheme?.colors?.card || '#ffffff')
          }}
        >
          <div className="text-center px-2 sm:px-8 py-4">
            <div
              className="text-5xl font-light tracking-wide py-4 leading-loose"
              style={{ color: displayTextColor }}
            >
              {t('hudba')}
            </div>
          </div>
        </div>

        <div
          className="flex-1 flex items-center justify-center cursor-pointer"
          onClick={() => onNavigateToScreen('dychani')}
          style={{
            backgroundColor: hasImage
              ? addOpacityToColor(currentTheme?.colors?.primary || '#f4ddc4') // Průhlednost podle colorMode (light: 0.5, dark: 0.8)
              : (currentTheme?.colors?.primary || '#f4ddc4')
          }}
        >
          <div className="text-center px-2 sm:px-8 py-4">
            <div
              className="text-5xl font-light tracking-wide mb-4 py-4 leading-loose"
              style={{ color: displayTextColor }}
            >
              {t('dychanie') || 'dýchání'}
            </div>
          </div>
        </div>

        <div
          className="flex-1 flex items-center justify-center cursor-pointer"
          onClick={() => onNavigateToScreen('settings')}
          style={{
            backgroundColor: hasImage
              ? addOpacityToColor(currentTheme?.colors?.card || '#ffffff') // Průhlednost podle colorMode (light: 0.5, dark: 0.8)
              : (currentTheme?.colors?.card || '#ffffff')
          }}
        >
          <div className="text-center px-2 sm:px-8 py-4">
            <div
              className="text-5xl font-light tracking-wide py-4 leading-loose"
              style={{ color: displayTextColor }}
            >
              {t('nastavenie')}
            </div>
          </div>
        </div>

      </div>
    </FramerPageTransition>
  );
};

export default HomeScreen;
