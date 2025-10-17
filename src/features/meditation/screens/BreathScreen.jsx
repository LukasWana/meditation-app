import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause } from 'lucide-react';
import { FramerSection, FramerPageTransition, BackButton, FramerButton } from '@components';

const BreathScreen = ({
  breathPhase,
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [localBreathPhase, setLocalBreathPhase] = useState('in');

  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setLocalBreathPhase(prev => {
          if (prev === 'in') return 'hold';
          if (prev === 'hold') return 'out';
          return 'in';
        });
      }, 4000);
    } else {
      setLocalBreathPhase('in');
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isPlaying]);

  const getBreathText = () => {
    if (localBreathPhase === 'in') return 'nadýchni sa';
    if (localBreathPhase === 'hold') return 'podrž';
    return 'vydýchni';
  };

  return (
    <FramerPageTransition screenKey="breath">
      <div
        className="min-h-screen w-full max-w-full bg-[#f4ddc4] flex flex-col items-center justify-center p-2 sm:p-8 pb-20 overflow-x-hidden relative"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <BackButton onClick={() => onNavigateToScreen('home')} />

        <FramerSection
          className="text-center mb-20 mt-16"
          animationType="fadeIn"
          delay={0.1}
        >
          <h2 className="text-5xl font-light mb-8" style={{fontFamily: 'Playfair Display'}}>
            dýchanie
          </h2>

          <div className="relative mb-16 flex items-center justify-center h-80 p-8">
            <motion.div
              className="w-48 h-48 rounded-full bg-black/10"
              animate={isPlaying ? {
                scale: [0.3, 1.25, 1.25, 1.25, 0.3, 0.3],
                opacity: [1, 1, 0.8, 0.8, 1, 1]
              } : {
                scale: 0.3,
                opacity: 1
              }}
              transition={isPlaying ? {
                duration: 12,
                ease: "easeInOut",
                repeat: Infinity,
                times: [0, 0.33, 0.5, 0.67, 0.83, 1]
              } : {
                duration: 0.5,
                ease: "easeOut"
              }}
            />
          </div>

          <motion.p
            className="text-5xl font-light mb-4"
            style={{fontFamily: 'Playfair Display'}}
            key={localBreathPhase}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isPlaying ? 1 : 0.5, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {isPlaying ? getBreathText() : 'klikni play'}
          </motion.p>

          <div className="mt-8 flex justify-center">
            <FramerButton
              onClick={() => setIsPlaying(!isPlaying)}
              variant="rounded"
              className="w-16 h-16 rounded-full flex items-center justify-center p-0"
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </FramerButton>
          </div>
                  <p className="text-gray-600 text-lg" style={{fontFamily: 'Playfair Display'}}>
                    4 sekundy
                  </p>
                </FramerSection>

              </div>
    </FramerPageTransition>
  );
};

export default BreathScreen;
