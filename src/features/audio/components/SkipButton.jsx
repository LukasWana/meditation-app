import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRewIcon, ArrowPrewIcon } from '@components';

const SkipButton = ({
  direction,
  onClick,
  className = "w-16 h-16"
}) => {
  const IconComponent = direction === 'backward' ? ArrowRewIcon : ArrowPrewIcon;

  const handleTouchEnd = (e) => {
    e.preventDefault();
    onClick();
  };

  return (
    <motion.button
      onClick={onClick}
      onTouchEnd={handleTouchEnd}
      className={`${className} rounded-full bg-white/20 border border-black/10 flex items-center justify-center cursor-pointer`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <IconComponent className="w-[50%] h-[50%] text-black" />
    </motion.button>
  );
};

export default SkipButton;
