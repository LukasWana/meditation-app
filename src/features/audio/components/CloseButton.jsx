import React from 'react';
import { useTheme } from '@hooks/useTheme';

const CloseButton = ({
  onClose,
  className = "w-12 h-12",
  isDarkMode = false // New prop
}) => {
  const theme = useTheme();
  const bgColor = isDarkMode ? theme.colors.overlay.white20 : theme.colors.overlay.white30;
  const borderColor = isDarkMode ? theme.colors.overlay.white20 : theme.colors.overlay.black20;
  const textColor = isDarkMode ? theme.colors.white : theme.colors.black;
  const hoverBg = isDarkMode ? theme.colors.overlay.white30 : theme.colors.overlay.white40;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation(); // Zabraň propagaci kliknutí
        e.preventDefault(); // Zabraň výchozímu chování
        if (onClose) {
          onClose();
        }
      }}
      className={`${className} rounded-full backdrop-blur-sm border flex items-center justify-center transition-colors cursor-pointer relative pointer-events-auto`}
      style={{
        backgroundColor: bgColor,
        borderColor: borderColor,
        zIndex: theme.zIndex.dropdown
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = hoverBg;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = bgColor;
      }}
      type="button"
    >
      <span
        className="text-2xl font-bold pointer-events-none"
        style={{ color: textColor }}
      >
        ×
      </span>
    </button>
  );
};

export default CloseButton;
