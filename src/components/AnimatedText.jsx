import React from 'react';
import { motion } from 'framer-motion';

const AnimatedText = ({
  children,
  delay = 0,
  className = '',
  style = {}
}) => {
  return (
    <motion.div
      className={`${className} py-4 leading-loose`}
      style={style}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
          delay: delay + 0.3, // Text sa zobrazí po tom, čo sekcia sadne
          duration: 0.8,
          type: "spring",
          stiffness: 120,
          damping: 20
        }
      }}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedText;
