import React from 'react';
import { motion } from 'framer-motion';

/**
 * FramerSection - zjednodušená verze bez animací
 * Animace prvků byly vypnuty - komponenta se chová jako obyčejný div
 * Zachováváme motion.div pro kompatibilitu, ale bez animací
 */
const FramerSection = ({
  children,
  className = '',
  onClick,
  animationType, // Ignorováno - animace vypnuty
  delay, // Ignorováno - animace vypnuty
  ...props
}) => {
  // Animace vypnuty - ignorujeme animationType a delay
  void animationType;
  void delay;
  return (
    <motion.div
      className={`${className} max-w-full overflow-x-hidden`}
      onClick={onClick}
      initial={false}
      animate={false}
      exit={false}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default FramerSection;
