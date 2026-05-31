import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@contexts/ThemeContext';

const AudioPermissionOverlay = ({
  isVisible,
  onRequestPermission,
  onClose,
  isRequesting = false
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const { currentTheme, getScreenBackgroundColor } = useTheme();

  // Získat barvu pozadí z tématu
  const backgroundColor = getScreenBackgroundColor() || currentTheme?.colors?.background || '#f4ddc4';

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100]"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="rounded-[2rem] p-8 mx-4 max-w-md w-full text-center shadow-2xl glass-modal"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Icon */}
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center glass-panel">
              <svg
                className="w-10 h-10 text-black"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h2
            className="text-3xl font-light text-black mb-4"
          >
            Povolení zvuku
          </h2>

          {/* Description */}
          <p className="text-gray-700 mb-8 leading-relaxed text-lg">
            Pro přehrávání meditačních nahrávek potřebujeme povolení zvuku.
            <br />
            Klikněte na tlačítko níže pro povolení.
          </p>

          {/* Button */}
          <motion.button
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            onClick={onRequestPermission}
            disabled={isRequesting}
            className="w-full bg-black hover:bg-gray-800 disabled:bg-gray-400 text-white font-medium py-4 px-8 rounded-xl transition-all duration-200 flex items-center justify-center space-x-3 text-lg"
          >
            {isRequesting ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                <span>Povoluji...</span>
              </>
            ) : (
              <>
                <motion.svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  animate={isHovered ? { rotate: 360 } : { rotate: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </motion.svg>
                <span>Povolit zvuk</span>
              </>
            )}
          </motion.button>

          {/* Note */}
          <p className="text-sm text-gray-600 mt-6 leading-relaxed">
            Toto povolení je nutné kvůli bezpečnostním politikám prohlížeče.
            <br />
            Po povolení bude zvuk fungovat okamžitě.
          </p>

          {/* Close button */}
          <button
            onClick={onClose}
            className="mt-4 text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Zavřít (bez povolení zvuku)
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AudioPermissionOverlay;
