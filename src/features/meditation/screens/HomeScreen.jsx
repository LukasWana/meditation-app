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
  const { currentTheme, getCurrentThemeColors, getScreenBackgroundColor, colorMode } = useTheme();
  const themeColors = getCurrentThemeColors();

  // Použít barvy přímo z themeColors, které se aktualizují při změně colorMode
  const primaryColor = themeColors?.primary || currentTheme?.colors?.primary || '#f4ddc4';

  // Získat barvu textu a detekovat dark mode
  const textColor = themeColors?.text || '#000000';
  const isDarkMode = textColor.includes('255, 255, 255') ||
                     textColor === '#ffffff' ||
                     textColor === 'white' ||
                     textColor.includes('rgba(255, 255, 255');

  // Všechny texty by měly být bílé v dark mode, černé v light mode
  const displayTextColor = isDarkMode ? '#ffffff' : '#000000';

  // Funkce pro převod barvy na rgba s průhledností (pro sekce, aby background image prosvítal)
  const getColorWithOpacity = (color, opacity = 0.5) => {
    const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (rgbaMatch) {
      return `rgba(${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]}, ${opacity})`;
    }
    // Fallback pro hex nebo jiné formáty
    return color;
  };

  // Funkce pro získání stylu sekce s průhledným pozadím
  const getSectionStyle = (baseColor) => {
    return {
      backgroundColor: getColorWithOpacity(baseColor, 0.5),
      position: 'relative'
    };
  };

  // Funkce pro získání stylu sekce hudba/nastavení s průhlednou bílou/černou podle colorMode
  const getCardSectionStyle = () => {
    // V light mode: průhledná bílá, v dark mode: průhledná černá
    let overlayColor;
    if (colorMode === 'light') {
      overlayColor = 'rgba(255, 255, 255, 0.5)';  // Průhledná bílá pro light mode
    } else if (colorMode === 'dark') {
      overlayColor = 'rgba(0, 0, 0, 0.5)';        // Průhledná černá pro dark mode
    } else {
      // Auto mode - použít isDarkMode k rozhodnutí
      overlayColor = isDarkMode
        ? 'rgba(0, 0, 0, 0.5)'        // Průhledná černá pro dark mode
        : 'rgba(255, 255, 255, 0.5)'; // Průhledná bílá pro light mode
    }

    return {
      backgroundColor: overlayColor,
      position: 'relative'
    };
  };

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
        className="min-h-screen w-full max-w-full flex flex-col overflow-x-hidden overflow-y-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          height: '100dvh', /* Dynamic viewport height pro mobilní prohlížeče */
          backgroundColor: getScreenBackgroundColor()
        }}
      >
        <div
          className="flex-1 flex items-center justify-center cursor-pointer relative"
          onClick={() => onNavigateToScreen('slova')}
          onTouchStart={onTouchStart}
          style={getSectionStyle(primaryColor)}
        >
          <div className="text-center px-2 sm:px-8 py-4">
            <div
              className="text-5xl font-light tracking-wide py-4 leading-loose"
              style={{ color: displayTextColor }}
            >
              {t('meditace') || 'meditace'}
            </div>
          </div>
        </div>

        <div
          className="flex-1 flex items-center justify-center cursor-pointer"
          onClick={() => onNavigateToScreen('hudba')}
          onTouchStart={onTouchStart}
          style={getCardSectionStyle()}
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
          onClick={() => onNavigateToScreen('breath')}
          style={getSectionStyle(primaryColor)}
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
          style={getCardSectionStyle()}
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
