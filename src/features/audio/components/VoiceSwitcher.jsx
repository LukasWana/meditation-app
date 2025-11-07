import React from 'react';
import { motion } from 'framer-motion';

const VoiceSwitcher = ({
  selectedVoice,
  availableVoices = { male: true, female: true },
  onVoiceChange,
  isDarkMode = false
}) => {
  const textColor = isDarkMode ? 'text-white' : 'text-gray-900';
  const activeBg = isDarkMode ? 'bg-white text-black' : 'bg-black text-white';
  const inactiveBg = isDarkMode ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-black/7 text-black hover:bg-black/15';
  const disabledBg = isDarkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-400';
  const voiceOptions = [
    { value: 'male', label: 'Muž', available: availableVoices.male },
    { value: 'female', label: 'Žena', available: availableVoices.female }
  ];

  return (
    <div className="relative flex flex-col items-center space-y-2">
      {/* Text "mluví" nad aktivním ukazatelem */}
      <motion.div
        key={selectedVoice}
        initial={{ opacity: 0, y: 5, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -5, scale: 0.9 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={`text-xs ${textColor} font-medium mb-2`}
      >
        mluví
      </motion.div>

      <motion.div
        className="flex space-x-2 bg-white/10 backdrop-blur-sm rounded-full p-1 shadow-inner"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {voiceOptions.map((option) => (
          <motion.button
            key={option.value}
            onClick={() => option.available && onVoiceChange(option.value)}
            disabled={!option.available}
            className={`
              px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
              ${selectedVoice === option.value
                ? `${activeBg} shadow-md`
                : option.available
                  ? `${inactiveBg}`
                  : `${disabledBg} cursor-not-allowed`
              }
            `}
            whileHover={option.available ? { scale: 1.1 } : {}}
            whileTap={option.available ? { scale: 0.95 } : {}}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            {option.label}
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
};

export default VoiceSwitcher;