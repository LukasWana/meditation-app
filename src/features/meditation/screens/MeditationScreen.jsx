import React from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { FramerButton, FramerSection, FramerMeditationCircle, FramerPageTransition, BackButton } from '@components';

const MeditationScreen = ({
  time,
  selectedDuration,
  isPlaying,
  onDurationChange,
  onPlayPause,
  onReset,
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd
}) => {
  return (
    <FramerPageTransition screenKey="meditation">
      <div
        className="min-h-screen w-full max-w-full bg-[#f4ddc4] flex flex-col items-center justify-center p-8 pb-20 overflow-x-hidden relative"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <BackButton onClick={() => onNavigateToScreen('home')} />

        <div className="max-w-md w-full mt-16">
          <FramerSection
            className="text-center mb-16"
            animationType="fadeIn"
            delay={0.1}
          >
            <h1 className="text-5xl font-light mb-2" style={{fontFamily: 'Playfair Display'}}>
              meditácia
            </h1>
            <div className="flex justify-center gap-2 mt-4">
              <div className="w-2 h-2 bg-black rounded-full"></div>
              <div className="w-2 h-2 bg-black rounded-full"></div>
              <div className="w-2 h-2 bg-black rounded-full"></div>
            </div>
          </FramerSection>

          <FramerSection
            className="mb-12"
            animationType="scaleIn"
            delay={0.2}
          >
            <FramerMeditationCircle
              time={time}
              totalTime={selectedDuration * 60}
              isPlaying={isPlaying}
            />
          </FramerSection>

          {!isPlaying && time === selectedDuration * 60 && (
            <FramerSection
              className="flex justify-center gap-4 mb-12"
              animationType="fadeIn"
              delay={0.3}
            >
              {[5, 10, 15, 20].map((mins, index) => (
                <FramerButton
                  key={mins}
                  onClick={() => onDurationChange(mins)}
                  variant={selectedDuration === mins ? 'rounded' : 'secondary'}
                  className="w-16 h-16 rounded-full flex items-center justify-center p-0"
                >
                  <span style={{fontFamily: 'Playfair Display'}}>
                    {mins}
                  </span>
                </FramerButton>
              ))}
            </FramerSection>
          )}

          <FramerSection
            className="flex justify-center gap-6"
            animationType="fadeIn"
            delay={0.4}
          >
            <FramerButton
              onClick={onPlayPause}
              variant="rounded"
              className="w-20 h-20 rounded-full flex items-center justify-center p-0"
            >
              {isPlaying ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
            </FramerButton>
            <FramerButton
              onClick={onReset}
              variant="secondary"
              className="w-20 h-20 rounded-full flex items-center justify-center p-0"
            >
              <RotateCcw size={28} />
            </FramerButton>
          </FramerSection>

        </div>
      </div>
    </FramerPageTransition>
  );
};

export default MeditationScreen;
