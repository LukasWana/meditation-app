import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRewIcon, ArrowPrewIcon } from '@components';
import { useTheme } from '@hooks/useTheme';

const SkipButton = ({
  direction,
  onClick,
  className = "w-16 h-16",
  isDarkMode = false
}) => {
  const theme = useTheme();
  const IconComponent = direction === 'backward' ? ArrowRewIcon : ArrowPrewIcon;
  const textColor = isDarkMode ? theme.colors.white : theme.colors.black;
  const bgColor = theme.colors.overlay.white20;
  const borderColor = isDarkMode ? theme.colors.overlay.white30 : theme.colors.overlay.black10;

  const handleTouchEnd = (e) => {
    e.preventDefault();
    onClick();
  };

  return (
    <motion.button
      onClick={onClick}
      onTouchEnd={handleTouchEnd}
      className={`${className} rounded-full border flex items-center justify-center cursor-pointer`}
      style={{
        backgroundColor: bgColor,
        borderColor: borderColor
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <IconComponent
        className="w-[50%] h-[50%]"
        style={{ color: textColor }}
      />
    </motion.button>
  );
};

export default SkipButton;
