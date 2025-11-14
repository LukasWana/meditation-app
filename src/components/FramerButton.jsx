import React from 'react';
import { motion } from 'framer-motion';
import { useAnimationConfig } from '@hooks/useAnimationConfig';
import { useAnimationControl } from '@contexts/AnimationContext';
import { getButtonClasses } from '@hooks/useTheme';

const FramerButton = ({
  children,
  onClick,
  className = '',
  variant = 'primary',
  disabled = false,
  ...props
}) => {
  const config = useAnimationConfig();
  const { isActive } = useAnimationControl();

  const variantClasses = getButtonClasses(variant, disabled);

  return (
    <motion.button
      className={`
        relative
        px-4 py-5
        leading-loose
        min-h-[3rem]
        ${config.buttonAnimations.cssTransition}
        ${variantClasses}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      disabled={disabled}
      onClick={onClick}
      whileHover={!disabled && isActive ? config.buttonAnimations.hover : {}}
      whileTap={!disabled && isActive ? config.buttonAnimations.tap : {}}
      animate={!disabled && isActive ? config.buttonAnimations.animate : {}}
      {...props}
    >
      {children}
    </motion.button>
  );
};

export default FramerButton;
