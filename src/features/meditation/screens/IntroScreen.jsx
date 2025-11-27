import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import meditatebodySvg from '../../../assets/flags/meditatebody.svg';
import { useTheme } from '@contexts/ThemeContext';

const IntroScreen = ({ onIntroComplete }) => {
  const [showIntro, setShowIntro] = useState(true);
  const { getScreenBackgroundColor, getCurrentThemeColors } = useTheme();

  // Získat barvu textu z tématu a detekovat dark mode
  const themeColors = getCurrentThemeColors();
  const textColor = themeColors?.text || '#000000';
  const isDarkMode = textColor.includes('255, 255, 255') ||
                     textColor === '#ffffff' ||
                     textColor === 'white' ||
                     textColor.includes('rgba(255, 255, 255');

  // Text by měl být bílý v dark mode, černý v light mode
  const displayTextColor = isDarkMode ? '#ffffff' : '#000000';

  // Pro dark mode (bílé písmo) použít světlý/bílý kroužek, pro light mode (černé písmo) také světlý
  // Kroužek by měl být vždy světlý pro kontrast s tmavým pozadím v dark mode
  // Plně neprůhledný (bez průhlednosti)
  const circleColor = isDarkMode ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 1)';

  useEffect(() => {
    // Zajistit, že se #root nemůže skrolovat během intro animace
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.style.overflowY = 'hidden';
    }

    const timer = setTimeout(() => {
      setShowIntro(false);
      // Po fade out sa spustí onIntroComplete
      setTimeout(() => {
        // Obnovit overflow na #root po intro
        if (rootElement) {
          rootElement.style.overflowY = '';
        }
        onIntroComplete();
      }, 800); // Fade out trvá 800ms
    }, 1000); // Celkem 1.8 sekundy (1s animace + 0.8s fade out)

    return () => {
      clearTimeout(timer);
      // Obnovit overflow při unmount
      if (rootElement) {
        rootElement.style.overflowY = '';
      }
    };
  }, [onIntroComplete]);

  return (
    <AnimatePresence mode="wait">
      {showIntro && (
        <motion.div
          className="w-full max-w-full flex items-center justify-center overflow-x-hidden overflow-y-hidden fixed inset-0 z-50"
          style={{
            backgroundColor: getScreenBackgroundColor(),
            height: '100dvh' // Dynamic viewport height pro mobilní prohlížeče
          }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          {/* Kompozice s meditující siluetou a bílým kruhem */}
          <motion.div
            className="flex flex-col items-center justify-center"
            initial={{ opacity: 1 }}
            animate={{
              opacity: 1,
              y: 0
            }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            {/* Bílý kruh na pozadí */}
            <motion.div
              className="relative flex items-center justify-center mb-6"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: 1
              }}
              transition={{
                duration: 0.8,
                ease: "easeOut",
                delay: 0.1
              }}
            >
              {/* Kroužek jako halo - přizpůsobí se tématu */}
              <div
                className="absolute w-48 h-48 rounded-full z-0"
                style={{ backgroundColor: circleColor }}
              ></div>

              {/* SVG silueta meditujícího člověka */}
              <motion.img
                src={meditatebodySvg}
                alt="Meditující osoba"
                className="relative z-10 w-64 h-auto"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{
                  scale: 1,
                  opacity: 1
                }}
                transition={{
                  duration: 0.8,
                  ease: "easeOut",
                  delay: 0.2
                }}
              />
            </motion.div>

            {/* Text "Meditácia" */}
            <motion.h1
              className="text-7xl font-light tracking-wide"
              initial={{ scale: 0.5, opacity: 0, y: 30 }}
              animate={{
                scale: 1,
                opacity: 1,
                y: 0
              }}
              transition={{
                duration: 0.8,
                ease: "easeOut",
                delay: 0.3
              }}
              style={{ color: displayTextColor }}
            >
              meditácia
            </motion.h1>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default IntroScreen;
