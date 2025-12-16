import React from 'react';
import { useTheme } from '@contexts/ThemeContext';

/**
 * Kontejner s automatickým pozadím z tématu
 * Používá se pro obrazovky, které potřebují konzistentní pozadí
 */
const ThemedContainer = ({
  children,
  className = '',
  style = {},
  ...props
}) => {
  const { getScreenBackgroundColor, getBackgroundStyle, getBackgroundImageUrl, allowsCustomBackground } = useTheme();
  const backgroundUrl = getBackgroundImageUrl();
  const hasImage = !!backgroundUrl && allowsCustomBackground;
  const bgStyle = getBackgroundStyle();

  return (
    <div
      className={className}
      style={{
        backgroundColor: getScreenBackgroundColor(),
        ...(hasImage && bgStyle.backgroundImage ? {
          backgroundImage: bgStyle.backgroundImage,
          backgroundSize: bgStyle.backgroundSize,
          backgroundPosition: bgStyle.backgroundPosition,
          backgroundRepeat: bgStyle.backgroundRepeat
        } : {}),
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  );
};

export default ThemedContainer;

