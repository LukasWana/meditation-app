import React from 'react';

const SURFACE_CLASS = {
  card: 'surface-card',
  inner: 'surface-inner',
};

export const Card = ({
  variant = 'card',
  className = '',
  children,
  ...rest
}) => {
  const base = SURFACE_CLASS[variant] ?? SURFACE_CLASS.card;
  const classes = `${base} ${className}`.trim();

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
};

export default Card;