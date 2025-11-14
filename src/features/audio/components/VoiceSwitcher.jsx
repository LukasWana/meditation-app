import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@hooks/useTheme';

const VoiceSwitcher = ({
  selectedVoice,
  availableVoices = { male: true, female: true },
  onVoiceChange,
  isDarkMode = false
}) => {
  const theme = useTheme();
  const textColor = isDarkMode ? theme.colors.white : theme.colors.gray[900];
  const activeBg = isDarkMode ? theme.colors.white : theme.colors.black;
  const activeTextColor = isDarkMode ? theme.colors.black : theme.colors.white;
  const inactiveBg = isDarkMode ? theme.colors.overlay.white20 : theme.colors.overlay.black7;
  const inactiveTextColor = isDarkMode ? theme.colors.white : theme.colors.black;
  const inactiveHoverBg = isDarkMode ? theme.colors.overlay.white30 : theme.colors.overlay.black15;
  const disabledBg = isDarkMode ? theme.colors.gray[700] : theme.colors.gray[200];
  const disabledTextColor = isDarkMode ? theme.colors.gray[500] : theme.colors.gray[400];
  const voiceOptions = [
    { value: 'male', label: 'Muž', available: availableVoices.male },
    { value: 'female', label: 'Žena', available: availableVoices.female }
  ];

  return (
    <div className="relative flex flex-col items-center space-y-2">
      {/* Text "mluví" nad aktivním ukazatelem */}
      <motion.div
        key={selectedVoice}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="text-xs font-medium mb-2"
        style={{ color: textColor }}
      >
        mluví
      </motion.div>

      <motion.div
        className="flex space-x-2 backdrop-blur-sm rounded-full p-1 shadow-inner"
        style={{ backgroundColor: theme.colors.overlay.white10 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {voiceOptions.map((option) => {
          const isActive = selectedVoice === option.value;
          const isDisabled = !option.available;
          return (
            <motion.button
              key={option.value}
              onClick={() => option.available && onVoiceChange(option.value)}
              disabled={isDisabled}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200"
              style={{
                backgroundColor: isActive ? activeBg : (isDisabled ? disabledBg : inactiveBg),
                color: isActive ? activeTextColor : (isDisabled ? disabledTextColor : inactiveTextColor),
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                boxShadow: isActive ? theme.shadows.md : 'none'
              }}
              onMouseEnter={(e) => {
                if (!isDisabled && !isActive) {
                  e.currentTarget.style.backgroundColor = inactiveHoverBg;
                }
              }}
              onMouseLeave={(e) => {
                if (!isDisabled && !isActive) {
                  e.currentTarget.style.backgroundColor = inactiveBg;
                }
              }}
              whileHover={option.available ? { opacity: 0.9 } : {}}
              whileTap={option.available ? { opacity: 0.8 } : {}}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              {option.label}
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
};

export default VoiceSwitcher;