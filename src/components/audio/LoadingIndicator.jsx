import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LoadingIndicator = ({
  isLoading,
  className = "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
}) => {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={className}
        >
          <p className="text-gray-600 text-[3vw] sm:text-sm lg:text-xs" style={{fontFamily: 'Playfair Display'}}>
            Načítavam...
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingIndicator;
