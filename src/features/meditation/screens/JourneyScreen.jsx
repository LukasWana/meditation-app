import React from 'react';
import { motion } from 'framer-motion';
import { FramerButton, FramerSection, FramerPageTransition, BackButton } from '@components';

const JourneyScreen = ({
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd
}) => {
  const journeyItems = [
    { time: '3 min', title: 'ranné prebudenie' },
    { time: '5 min', title: 'prestávka v práci' },
    { time: '7 min', title: 'večerné uvoľnenie' },
    { time: '10 min', title: 'pred spánkom' }
  ];

  return (
    <FramerPageTransition screenKey="journey">
      <div
        className="min-h-screen w-full max-w-full bg-[#f4ddc4] flex flex-col items-center justify-center p-8 pb-20 overflow-x-hidden relative"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <BackButton onClick={() => onNavigateToScreen('home')} />

        <div className="max-w-md w-full mt-16">
          <FramerSection
            className="text-center mb-8"
            animationType="fadeIn"
            delay={0.1}
          >
            <h1 className="text-6xl font-light" style={{fontFamily: 'Playfair Display'}}>
              na cesty
            </h1>
            <p className="text-xl text-gray-700 mt-4" style={{fontFamily: 'Playfair Display'}}>
              krátke meditácie do každého dňa
            </p>
          </FramerSection>

          <div className="space-y-4">
            {journeyItems.map((item, idx) => (
              <FramerSection
                key={idx}
                animationType="slideInUp"
                delay={0.2 + idx * 0.1}
              >
                <FramerButton
                  variant="ghost"
                  className="w-full p-6 text-left bg-white/50 backdrop-blur rounded-none border border-black/10"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1" style={{fontFamily: 'Playfair Display'}}>
                        {item.time}
                      </p>
                      <h3 className="text-2xl font-light" style={{fontFamily: 'Playfair Display'}}>
                        {item.title}
                      </h3>
                    </div>
                  </div>
                </FramerButton>
              </FramerSection>
            ))}
          </div>

        </div>
      </div>
    </FramerPageTransition>
  );
};

export default JourneyScreen;
