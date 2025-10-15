import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

const FramerSection = ({
  children,
  className = '',
  onClick,
  animationType = 'fadeIn',
  delay = 0,
  ...props
}) => {
  const variants = useMemo(() => {
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
      case 'slideInTop':
        return {
          initial: { opacity: 0, y: -250, scale: 0.7, rotateX: -20 },
          animate: {
            opacity: 1,
            y: 0,
            scale: 1,
            rotateX: 0,
            transition: {
              type: "spring",
              stiffness: 160,
              damping: 10,
              mass: 1.0,
              bounce: 0.6
            }
          },
          exit: { opacity: 0, y: -250, scale: 0.7, rotateX: -20 }
        };
      default:
        return {
          initial: { opacity: 0, y: 30 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: -30 }
        };
    }
  }, [animationType]);

  const transition = useMemo(() => {
    if (animationType === 'slideInTop') {
      return {
        delay: delay,
        type: "spring",
        stiffness: 160,
        damping: 10,
        mass: 1.0,
        bounce: 0.6
      };
    }

    return {
      duration: 0.6,
      delay: delay,
      ease: [0.4, 0, 0.2, 1],
      type: "spring",
      stiffness: 100,
      damping: 20
    };
  }, [delay, animationType]);

  return (
    <motion.div
      className={`${className} max-w-full overflow-x-hidden`}
      onClick={onClick}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      transition={transition}
      whileHover={onClick ? {
        scale: 1.03,
        y: -5,
        transition: { type: "spring", stiffness: 400, damping: 25 }
      } : {}}
      whileTap={onClick ? {
        scale: 0.97,
        y: 2,
        transition: { type: "spring", stiffness: 500, damping: 30 }
      } : {}}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default FramerSection;
