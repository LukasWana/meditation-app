import React from 'react';

const CloseButton = ({
  onClose,
  className = "w-10 h-10"
}) => {
  return (
    <button
      onClick={onClose}
      className={`${className} rounded-full bg-white/20 backdrop-blur-sm border border-black/10 flex items-center justify-center hover:bg-white/30 transition-colors`}
    >
      <span className="text-lg">×</span>
    </button>
  );
};

export default CloseButton;
