import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PlayPauseButton = ({
  isPlaying,
  onToggle,
  className = "w-24 h-24",
  isDarkMode = false
}) => {
  // Barvy podle dark mode
  // isDarkMode=true → bílé pozadí s černou ikonou
  // isDarkMode=false → černé pozadí s bílou ikonou
  const bgColor = isDarkMode ? 'bg-white/80' : 'bg-black/80';
  const borderColor = isDarkMode ? 'border-black/20' : 'border-white/20';
  const iconColor = isDarkMode ? 'bg-black' : 'bg-white'; // Opraveno: černá ikona na bílém, bílá ikona na černém
  const playIconColor = isDarkMode ? 'border-l-black' : 'border-l-white';

  return (
    <motion.button
      onClick={onToggle}
      className={`${className} rounded-full flex items-center justify-center pointer-events-auto cursor-pointer relative overflow-hidden`}
      style={{ position: 'relative', zIndex: 10 }}
    >
      {/* Pozadí buttonu - vždy viditelné, alespoň 80% opacity */}
      <div
        className={`absolute inset-0 rounded-full ${bgColor} backdrop-blur-sm border ${borderColor}`}
        style={{ opacity: isPlaying ? 0.9 : 1 }}
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
                <div className={`w-3 h-10 ${iconColor}`} style={{ opacity: 1 }}></div>
                <div className={`w-3 h-10 ${iconColor}`} style={{ opacity: 1 }}></div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="play"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className={`w-0 h-0 border-l-[16px] ${playIconColor} border-y-[12px] border-y-transparent ml-3`}
              style={{ opacity: 1 }}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
};

export default PlayPauseButton;
