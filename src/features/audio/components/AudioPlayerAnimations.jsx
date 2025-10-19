import React from 'react';
import { motion } from 'framer-motion';

/**
 * Komponenta pro animace AudioPlayer
 * Obsahuje všechny animační definice a styly
 */
export const AudioPlayerAnimations = ({
  children,
  albumCover,
  className = "",
  onClose,
  fadeOutAndClose
}) => {
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
        className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden"
        style={{
          backgroundColor: albumCover ? 'rgba(244, 221, 196, 0.7)' : '#f4ddc4'
        }}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{
          duration: 0.4,
          ease: "easeOut",
          type: "spring",
          stiffness: 200,
          damping: 25
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Album cover background */}
        {albumCover && (
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${albumCover})`,
              filter: 'blur(80px) brightness(1)',
              opacity: 1
            }}
          />
        )}

        {/* Side bars for wide screens */}
        <div className="hidden lg:block absolute inset-0 pointer-events-none z-5">
          <div className="absolute left-0 top-0 w-[calc((100vw-600px)/2)] h-full bg-gradient-to-r from-[#f4ddc4]/70 to-transparent"></div>
          <div className="absolute right-0 top-0 w-[calc((100vw-600px)/2)] h-full bg-gradient-to-l from-[#f4ddc4]/70 to-transparent"></div>
        </div>

        {/* Content overlay */}
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
};
