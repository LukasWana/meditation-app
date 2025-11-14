import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@hooks/useTheme';

/**
 * AnimatedText - zjednodušená verze bez animací
 * Animace textu byly vypnuty - komponenta se chová jako obyčejný div
 * Zachováváme motion.div pro kompatibilitu, ale bez animací
 */
const AnimatedText = ({
  children,
  delay, // Ignorováno - animace vypnuty
  className = '',
  style = {}
}) => {
  const theme = useTheme();
  // Animace vypnuty - ignorujeme delay
  void delay;

  return (
    <motion.div
      className={className}
      style={{
        ...style,
        paddingTop: theme.spacing.md,
        paddingBottom: theme.spacing.md,
        lineHeight: theme.typography.lineHeight.loose,
      }}
      initial={false}
      animate={false}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedText;
