import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import meditatebodySvg from '../../../assets/flags/meditatebody.svg';

const IntroScreen = ({ onIntroComplete }) => {
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowIntro(false);
      // Po fade out sa spustí onIntroComplete
      setTimeout(() => {
        onIntroComplete();
      }, 500); // Zkráceno z 1000ms na 500ms
    }, 2000); // Zkráceno z 3500ms na 2000ms pro lepší LCP

    return () => clearTimeout(timer);
  }, [onIntroComplete]);

  return (
    <AnimatePresence mode="wait">
      {showIntro && (
        <motion.div
          className="h-screen w-full max-w-full bg-[#f4ddc4] flex items-center justify-center overflow-x-hidden fixed inset-0 z-50"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
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
              {/* Bílý kruh jako halo */}
              <div className="absolute w-48 h-48 bg-white rounded-full z-0"></div>

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
