import React, { useRef, useEffect } from 'react';
import { touchAnimations, pageTransitions } from '../utils/simpleAnimations';

const AnimatedSection = ({
  children,
  className = '',
  onClick,
  animationType = 'fadeIn',
  touchFeedback = true,
  ...props
}) => {
  const sectionRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    // Animácia pri načítaní
    switch (animationType) {
      case 'fadeIn':
        pageTransitions.fadeIn(section);
        break;
      case 'slideInLeft':
        pageTransitions.slideInLeft(section);
        break;
      case 'slideInUp':
        pageTransitions.slideInUp(section);
        break;
      default:
        pageTransitions.fadeIn(section);
    }
  }, [animationType]);

  useEffect(() => {
    if (!touchFeedback || !onClick) return;

    const section = sectionRef.current;
    if (!section) return;

    const handleTouchStart = () => {
      touchAnimations.touchStart(section);
    };

    const handleTouchEnd = () => {
      touchAnimations.touchEnd(section);
    };

    const handleClick = (e) => {
      if (onClick) onClick(e);
    };

    section.addEventListener('touchstart', handleTouchStart, { passive: true });
    section.addEventListener('touchend', handleTouchEnd, { passive: true });
    section.addEventListener('click', handleClick);

    return () => {
      section.removeEventListener('touchstart', handleTouchStart);
      section.removeEventListener('touchend', handleTouchEnd);
      section.removeEventListener('click', handleClick);
    };
  }, [onClick, touchFeedback]);

  return (
    <div
      ref={sectionRef}
      className={className}
      {...props}
    >
      {children}
    </div>
  );
};

export default AnimatedSection;
