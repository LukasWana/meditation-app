import React, { useRef, useEffect } from 'react';
import { buttonAnimations, touchAnimations } from '../utils/simpleAnimations';

const AnimatedButton = ({
  children,
  onClick,
  className = '',
  variant = 'primary',
  disabled = false,
  ...props
}) => {
  const buttonRef = useRef(null);

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    const handleMouseEnter = () => {
      if (!disabled) {
        buttonAnimations.hoverIn(button);
      }
    };

    const handleMouseLeave = () => {
      if (!disabled) {
        buttonAnimations.hoverOut(button);
      }
    };

    const handleClick = (e) => {
      if (disabled) return;

      buttonAnimations.ripple(button, e);
      buttonAnimations.click(button);

      setTimeout(() => {
        if (onClick) onClick(e);
      }, 150);
    };

    const handleTouchStart = () => {
      if (!disabled) {
        touchAnimations.touchStart(button);
      }
    };

    const handleTouchEnd = () => {
      if (!disabled) {
        touchAnimations.touchEnd(button);
      }
    };

    // Pridanie event listenerov
    button.addEventListener('mouseenter', handleMouseEnter);
    button.addEventListener('mouseleave', handleMouseLeave);
    button.addEventListener('click', handleClick);
    button.addEventListener('touchstart', handleTouchStart, { passive: true });
    button.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      button.removeEventListener('mouseenter', handleMouseEnter);
      button.removeEventListener('mouseleave', handleMouseLeave);
      button.removeEventListener('click', handleClick);
      button.removeEventListener('touchstart', handleTouchStart);
      button.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onClick, disabled]);

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
    <button
      ref={buttonRef}
      className={`
        relative overflow-hidden
        transition-all duration-200 ease-out
        ${getVariantClasses()}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

export default AnimatedButton;
