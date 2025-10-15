import React from 'react';
import { motion } from 'framer-motion';

const FramerButton = ({
  children,
  onClick,
  className = '',
  variant = 'primary',
  disabled = false,
  ...props
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-black text-white hover:bg-gray-800';
      case 'secondary':
        return 'bg-white border-2 border-black text-black hover:bg-gray-100';
      case 'ghost':
        return 'bg-transparent border-2 border-black/20 text-black hover:bg-black/5';
      case 'rounded':
        return 'bg-black text-white rounded-full hover:bg-gray-800';
      default:
        return 'bg-black text-white hover:bg-gray-800';
    }
  };

  return (
    <motion.button
      className={`
        relative overflow-hidden
        transition-colors duration-200 ease-out
        ${getVariantClasses()}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      disabled={disabled}
      onClick={onClick}
      whileHover={!disabled ? {
        scale: 1.05,
        transition: { type: "spring", stiffness: 300, damping: 20 }
      } : {}}
      whileTap={!disabled ? {
        scale: 0.95,
        transition: { type: "spring", stiffness: 400, damping: 25 }
      } : {}}
      animate={!disabled ? {
        scale: 1,
        transition: { type: "spring", stiffness: 300, damping: 25 }
      } : {}}
      {...props}
    >
      {children}
    </motion.button>
  );
};

export default FramerButton;
