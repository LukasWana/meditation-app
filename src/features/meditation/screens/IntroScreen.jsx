import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import meditatebodySvg from '../../../assets/flags/meditatebody.svg';
import { useTheme } from '@contexts/ThemeContext';

const IntroScreen = ({ onIntroComplete }) => {
  const [showIntro, setShowIntro] = useState(true);
  const { getScreenBackgroundColor, getCurrentThemeColors } = useTheme();
  const introCircleRef = useRef(null);

  // Vynutit, aby kruh byl vždy kulatý
  useEffect(() => {
    if (introCircleRef.current) {
      introCircleRef.current.style.setProperty('border-radius', '50%', 'important');
    }
  }, []);

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
      }, 400); // Fade out trvá 400ms
    }, 500); // Celkem 0.9 sekundy (0.5s animace + 0.4s fade out)

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
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {/* Kompozice s meditující siluetou a bílým kruhem */}
          <motion.div
            className="flex flex-col items-center justify-center"
            initial={{ opacity: 1 }}
            animate={{
              opacity: 1,
              y: 0
            }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {/* Bílý kruh na pozadí */}
            <motion.div
              className="relative flex items-center justify-center mb-6"
            >
              {/* Kroužek jako halo - přizpůsobí se tématu */}
              <motion.div
                ref={introCircleRef}
                className="absolute w-48 h-48 rounded-full intro-animation-circle z-0"
                style={{ backgroundColor: circleColor, borderRadius: '50%', willChange: 'transform, opacity' }}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{
                  scale: 1,
                  opacity: 1
                }}
                transition={{
                  duration: 0.5,
                  ease: "easeOut"
                }}
              />

              {/* SVG silueta meditujícího člověka */}
              <motion.img
                src={meditatebodySvg}
                alt="Meditující osoba"
                className="relative z-10 w-64 h-auto"
                initial={{ y: 12, opacity: 0 }}
                animate={{
                  y: 0,
                  opacity: 1
                }}
                transition={{
                  duration: 0.5,
                  ease: "easeOut",
                  delay: 0.08
                }}
                style={{ willChange: 'transform, opacity' }}
              />
            </motion.div>

            {/* Text "Meditácia" */}
            <motion.h1
              className="text-6xl font-light tracking-normal"
              initial={{ y: 8, opacity: 0 }}
              animate={{
                y: 0,
                opacity: 1
              }}
              transition={{
                duration: 0.5,
                ease: "easeOut",
                delay: 0.15
              }}
              style={{
                color: displayTextColor,
                fontSize: '4.05rem',
                willChange: 'transform, opacity'
              }}
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
