import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@contexts/ThemeContext';

const PlayPauseButton = ({
  isPlaying,
  onToggle,
  className = "w-24 h-24"
}) => {
  const { currentTheme } = useTheme();

  // Získat barvu textu z tématu a detekovat dark mode
  const textColor = currentTheme?.colors?.text || '#000000';
  const isDarkMode = textColor.includes('255, 255, 255') ||
                     textColor === '#ffffff' ||
                     textColor === 'white' ||
                     textColor.includes('rgba(255, 255, 255');

  // Pro dark mode použít bílou ikonku na tmavém pozadí, pro light mode bílou ikonku na černém pozadí (nebo glass)
  const iconColor = '#ffffff';
  const buttonBackgroundColor = isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.2)';
  const buttonBorderColor = isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.5)';

  // Vynutit, aby tlačítko bylo vždy kulaté - pouze border-radius, bez změny velikosti
  const buttonRef = useRef(null);
  useEffect(() => {
    if (buttonRef.current) {
      // Funkce pro zajištění kulatého tvaru (pouze border-radius, bez změny velikosti)
      const ensureCircular = () => {
        if (buttonRef.current) {
          // VŽDY nastavit border-radius na 50% s nejvyšší prioritou
          buttonRef.current.style.setProperty('border-radius', '50%', 'important');
          buttonRef.current.style.setProperty('aspect-ratio', '1 / 1', 'important');
        }
      };

      // Nastavit okamžitě
      ensureCircular();

      // Aktualizovat po malém zpoždění (pro případ, že by se změnily třídy)
      const timeoutId = setTimeout(ensureCircular, 100);

      // Sledovat změny pomocí MutationObserver (pro případ, že by se změnily třídy)
      const observer = new MutationObserver(ensureCircular);
      observer.observe(buttonRef.current, {
        attributes: true,
        attributeFilter: ['class', 'style'],
        childList: false,
        subtree: false
      });

      return () => {
        clearTimeout(timeoutId);
        observer.disconnect();
      };
    }
  }, [className]); // Spustit i když se změní className

  const handleTouchEnd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onToggle();
  };

  return (
    <motion.button
      ref={buttonRef}
      onClick={onToggle}
      onTouchEnd={handleTouchEnd}
      className={`${className} rounded-full flex items-center justify-center pointer-events-auto cursor-pointer relative play-pause-button`}
      style={{
        position: 'relative',
        zIndex: 100,
        touchAction: 'manipulation',
        outline: 'none',
        border: 'none',
        overflow: 'visible',
        borderRadius: '50%',
        aspectRatio: '1 / 1',
        isolation: 'isolate'
      }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      whileHover={{}}
      whileTap={{}}
    >
      {/* Pozadí buttonu - stále stejné, nemění se při přepínání */}
      <div
        className="absolute inset-0 backdrop-blur-md pointer-events-none shadow-lg"
        style={{
          backgroundColor: buttonBackgroundColor,
          border: `1px solid ${buttonBorderColor}`,
          opacity: 1,
          overflow: 'hidden',
          borderRadius: '50%',
          willChange: 'auto'
        }}
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
              className="w-10 h-10 flex items-center justify-center pointer-events-none"
            >
              {/* Pause icon jako SVG (bez zaoblení, nezávislé na CSS rounded systému) */}
              <svg
                className="w-full h-full pointer-events-none"
                viewBox="0 0 40 40"
                aria-hidden="true"
                focusable="false"
              >
                <rect x="10" y="6" width="8" height="28" rx="0" ry="0" fill={iconColor} />
                <rect x="24" y="6" width="8" height="28" rx="0" ry="0" fill={iconColor} />
              </svg>
            </motion.div>
          ) : (
            <motion.div
              key="play"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="w-10 h-10 pointer-events-none flex items-center justify-center"
            >
              {/* Play icon jako SVG (bez zaoblení, konzistentní rendering) */}
              <svg
                className="w-full h-full pointer-events-none"
                viewBox="0 0 40 40"
                aria-hidden="true"
                focusable="false"
              >
                <polygon points="14,8 32,20 14,32" fill={iconColor} />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
};

export default PlayPauseButton;
