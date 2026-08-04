import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { headingEntrance } from '@config/motion';

const VISUAL_CLASS = {
  display: 'text-display',
  1: 'heading-1',
  2: 'heading-2',
  3: 'heading-3',
  4: 'heading-3',
};

export const Heading = ({
  level = 1,
  visual,
  className = '',
  animate = true,
  children,
  ...rest
}) => {
  const Tag = `h${level}`;
  const base = VISUAL_CLASS[visual ?? level] ?? VISUAL_CLASS[1];
  const classes = `${base} ${className}`.trim();
  const reduceMotion = useReducedMotion();

  if (!animate || reduceMotion) {
    return <Tag className={classes} {...rest}>{children}</Tag>;
  }

  const MotionTag = motion[Tag];
  return (
    <MotionTag className={classes} {...headingEntrance} {...rest}>
      {children}
    </MotionTag>
  );
};

export default Heading;