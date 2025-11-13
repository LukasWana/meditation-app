import React from 'react';

const CloseButton = ({
  onClose,
  className = "w-12 h-12",
  isDarkMode = false // New prop
}) => {
  const bgColor = isDarkMode ? 'bg-white/20' : 'bg-white/30';
  const borderColor = isDarkMode ? 'border-white/20' : 'border-black/20';
  const textColor = isDarkMode ? 'text-white' : 'text-black';
  const hoverBg = isDarkMode ? 'hover:bg-white/30' : 'hover:bg-white/40';

  return (
    <button
      onClick={(e) => {
        e.stopPropagation(); // Zabraň propagaci kliknutí
        e.preventDefault(); // Zabraň výchozímu chování
        if (onClose) {
          onClose();
        }
      }}
      className={`${className} rounded-full ${bgColor} backdrop-blur-sm border ${borderColor} flex items-center justify-center ${hoverBg} transition-colors cursor-pointer z-[100] relative pointer-events-auto`}
      type="button"
    >
      <span className={`text-2xl font-bold ${textColor} pointer-events-none`}>×</span>
    </button>
  );
};

export default CloseButton;
