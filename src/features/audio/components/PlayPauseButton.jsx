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

  // Pro dark mode použít bílou ikonku na tmavém pozadí, pro light mode bílou ikonku na černém pozadí
  const iconColor = isDarkMode ? '#ffffff' : '#ffffff';
  const buttonBackgroundColor = isDarkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.8)';

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

  // Vynutit, aby tlačítko bylo vždy kulaté - CSS to už zajišťuje, ale pro jistotu
  const buttonRef = useRef(null);
  useEffect(() => {
    if (buttonRef.current) {
      // Nastavit border-radius s nejvyšší prioritou
      buttonRef.current.style.setProperty('border-radius', '50%', 'important');
      buttonRef.current.style.setProperty('aspect-ratio', '1 / 1', 'important');
      
      // Zajistit, aby width a height byly stejné (pro kruh)
      const updateSize = () => {
        if (buttonRef.current) {
          const computedStyle = window.getComputedStyle(buttonRef.current);
          const width = computedStyle.width;
          if (width && width !== 'auto') {
            buttonRef.current.style.setProperty('height', width, 'important');
            buttonRef.current.style.setProperty('width', width, 'important');
          }
        }
      };
      
      // Aktualizovat velikost okamžitě a po malém zpoždění (pro viewport jednotky)
      updateSize();
      const timeoutId = setTimeout(updateSize, 100);
      
      // Sledovat změny velikosti okna
      window.addEventListener('resize', updateSize);
      
      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('resize', updateSize);
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
        isolation: 'isolate',
        // Zajistit, aby tlačítko bylo vždy kulaté - přepsat jakékoli jiné styly
        minWidth: 'var(--button-size, auto)',
        minHeight: 'var(--button-size, auto)',
        maxWidth: 'var(--button-size, auto)',
        maxHeight: 'var(--button-size, auto)'
      }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Pozadí buttonu - stále stejné, nemění se při přepínání */}
      <div
        className="absolute inset-0 rounded-full backdrop-blur-sm pointer-events-none"
        style={{
          backgroundColor: buttonBackgroundColor,
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
              className="w-8 h-8 flex items-center justify-center pointer-events-none"
            >
              <div className="flex space-x-3 pointer-events-none">
                <div
                  ref={pauseBar1Ref}
                  className="w-3 h-10 pointer-events-none"
                  style={{
                    backgroundColor: iconColor,
                    borderRadius: 0
                  }}
                ></div>
                <div
                  ref={pauseBar2Ref}
                  className="w-3 h-10 pointer-events-none"
                  style={{
                    backgroundColor: iconColor,
                    borderRadius: 0
                  }}
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
              style={{
                borderLeftColor: iconColor,
                borderLeftWidth: '16px',
                color: iconColor,
                borderRadius: 0
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
};

export default PlayPauseButton;
