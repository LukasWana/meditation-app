import React from 'react';
import { motion } from 'framer-motion';

const FramerSection = ({
  children,
  className = '',
  onClick,
  animationType = 'fadeIn',
  delay = 0,
  ...props
}) => {
  const getAnimationVariants = () => {
    switch (animationType) {
      case 'fadeIn':
        return {
          initial: { opacity: 0, y: 30 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: -30 }
        };
      case 'slideInLeft':
        return {
          initial: { opacity: 0, x: -100 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: -100 }
        };
      case 'slideInUp':
        return {
          initial: { opacity: 0, y: 100 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: 100 }
        };
      case 'scaleIn':
        return {
          initial: { opacity: 0, scale: 0.8 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 0.8 }
        };
      default:
        return {
          initial: { opacity: 0, y: 30 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: -30 }
        };
    }
  };

  const variants = getAnimationVariants();

  return (
    <motion.div
      className={`${className} max-w-full overflow-x-hidden`}
      onClick={onClick}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      transition={{
        duration: 0.6,
        delay: delay,
        ease: [0.4, 0, 0.2, 1],
        type: "spring",
        stiffness: 100,
        damping: 20
      }}
      whileHover={onClick ? {
        scale: 1.02,
        transition: { type: "spring", stiffness: 300, damping: 20 }
      } : {}}
      whileTap={onClick ? {
        scale: 0.98,
        transition: { type: "spring", stiffness: 400, damping: 25 }
      } : {}}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default FramerSection;
