import React from 'react';
import { motion } from 'framer-motion';
import { useAnimationConfig } from '@hooks/useAnimationConfig';
import { useAnimationControl } from '@contexts/AnimationContext';
import { useTheme } from '@hooks/useTheme';

export const AudioPlayerAnimations = ({
  children,
  albumCover,
  backgroundColor = null, // Barva pozadí přehrávače (má prioritu před album cover)
  className = "",
  sectionKey = null // Klíč sekce - album cover se zobrazuje pouze v sekci 'hudba'
}) => {
  const config = useAnimationConfig();
  const { isActive } = useAnimationControl();
  const theme = useTheme();

  // Zkontroluj, zda má být zobrazeno album cover
  const hasAlbumCover = albumCover && sectionKey === 'hudba' && typeof albumCover === 'string' && albumCover.trim() !== '';

  // Overlay pozadí - pokud je barva nebo album cover, úplně transparentní, jinak velmi průhledné, aby shader prosvítal
  // Stejně jako v MeditaceScreen - pouze minimální průhlednost pro lepší viditelnost shaderu
  const overlayBackgroundStyle = backgroundColor || hasAlbumCover
    ? { backgroundColor: 'rgba(0, 0, 0, 0.0)' } // Úplně transparentní overlay, pokud je barva nebo album cover
    : { backgroundColor: 'rgba(0, 0, 0, 0.02)' }; // Velmi průhledné pozadí (stejně jako původně), aby shader více prosvítal

  const overlayAnim = config.audioPlayerAnimations.overlay;
  const containerAnim = config.audioPlayerAnimations.container;

  // Pokud jsou animace deaktivovány, použij instant transition
  const overlayTransition = isActive ? overlayAnim.transition : { duration: 0 };
  const containerTransition = isActive ? containerAnim.transition : { duration: 0 };

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
            zIndex: 7000, // Pod shaderem (zIndex 2), ale nad základním pozadím (zIndex 0)
            backgroundColor: backgroundColor,
            opacity: 0.5, // Průhlednost, aby shader více prosvítal (sníženo z 0.7 na 0.5)
            pointerEvents: 'none'
          }}
        />
      )}

      <motion.div
        className={`fixed inset-0 ${backgroundColor ? '' : ''} flex items-center justify-center z-50 pointer-events-auto ${className}`}
        initial={isActive ? overlayAnim.initial : {}}
        animate={isActive ? overlayAnim.animate : {}}
        exit={isActive ? overlayAnim.exit : {}}
        transition={overlayTransition}
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
          initial={isActive ? containerAnim.initial : {}}
          animate={isActive ? containerAnim.animate : {}}
          exit={isActive ? containerAnim.exit : {}}
          transition={containerTransition}
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
                  <div
                    className="absolute left-0 top-0 w-[calc((100vw-600px)/2)] h-full bg-gradient-to-r to-transparent"
                    style={{ backgroundImage: `linear-gradient(to right, ${theme.colors.overlay.primary30}, transparent)` }}
                  ></div>
                  <div
                    className="absolute right-0 top-0 w-[calc((100vw-600px)/2)] h-full bg-gradient-to-l to-transparent"
                    style={{ backgroundImage: `linear-gradient(to left, ${theme.colors.overlay.primary30}, transparent)` }}
                  ></div>
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
