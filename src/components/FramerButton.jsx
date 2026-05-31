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
    // Všechny tlačítka používají glassmorphism styl pro sjednocení designu bez tvrdých outlineů
    switch (variant) {
      case 'primary':
        return 'glass-button font-medium';
      case 'secondary':
        return 'glass-button font-normal opacity-90';
      case 'ghost':
        return 'glass-button font-light opacity-80 border-opacity-50';
      case 'rounded':
        return 'glass-button rounded-full';
      default:
        return 'glass-button';
    }
  };

  // Filtrovat props, které by neměly být předány do DOM
  const {
    key: _key, // key by neměl být předán jako prop
    ...domProps
  } = props;

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
      {...domProps}
    >
      {children}
    </motion.button>
  );
};

export default FramerButton;
