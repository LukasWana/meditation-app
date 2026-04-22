import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import { ThemeContext } from '@contexts/ThemeContext';
import { useLanguage } from '@contexts/LanguageContext';
import { Check } from 'lucide-react';

const ProgressBarColorPicker = ({ extractedColors, onColorSelect, currentColor }) => {
  const { t } = useLanguage();
  const themeContext = useContext(ThemeContext);

  if (!themeContext) return null;

  const { getCurrentThemeColors, colorMode } = themeContext;
  const themeColors = getCurrentThemeColors?.() || {};
  const isDarkMode = colorMode === 'dark';
  const textColor = themeColors.text || (isDarkMode ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)');
  const textSecondaryColor = themeColors.textSecondary || (isDarkMode ? 'rgba(180, 180, 180, 1)' : 'rgba(100, 100, 100, 1)');
  const borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)';

  // Pokud nejsou extrahované barvy, neukazujeme picker
  if (!extractedColors || extractedColors.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <p
        className="text-sm mb-2"
        style={{ color: textSecondaryColor }}
      >
        {t('barvaProUkazatel') || 'Barva pro ukazatel času:'}
      </p>
      <div className="flex gap-2 flex-wrap">
        {extractedColors.map((color, index) => {
          const isSelected = currentColor === color;
          return (
            <motion.button
              key={index}
              onClick={() => onColorSelect(color)}
              className="w-12 h-12 rounded-lg border-2 relative overflow-hidden transition-all"
              style={{
                backgroundColor: color,
                borderColor: isSelected ? (textColor === 'rgba(255, 255, 255, 1)' ? 'rgba(0, 0, 0, 1)' : 'rgba(255, 255, 255, 1)') : borderColor,
                borderWidth: isSelected ? '3px' : '1px'
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title={color}
            >
              {isSelected && (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.3)'
                  }}
                >
                  <Check
                    size={16}
                    style={{
                      color: textColor === 'rgba(255, 255, 255, 1)' ? 'rgba(0, 0, 0, 1)' : 'rgba(255, 255, 255, 1)'
                    }}
                  />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressBarColorPicker;
