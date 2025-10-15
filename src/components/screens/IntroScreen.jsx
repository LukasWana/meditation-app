import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const IntroScreen = ({ onIntroComplete }) => {
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowIntro(false);
      // Po fade out sa spustí onIntroComplete
      setTimeout(() => {
        onIntroComplete();
      }, 800); // 0.8s fade out duration
    }, 2000); // 1.5s animation + 0.5s buffer

    return () => clearTimeout(timer);
  }, [onIntroComplete]);

  return (
    <AnimatePresence mode="wait">
      {showIntro && (
        <motion.div
          className="h-screen w-full max-w-full bg-[#f4ddc4] flex items-center justify-center overflow-x-hidden fixed inset-0 z-50"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          {/* Úvodný text "Meditácia" uprostred */}
          <motion.div
            className="flex items-center justify-center"
            initial={{ opacity: 1 }}
            animate={{
              opacity: 1,
              y: 0
            }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          >
            <motion.h1
              className="text-6xl font-light tracking-wide"
              style={{fontFamily: 'Playfair Display'}}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: 1
              }}
              transition={{
                duration: 1,
                ease: "easeOut",
                delay: 0.2
              }}
            >
              Meditácia
            </motion.h1>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default IntroScreen;
