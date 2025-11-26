import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import { ThemeContext } from '@contexts/ThemeContext';
import { useLanguage } from '@contexts/LanguageContext';
import FramerSection from '@components/FramerSection';
import { Moon, Sun, Monitor } from 'lucide-react';

const ColorModeSelector = () => {
  const { t } = useLanguage();
  const themeContext = useContext(ThemeContext);
  const { colorMode, changeColorMode } = themeContext || {};

  if (!themeContext || !colorMode || !changeColorMode) {
    return null;
  }

  const modes = [
    { id: 'auto', label: t('automaticky') || 'Automaticky', icon: Monitor },
    { id: 'light', label: t('svetly') || 'Světlý', icon: Sun },
    { id: 'dark', label: t('tmavy') || 'Tmavý', icon: Moon }
  ];

  return (
    <FramerSection
      animationType="slideInUp"
      delay={0.23}
    >
      <div className="w-full p-6 bg-white/50 backdrop-blur rounded-none border border-black/10">
        <h3 className="text-2xl font-light mb-4">
          {t('barevnyRezim') || 'Barevný režim'}
        </h3>
        <div className="space-y-3">
          {modes.map((mode) => {
            const Icon = mode.icon;
            const isActive = colorMode === mode.id;

            return (
              <motion.button
                key={mode.id}
                onClick={() => changeColorMode(mode.id)}
                className={`w-full p-4 rounded-lg border-2 transition-all duration-200 flex items-center justify-between ${
                  isActive
                    ? 'border-black bg-black/5'
                    : 'border-gray-200 bg-white/80 hover:border-gray-300'
                }`}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-black' : 'text-gray-600'}`} />
                  <div className={`text-lg font-medium ${isActive ? 'text-black' : 'text-gray-700'}`}>
                    {mode.label}
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
              </motion.button>
            );
          })}
        </div>
      </div>
    </FramerSection>
  );
};

export default ColorModeSelector;

