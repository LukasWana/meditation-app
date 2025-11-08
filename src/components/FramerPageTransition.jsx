import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const VARIANTS = {
  slide: {
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
    },
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20,
      duration: 0.6
    }
  },
  fade: {
    initial: {
      opacity: 0
    },
    in: {
      opacity: 1
    },
    out: {
      opacity: 0
    },
    transition: {
      duration: 0.35,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  scale: {
    initial: {
      opacity: 0,
      scale: 0.92
    },
    in: {
      opacity: 1,
      scale: 1
    },
    out: {
      opacity: 0,
      scale: 1.04
    },
    transition: {
      duration: 0.45,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

const FramerPageTransition = ({
  children,
  screenKey,
  animation = 'slide'
}) => {
  const { initial, in: animate, out, transition } = VARIANTS[animation] || VARIANTS.slide;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={screenKey}
        initial={initial}
        animate={animate}
        exit={out}
        transition={transition}
        className="w-full h-full max-w-full overflow-x-hidden"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default FramerPageTransition;
