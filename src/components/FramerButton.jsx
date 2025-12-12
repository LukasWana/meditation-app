import React from 'react';
import { motion } from 'framer-motion';

const FramerButton = ({
  children,
  onClick,
  className = '',
  variant = 'primary',
  disabled = false,
  animationType: _animationType, // FramerMotion specific props - ne předávat do DOM
  delay: _delay,
  ...props
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-black text-white';
      case 'secondary':
        return 'bg-white border-2 border-black text-black';
      case 'ghost':
        return 'bg-transparent border-2 border-black/20 text-black';
      case 'rounded':
        return 'bg-black text-white rounded-full';
      default:
        return 'bg-black text-white';
    }
  };

  return (
    <motion.button
      className={`
        relative
        px-4 py-5
        leading-loose
        min-h-[3rem]
        transition-colors duration-200 ease-out
        ${getVariantClasses()}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      disabled={disabled}
      onClick={onClick}
      // Hover efekty odstraněny - žádné animace při hover
      {...props}
    >
      {children}
    </motion.button>
  );
};

export default FramerButton;
