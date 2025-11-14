import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAnimationConfig } from '@hooks/useAnimationConfig';
import { useAnimationControl } from '@contexts/AnimationContext';

const FramerSection = ({
  children,
  className = '',
  onClick,
  animationType = 'fadeIn',
  delay = 0,
  ...props
}) => {
  const config = useAnimationConfig();
  const { isActive } = useAnimationControl();

  const variants = useMemo(() => {
    // Mapování názvů animací na klíče v konfiguraci
    const variantMap = {
      'fadeIn': 'fadeIn',
      'slideInLeft': 'slideInLeft',
      'slideInUp': 'slideInUp',
      'scaleIn': 'scaleIn',
      'slideInTop': 'slideInTop',
    };
    const variantKey = variantMap[animationType] || 'fadeIn';
    return config.sectionVariants[variantKey] || config.sectionVariants.fadeIn;
  }, [animationType, config.sectionVariants]);

  const transition = useMemo(() => {
    if (animationType === 'slideInTop') {
      return {
        delay: delay,
        ...config.sectionTransitions.slideInTop,
      };
    }

    return {
      ...config.sectionTransitions.default,
      delay: delay,
    };
  }, [delay, animationType, config.sectionTransitions]);

  // Pokud jsou animace deaktivovány, použij instant transition
  const finalTransition = isActive ? transition : { duration: 0 };
  const finalVariants = isActive ? variants : {
    initial: {},
    animate: {},
    exit: {},
  };

  return (
    <motion.div
      className={`${className} max-w-full overflow-x-hidden`}
      onClick={onClick}
      initial={isActive ? "initial" : false}
      animate={isActive ? "animate" : false}
      exit={isActive ? "exit" : false}
      variants={finalVariants}
      transition={finalTransition}
      whileHover={onClick && isActive ? config.sectionInteractions.hover : {}}
      whileTap={onClick && isActive ? config.sectionInteractions.tap : {}}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default FramerSection;
