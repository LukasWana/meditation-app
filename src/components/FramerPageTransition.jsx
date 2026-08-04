import React from 'react';

/**
 * FramerPageTransition - zjednodušená verze bez animací
 * Animace se nyní řídí z PageManager pomocí globální konfigurace (@config/motion.js)
 */
const FramerPageTransition = ({ children, screenKey: _screenKey }) => {
  return (
    <div className="w-full h-full max-w-full overflow-x-hidden">
      {children}
    </div>
  );
};

export default FramerPageTransition;
