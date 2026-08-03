import React, { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import meditatebodySvg from '../../../assets/flags/meditatebody.svg';
import { useTheme } from '@contexts/ThemeContext';
import { useThemeColors } from '@hooks';
import { usePageVisible } from '@hooks/usePageVisible';

// Letter-by-letter reveal variants
const letterContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.4
    }
  }
};

const letter = {
  hidden: { opacity: 0, y: 20, rotateX: 90 },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 12
    }
  }
};

const IntroScreen = ({ onIntroComplete }) => {
  const [showIntro, setShowIntro] = useState(true);
  const { getScreenBackgroundColor, colorMode, customBackground, getBackgroundImageUrl, allowsCustomBackground, getBackgroundStyle } = useTheme();
  const { hasImage } = useThemeColors();
  const introCircleRef = useRef(null);

  // Zjistíme, zda téma očekává načtení obrázku, ale ještě není načten
  const isImageLoading = useMemo(() => {
    if (!allowsCustomBackground || !customBackground) return false;
    
    let data;
    try {
      data = typeof customBackground === 'string' ? JSON.parse(customBackground) : customBackground;
    } catch (e) {
      data = { url: customBackground };
    }
    
    // Pokud je to jen barva, není co načítat přes síť
    if (data.backgroundColor) return false;
    
    // Pokud máme URL pro obrázek, ale cacheService ho ještě nepředal (getBackgroundImageUrl je null)
    if ((data.url || data.downloadURL || data.firebasePath) && !getBackgroundImageUrl()) {
      return true; // Still loading!
    }
    return false;
  }, [customBackground, getBackgroundImageUrl, allowsCustomBackground]);

  // Nový stav pro řízení fází animace:
  // 1. 'waitingForBackground' - Zobrazí se jen barva pozadí a čeká se na fetch obrázku do cache.
  // 2. 'showBackground' - Obrázek se plynule prolne (fade in).
  // 3. 'animateLogo' - Spustí se exkluzivní animace loga.
  const [phase, setPhase] = useState('waitingForBackground');

  // Aurora blur blobs jsou nekonečná GPU animace — na pozadí je zbytečná
  const isPageVisible = usePageVisible();
  const shouldAnimateAurora = isPageVisible && phase === 'animateLogo';

  useEffect(() => {
    if (phase === 'waitingForBackground' && !isImageLoading) {
      setPhase('showBackground');
      
      // Pokud máme reálně obrázek na pozadí, dáme mu 600ms na luxusní fade-in.
      // Pokud tam obrázek vůbec není, zkrátíme prodlevu jen na neznatelných 100ms.
      const delay = hasImage ? 600 : 100;
      setTimeout(() => {
        setPhase('animateLogo');
      }, delay);
    }
  }, [isImageLoading, phase, hasImage]);

  useEffect(() => {
    // Zajistit, že se #root nemůže skrolovat během intro animace
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.style.overflowY = 'hidden';
    }

    let timer;
    if (phase === 'animateLogo') {
      // Časovač exit animace: 2.2s od startu animace loga.
      // (0.4s stagger + 0.54s poslední písmeno + 1.26s na vychutnání)
      timer = setTimeout(() => {
        setShowIntro(false);
        // Počkáme, až doběhne 600ms exit animace z AnimatePresence a předáme řízení
        setTimeout(() => {
          if (rootElement) {
            rootElement.style.overflowY = '';
          }
          onIntroComplete();
        }, 600);
      }, 2200);
    }

    // Vynutit, aby kruh byl vždy kulatý
    if (introCircleRef.current) {
      introCircleRef.current.style.setProperty('border-radius', '50%', 'important');
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (rootElement && !showIntro) {
        rootElement.style.overflowY = '';
      }
    };
  }, [phase, showIntro, onIntroComplete]);

  const isDarkMode = colorMode === 'dark';
  const displayTextColor = isDarkMode ? '#ffffff' : '#000000';
  const circleColor = isDarkMode ? 'rgba(0, 0, 0, 1)' : 'rgba(255, 255, 255, 1)';
  const bgStyle = getBackgroundStyle();

  // Aurora colors - jemné tóny, ne příliš saturated
  const auroraColors = isDarkMode
    ? ['rgba(120,119,198,0.3)', 'rgba(255,133,255,0.2)', 'rgba(94,129,235,0.25)']
    : ['rgba(180,160,255,0.4)', 'rgba(255,180,220,0.35)', 'rgba(160,200,255,0.4)'];

  // Rozdělení textu na písmena pro letter-by-letter animaci
  const textLetters = 'meditácia'.split('');

  return (
    <AnimatePresence mode="wait">
      {showIntro && (
        <motion.div
          className="w-full max-w-full flex flex-col items-center justify-center overflow-x-hidden overflow-y-hidden fixed inset-0 z-50"
          style={{
            backgroundColor: getScreenBackgroundColor(),
            height: '100dvh'
          }}
          // Kontejner sám o sobě se zjeví hned (opacity 1) aby překryl aplikaci
          // a na konci společně zmizí přes exit animaci
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Vrstva pro obrázek na pozadí - plynulé zobrazení až po načtení (fáze showBackground) */}
          {hasImage && bgStyle.backgroundImage && (
            <motion.div
              className="absolute inset-0 w-full h-full"
              style={{
                backgroundImage: bgStyle.backgroundImage,
                backgroundSize: bgStyle.backgroundSize,
                backgroundPosition: bgStyle.backgroundPosition,
                backgroundRepeat: bgStyle.backgroundRepeat,
                zIndex: 0
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: phase !== 'waitingForBackground' ? 1 : 0 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            />
          )}

          {/* Aurora layer - jemný pulsující glow efekt */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: 1 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === 'animateLogo' ? 1 : 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
          >
            {/* Aurora blob 1 - top-left */}
            <motion.div
              className="absolute rounded-full blur-3xl"
              style={{
                top: '10%',
                left: '5%',
                width: '50%',
                height: '50%',
                background: `radial-gradient(circle, ${auroraColors[0]} 0%, transparent 70%)`,
                willChange: 'transform, opacity'
              }}
              animate={shouldAnimateAurora ? {
                scale: [1, 1.2, 1],
                opacity: [0.4, 0.7, 0.4],
                x: [0, 20, 0],
                y: [0, -15, 0]
              } : { scale: 1, opacity: 0.4, x: 0, y: 0 }}
              transition={shouldAnimateAurora ? {
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              } : { duration: 0 }}
            />
            {/* Aurora blob 2 - bottom-right */}
            <motion.div
              className="absolute rounded-full blur-3xl"
              style={{
                bottom: '15%',
                right: '10%',
                width: '60%',
                height: '60%',
                background: `radial-gradient(circle, ${auroraColors[1]} 0%, transparent 70%)`,
                willChange: 'transform, opacity'
              }}
              animate={shouldAnimateAurora ? {
                scale: [1.2, 1, 1.2],
                opacity: [0.3, 0.6, 0.3],
                x: [0, -25, 0],
                y: [0, 20, 0]
              } : { scale: 1.2, opacity: 0.3, x: 0, y: 0 }}
              transition={shouldAnimateAurora ? {
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5
              } : { duration: 0 }}
            />
            {/* Aurora blob 3 - center, subtle */}
            <motion.div
              className="absolute rounded-full blur-3xl"
              style={{
                top: '40%',
                left: '50%',
                width: '40%',
                height: '40%',
                transform: 'translate(-50%, -50%)',
                background: `radial-gradient(circle, ${auroraColors[2]} 0%, transparent 70%)`,
                willChange: 'transform, opacity'
              }}
              animate={shouldAnimateAurora ? {
                scale: [1, 1.3, 1],
                opacity: [0.2, 0.4, 0.2]
              } : { scale: 1, opacity: 0.2 }}
              transition={shouldAnimateAurora ? {
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1
              } : { duration: 0 }}
            />
          </motion.div>

          {/* Vrstva pro animaci samotného Loga - čeká až na fázi animateLogo */}
          <div className="relative z-10 flex flex-col items-center justify-center w-full">
            <AnimatePresence>
              {phase === 'animateLogo' && (
                <motion.div
                  className="flex flex-col items-center justify-center"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <motion.div className="relative flex items-center justify-center mb-5">
                    {/* Bílý kruh - materialize efekt (scale + blur→focus) */}
                    <motion.div
                      ref={introCircleRef}
                      className="absolute w-36 h-36 rounded-full intro-animation-circle z-0"
                      style={{ backgroundColor: circleColor, borderRadius: '50%', willChange: 'transform, opacity' }}
                      initial={{ scale: 0, opacity: 0, filter: 'blur(20px)' }}
                      animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                    />

                    {/* SVG silueta meditujícího člověka - čistě, bez masky, necháme ji volně plout nad kruhem */}
                    <motion.div className="relative z-10 w-48 h-auto">
                      <motion.img
                        src={meditatebodySvg}
                        alt="Meditující osoba"
                        className="w-48 h-auto"
                        initial={{ scale: 0.8, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                        style={{ willChange: 'transform, opacity', filter: isDarkMode ? 'invert(1)' : 'none' }}
                      />
                    </motion.div>
                  </motion.div>

                  {/* Text "Meditácia" - letter-by-letter reveal */}
                  <motion.h1
                    className="text-6xl font-light tracking-normal flex"
                    style={{ color: displayTextColor, fontSize: '3.2rem', perspective: 400 }}
                    variants={letterContainer}
                    initial="hidden"
                    animate="visible"
                  >
                    {textLetters.map((char, index) => (
                      <motion.span
                        key={index}
                        variants={letter}
                        style={{
                          display: 'inline-block',
                          transformOrigin: 'bottom',
                          willChange: 'transform, opacity'
                        }}
                      >
                        {char}
                      </motion.span>
                    ))}
                  </motion.h1>

                  {/* Subtitle fade-in po textu */}
                  <motion.p
                    className="text-lg font-light tracking-widest mt-2 opacity-60"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.6 }}
                    transition={{ duration: 0.6, delay: 1.2, ease: "easeOut" }}
                    style={{ color: displayTextColor }}
                  >
                    nájdi svoj pokoj
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default IntroScreen;
