import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

const FramerSection = ({
  children,
  className = '',
  onClick,
  animationType = 'fadeIn',
  delay = 0,
  ...props
}) => {
  const variants = useMemo(() => {
    // Všechny animace používají pouze fade (prolnutí) bez posunů
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 }
    };
  }, [animationType]);

  const transition = useMemo(() => {
    return {
      duration: 0.2,
      delay: delay,
      ease: "easeInOut"
    };
  }, [delay, animationType]);

  // Filtrovat props, které by neměly být předány do DOM
  const {
    key: _key, // key by neměl být předán jako prop
    ...domProps
  } = props;

  return (
    <motion.div
      className={`${className} max-w-full`}
      onClick={onClick}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      transition={transition}
      // Hover efekty odstraněny - žádné animace při hover
      {...domProps}
    >
      {children}
    </motion.div>
  );
};

export default FramerSection;
