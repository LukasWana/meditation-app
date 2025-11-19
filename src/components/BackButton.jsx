import React, { memo, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import FramerButton from './FramerButton';
import { useTheme } from '@hooks/useTheme';
import { useAnimationConfig } from '@hooks/useAnimationConfig';

const BackButton = ({ onClick, className = '' }) => {
  const theme = useTheme();
  const config = useAnimationConfig();

  const handleMouseEnter = useCallback((e) => {
    if (e.currentTarget) {
      e.currentTarget.style.backgroundColor = theme.colors.overlay.white30;
    }
  }, [theme.colors.overlay.white30]);

  const handleMouseLeave = useCallback((e) => {
    if (e.currentTarget) {
      e.currentTarget.style.backgroundColor = theme.colors.overlay.white20;
    }
  }, [theme.colors.overlay.white20]);

  return (
    <motion.div
      className={`absolute top-6 left-6 ${className}`}
      style={{ zIndex: theme.zIndex.fixed }}
      initial={false}
      animate={{ opacity: 1 }}
      transition={{ duration: config.durations.medium, ease: config.easings.easeOut }}
    >
      <FramerButton
        onClick={onClick}
        variant="ghost"
        className={`w-12 h-12 rounded-full backdrop-blur-sm flex items-center justify-center p-0`}
        style={{
          backgroundColor: theme.colors.overlay.white20,
          borderColor: theme.colors.overlay.black10,
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <ArrowLeft size={theme.sizes.icon.md} />
      </FramerButton>
    </motion.div>
  );
};

export default memo(BackButton);
