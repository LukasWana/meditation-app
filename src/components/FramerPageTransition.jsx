import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FramerPageTransition = ({ children, screenKey }) => {
  const pageVariants = {
    initial: {
      opacity: 0,
      y: 30,
      scale: 0.98
    },
    in: {
      opacity: 1,
      y: 0,
      scale: 1
    },
    out: {
      opacity: 0,
      y: -30,
      scale: 0.98
    }
  };

  const pageTransition = {
    type: "spring",
    stiffness: 100,
    damping: 20,
    duration: 0.6
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={screenKey}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className="w-full h-full max-w-full overflow-x-hidden"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default FramerPageTransition;
