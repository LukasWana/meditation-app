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
      className={`${className} rounded-full bg-white/20 backdrop-blur-sm border border-black/10 flex items-center justify-center hover:bg-white/20 cursor-pointer`}
      whileTap={{ scale: 0.95 }}
    >
      <IconComponent className="w-[50%] h-[50%] text-black" />
    </motion.button>
  );
};

export default SkipButton;
