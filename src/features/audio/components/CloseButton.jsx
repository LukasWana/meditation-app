import React from 'react';

const CloseButton = ({
  onClose,
  className = "w-12 h-12"
}) => {
  return (
    <button
      onClick={onClose}
      className={`${className} rounded-full bg-white/30 backdrop-blur-sm border border-black/20 flex items-center justify-center hover:bg-white/40 transition-colors`}
    >
      <span className="text-2xl font-bold text-black">×</span>
    </button>
  );
};

export default CloseButton;
