import React from 'react';
import { motion } from 'framer-motion';

const VoiceSwitcher = ({
  selectedVoice,
  onVoiceChange
}) => {
  const voiceOptions = [
    { value: 'male', label: 'Muž' },
    { value: 'female', label: 'Žena' }
  ];

  return (
    <div className="relative flex flex-col items-center space-y-2">
      {/* Text "mluví" nad aktivním ukazatelem */}
      <motion.div
        key={selectedVoice}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        transition={{ duration: 0.2 }}
        className="text-xs text-gray-900 font-medium mb-2"
      >
        mluví
      </motion.div>

      <div className="flex space-x-2 bg-white/10 backdrop-blur-sm rounded-full p-1 shadow-inner">
        {voiceOptions.map((option) => (
          <motion.button
            key={option.value}
            onClick={() => onVoiceChange(option.value)}
            className={`
              px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
              ${selectedVoice === option.value
                ? 'bg-black text-white shadow-md'
                : 'bg-black/7 text-black hover:bg-black/15'
              }
            `}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {option.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default VoiceSwitcher;