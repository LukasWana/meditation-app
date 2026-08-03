import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@contexts/ThemeContext';

export const AudioPlayerAnimations = ({
  children,
  albumCover,
  className = "",
  onClose,
  fadeOutAndClose
}) => {
  const { getBackgroundStyle, getScreenBackgroundColor } = useTheme();
  const backgroundStyle = getBackgroundStyle();
  const backgroundColor = getScreenBackgroundColor() || '#f4ddc4';

  return (
    <motion.div
      className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 pointer-events-auto ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999
      }}
    >
      {/* Responsive Player Container */}
      <motion.div
        className="w-full h-full sm:w-[95vw] sm:max-w-4xl sm:h-[90vh] sm:max-h-[800px] sm:rounded-[2rem] flex flex-col items-center justify-center relative overflow-hidden glass-modal shadow-2xl border-0 sm:border border-white/20"
        style={{
          paddingTop: 'calc(1.5rem + env(safe-area-inset-top, 0px))',
          paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
          // Pokud má album vlastní obrázek, použij pozadí z tématu pouze jako fallback
          // Jinak použij pozadí z tématu (obrázek nebo barvu)
          ...(albumCover ? {} : (backgroundStyle?.backgroundImage ? {
            backgroundImage: backgroundStyle.backgroundImage,
            backgroundSize: backgroundStyle.backgroundSize || 'cover',
            backgroundPosition: backgroundStyle.backgroundPosition || 'center center',
            backgroundRepeat: backgroundStyle.backgroundRepeat || 'no-repeat'
          } : {})),
          backgroundColor: albumCover
            ? `${backgroundColor}B3`
            : (backgroundStyle?.backgroundColor || backgroundColor)
        }}
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{
          duration: 0.4,
          ease: "easeOut",
          type: "spring",
          stiffness: 200,
          damping: 25
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Album cover background - má přednost před pozadím z tématu */}
        {albumCover && (
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${albumCover})`,
              opacity: 1
            }}
          />
        )}

        {/* Side bars for wide screens */}
        <div className="hidden lg:block absolute inset-0 pointer-events-none z-5">
          <div
            className="absolute left-0 top-0 w-[calc((100vw-600px)/2)] h-full bg-gradient-to-r to-transparent"
            style={{
              background: `linear-gradient(to right, ${backgroundStyle?.backgroundColor || backgroundColor}B3, transparent)`
            }}
          ></div>
          <div
            className="absolute right-0 top-0 w-[calc((100vw-600px)/2)] h-full bg-gradient-to-l to-transparent"
            style={{
              background: `linear-gradient(to left, ${backgroundStyle?.backgroundColor || backgroundColor}B3, transparent)`
            }}
          ></div>
        </div>

        {/* Content overlay */}
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
};
