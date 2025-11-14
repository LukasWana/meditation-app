import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@hooks/useTheme';

const LoadingIndicator = ({
  isLoading,
  className = "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
}) => {
  const theme = useTheme();
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={className}
        >
          <p
            className="text-[3vw] sm:text-sm lg:text-xs"
            style={{ color: theme.colors.gray[600] }}
          >
            Načítavam...
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingIndicator;
