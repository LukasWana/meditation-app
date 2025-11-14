import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAnimationConfig } from '@hooks/useAnimationConfig';
import { useAnimationControl } from '@contexts/AnimationContext';

const AnimatedText = ({
  children,
  delay = 0,
  className = '',
  style = {}
}) => {
  const config = useAnimationConfig();
  const { isActive } = useAnimationControl();

  const animation = useMemo(() => {
    const baseAnim = config.textAnimations.default;
    return {
      ...baseAnim,
      animate: {
        ...baseAnim.animate,
        transition: {
          ...baseAnim.animate.transition,
          delay: delay + baseAnim.animate.transition.delay,
        },
      },
    };
  }, [config.textAnimations, delay]);

  return (
    <motion.div
      className={`${className} py-4 leading-loose`}
      style={style}
      initial={isActive ? animation.initial : {}}
      animate={isActive ? animation.animate : {}}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedText;
