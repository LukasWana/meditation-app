import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAnimationConfig } from '@hooks/useAnimationConfig';
import { useAnimationControl } from '@contexts/AnimationContext';

const FramerPageTransition = ({
  children,
  screenKey,
  animation = 'fade'
}) => {
  const config = useAnimationConfig();
  const { isActive } = useAnimationControl();
  const variant = config.pageTransitionVariants[animation] || config.pageTransitionVariants.fade;
  const { initial, in: animate, out, transition } = variant;

  // Pokud jsou animace deaktivovány, použij instant transition
  const finalTransition = isActive ? transition : { duration: 0 };

  // Pro dýchací obrazovku deaktivuj AnimatePresence a animace - zabraňuje blikání při změně breathPhase
  const isDychaniScreen = screenKey === 'dychani';

  if (isDychaniScreen) {
    return (
      <div className="w-full h-full max-w-full overflow-x-hidden">
        {children}
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={screenKey}
        initial={isActive ? initial : {}}
        animate={isActive ? animate : {}}
        exit={isActive ? out : {}}
        transition={finalTransition}
        className="w-full h-full max-w-full overflow-x-hidden"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default FramerPageTransition;
