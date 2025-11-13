import React from 'react';
import { motion } from 'framer-motion';

export const AudioPlayerAnimations = ({
  children,
  albumCover,
  backgroundColor = null, // Barva pozadí přehrávače (má prioritu před album cover)
  className = "",
  sectionKey = null // Klíč sekce - album cover se zobrazuje pouze v sekci 'hudba'
}) => {
  // Overlay pozadí - pokud je barva, úplně transparentní, jinak velmi průhledné, aby shader prosvítal
  const overlayBackgroundStyle = backgroundColor
    ? { backgroundColor: 'rgba(0, 0, 0, 0.0)' } // Úplně transparentní overlay, pokud je barva
    : { backgroundColor: 'rgba(0, 0, 0, 0.02)' }; // Velmi průhledné pozadí (sníženo z 0.05 na 0.02), aby shader více prosvítal

  return (
    <>
      {/* Barva pozadí přehrávače - samostatný element s nižším z-index než shader, aby shader prosvítal */}
      {backgroundColor && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 7000, // Pod shaderem (zIndex 8000), ale nad základním pozadím (zIndex 0)
            backgroundColor: backgroundColor,
            opacity: 0.5, // Průhlednost, aby shader více prosvítal (sníženo z 0.7 na 0.5)
            pointerEvents: 'none'
          }}
        />
      )}

      <motion.div
        className={`fixed inset-0 ${backgroundColor ? '' : ''} flex items-center justify-center z-50 pointer-events-auto ${className}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          ...overlayBackgroundStyle,
          backgroundColor: 'transparent' // Kontejner přehrávače je průhledný, barva je v samostatném divu
        }}
      >
        {/* Responsive Player Container */}
        <motion.div
          className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden"
          style={{ backgroundColor: 'transparent' }} // Kontejner je průhledný, barva je v samostatném divu
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
      >
        {/* Album cover background - zobraz POUZE v sekci hudba */}
        {albumCover && sectionKey === 'hudba' && typeof albumCover === 'string' && albumCover.trim() !== '' && (
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${albumCover})`,
              filter: 'blur(80px) brightness(1)',
              opacity: 1
            }}
          />
        )}

        {/* Side bars for wide screens - zobraz pouze pokud není nastavena barva pozadí */}
        {!backgroundColor && (
          <div className="hidden lg:block absolute inset-0 pointer-events-none z-5">
            <div className="absolute left-0 top-0 w-[calc((100vw-600px)/2)] h-full bg-gradient-to-r from-[#f4ddc4]/30 to-transparent"></div>
            <div className="absolute right-0 top-0 w-[calc((100vw-600px)/2)] h-full bg-gradient-to-l from-[#f4ddc4]/30 to-transparent"></div>
          </div>
        )}

        {/* Content overlay */}
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
          {children}
        </div>
      </motion.div>
    </motion.div>
    </>
  );
};
