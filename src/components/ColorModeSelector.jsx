import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import { ThemeContext } from '@contexts/ThemeContext';
import { useLanguage } from '@contexts/LanguageContext';
import FramerSection from '@components/FramerSection';
import { Moon, Sun } from 'lucide-react';
import { Heading } from '@components/ui/Heading';

const ColorModeSelector = () => {
  const { t } = useLanguage();
  const themeContext = useContext(ThemeContext);
  const { colorMode, changeColorMode, getCurrentThemeColors } = themeContext || {};

  if (!themeContext || !colorMode || !changeColorMode) {
    return null;
  }

  const themeColors = getCurrentThemeColors?.() || {};
  const isDarkMode = colorMode === 'dark';
  const _cardColor = themeColors.card || (isDarkMode ? 'rgba(15, 15, 15, 0.95)' : 'rgba(255, 255, 255, 0.95)');
  const textColor = themeColors.text || (isDarkMode ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)');
  const textSecondaryColor = themeColors.textSecondary || (isDarkMode ? 'rgba(180, 180, 180, 1)' : 'rgba(100, 100, 100, 1)');
  const _borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)';
  const _activeBorderColor = isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.3)';
  const _activeBgColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
  const checkmarkBgColor = isDarkMode ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)';
  const checkmarkIconColor = isDarkMode ? 'rgba(0, 0, 0, 1)' : 'rgba(255, 255, 255, 1)';

  const modes = [
    { id: 'light', label: t('svetly') || 'Světlý', icon: Sun },
    { id: 'dark', label: t('tmavy') || 'Tmavý', icon: Moon }
  ];

  return (
    <FramerSection
      animationType="slideInUp"
      delay={0.23}
    >
      <div
        className="glass-panel w-full p-6"
        style={{ color: textColor }}
      >
        <Heading level={3} visual={2} style={{ color: textColor }}>
          {t('barevnyRezim') || 'Barevný režim'}
        </Heading>
        <div className="space-y-3">
          {modes.map((mode) => {
            const Icon = mode.icon;
            const isActive = colorMode === mode.id;

            return (
              <motion.button
                key={mode.id}
                onClick={() => changeColorMode(mode.id)}
                className={`w-full p-4 rounded-theme-button transition-all duration-200 flex items-center justify-between ${isActive ? 'glass-button' : 'hover:opacity-80'}`}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className="w-5 h-5"
                    style={{ color: isActive ? textColor : textSecondaryColor }}
                  />
                  <div
                    className="text-lg font-medium"
                    style={{ color: isActive ? textColor : textSecondaryColor }}
                  >
                    {mode.label}
                  </div>
                </div>
                {isActive && (
                  <div
                    className="w-6 h-6 rounded-theme-full flex items-center justify-center"
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
              </motion.button>
            );
          })}
        </div>
      </div>
    </FramerSection>
  );
};

export default ColorModeSelector;

