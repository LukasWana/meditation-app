import React from 'react';

const VARIANT_CLASS = {
  primary: '',
  ghost: 'opacity-80',
  text: 'bg-transparent border-none shadow-none',
};

export const Button = ({
  variant = 'primary',
  className = '',
  disabled = false,
  children,
  ...rest
}) => {
  const variantClass = VARIANT_CLASS[variant] ?? VARIANT_CLASS.primary;
  const classes = [
    'interactive',
    'rounded-theme-button',
    variantClass,
    disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button className={classes} disabled={disabled} {...rest}>
      {children}
    </button>
  );
};

export default Button;