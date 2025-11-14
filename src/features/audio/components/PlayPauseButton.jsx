import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@hooks/useTheme';

const PlayPauseButton = ({
  isPlaying,
  onToggle,
  className = "w-24 h-24",
  isDarkMode = false
}) => {
  const theme = useTheme();
  // Barvy podle dark mode
  // isDarkMode=true → bílé pozadí s černou ikonou
  // isDarkMode=false → černé pozadí s bílou ikonou
  const bgColor = isDarkMode ? theme.colors.overlay.white80 : theme.colors.overlay.black80;
  const borderColor = isDarkMode ? theme.colors.overlay.black20 : theme.colors.overlay.white20;
  const iconColor = isDarkMode ? theme.colors.black : theme.colors.white;
  const playIconColor = isDarkMode ? theme.colors.black : theme.colors.white;

  return (
    <motion.button
      onClick={onToggle}
      className={`${className} rounded-full flex items-center justify-center pointer-events-auto cursor-pointer relative overflow-hidden`}
      style={{ position: 'relative', zIndex: 10 }}
    >
      {/* Pozadí buttonu - vždy viditelné, alespoň 80% opacity */}
      <div
        className="absolute inset-0 rounded-full backdrop-blur-sm border"
        style={{
          backgroundColor: bgColor,
          borderColor: borderColor,
          opacity: isPlaying ? 0.9 : 1
        }}
      />
      {/* Ikona - vždy neprůhledná, relativní k buttonu */}
      <div className="relative z-10" style={{ opacity: 1 }}>
        <AnimatePresence mode="wait">
          {isPlaying ? (
            <motion.div
              key="pause"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="w-8 h-8 flex items-center justify-center"
            >
              <div className="flex space-x-3">
                <div
                  className="w-3 h-10"
                  style={{ backgroundColor: iconColor, opacity: 1 }}
                ></div>
                <div
                  className="w-3 h-10"
                  style={{ backgroundColor: iconColor, opacity: 1 }}
                ></div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="play"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="w-0 h-0 border-l-[16px] border-y-[12px] border-y-transparent ml-3"
              style={{
                borderLeftColor: playIconColor,
                opacity: 1
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
};

export default PlayPauseButton;
