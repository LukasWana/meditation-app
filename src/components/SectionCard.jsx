import React from 'react';
import { useThemeColors } from '@hooks';

/**
 * Karta sekce s automatickým pozadím podle tématu
 * Používá se pro sekce na HomeScreen a dalších obrazovkách
 */
const SectionCard = ({
  children,
  isPrimary = false,
  className = '',
  style = {},
  onClick,
  onTouchStart,
  ...props
}) => {
  const { getSectionBackgroundColor, getTextColor } = useThemeColors();

  return (
    <div
      className={className}
      style={{
        backgroundColor: getSectionBackgroundColor(isPrimary),
        color: getTextColor(),
        ...style
      }}
      onClick={onClick}
      onTouchStart={onTouchStart}
      {...props}
    >
      {children}
    </div>
  );
};

export default SectionCard;

