import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@contexts/ThemeContext';

const PlayPauseButton = ({
  isPlaying,
  onToggle,
  className = "w-24 h-24"
}) => {
  const { currentTheme } = useTheme();
  const pauseBar1Ref = useRef(null);
  const pauseBar2Ref = useRef(null);
  const playIconRef = useRef(null);

  // Získat barvu textu z tématu a detekovat dark mode
  const textColor = currentTheme?.colors?.text || '#000000';
  const isDarkMode = textColor.includes('255, 255, 255') ||
                     textColor === '#ffffff' ||
                     textColor === 'white' ||
                     textColor.includes('rgba(255, 255, 255');

  // Pro dark mode použít bílou, jinak použít barvu z tématu
  const iconColor = isDarkMode ? '#ffffff' : (textColor || '#000000');

  // Nastavit barvu s !important pomocí setProperty
  useEffect(() => {
    if (pauseBar1Ref.current && pauseBar2Ref.current) {
      pauseBar1Ref.current.style.setProperty('background-color', iconColor, 'important');
      pauseBar2Ref.current.style.setProperty('background-color', iconColor, 'important');
    }
    if (playIconRef.current) {
      playIconRef.current.style.setProperty('border-left-color', iconColor, 'important');
    }
  }, [iconColor]);

  const handleTouchEnd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onToggle();
  };

  return (
    <motion.button
      onClick={onToggle}
      onTouchEnd={handleTouchEnd}
      className={`${className} rounded-full flex items-center justify-center pointer-events-auto cursor-pointer relative overflow-hidden`}
      style={{ position: 'relative', zIndex: 30, touchAction: 'manipulation' }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Pozadí buttonu - 20% průhledné při přehrávání, jinak neprůhledné */}
      <div
        className="absolute inset-0 rounded-full bg-black/80 backdrop-blur-sm border border-white/20 pointer-events-none"
        style={{ opacity: isPlaying ? 0.2 : 1 }}
      />
      {/* Ikona - vždy neprůhledná, relativní k buttonu */}
      <div className="relative z-10 pointer-events-none">
        <AnimatePresence mode="wait">
          {isPlaying ? (
            <motion.div
              key="pause"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="w-8 h-8 flex items-center justify-center pointer-events-none"
            >
              <div className="flex space-x-3 pointer-events-none">
                <div
                  ref={pauseBar1Ref}
                  className="w-3 h-10 pointer-events-none"
                  style={{ backgroundColor: iconColor }}
                ></div>
                <div
                  ref={pauseBar2Ref}
                  className="w-3 h-10 pointer-events-none"
                  style={{ backgroundColor: iconColor }}
                ></div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="play"
              ref={playIconRef}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="w-0 h-0 border-y-[12px] border-y-transparent ml-3 pointer-events-none"
              style={{ borderLeftColor: iconColor, borderLeftWidth: '16px', color: iconColor }}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
};

export default PlayPauseButton;
