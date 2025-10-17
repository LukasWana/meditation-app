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
      }, 1000); // 1s fade out duration
    }, 3500); // 3.5s celková animace - delší pro lepší efekt

    return () => clearTimeout(timer);
  }, [onIntroComplete]);

  return (
    <AnimatePresence mode="wait">
      {showIntro && (
        <motion.div
          className="h-screen w-full max-w-full bg-[#f4ddc4] flex items-center justify-center overflow-x-hidden fixed inset-0 z-50"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1, ease: "easeInOut" }}
        >
          {/* Úvodný text "Meditácia" uprostred */}
          <motion.div
            className="flex flex-col items-center justify-center"
            initial={{ opacity: 1 }}
            animate={{
              opacity: 1,
              y: 0
            }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          >
            <motion.h1
              className="text-7xl font-light tracking-wide mb-4"
              style={{fontFamily: 'Playfair Display'}}
              initial={{ scale: 0.5, opacity: 0, y: 30 }}
              animate={{
                scale: 1,
                opacity: 1,
                y: 0
              }}
              transition={{
                duration: 1.5,
                ease: "easeOut",
                delay: 0.3
              }}
            >
              Meditácia
            </motion.h1>

            {/* Dekorativní tečky */}
            <motion.div
              className="flex gap-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.2 }}
            >
              <motion.div
                className="w-2 h-2 bg-black rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0 }}
              />
              <motion.div
                className="w-2 h-2 bg-black rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
              />
              <motion.div
                className="w-2 h-2 bg-black rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default IntroScreen;
