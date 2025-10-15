import React from 'react';
import { motion } from 'framer-motion';
import FramerButton from '../FramerButton';
import FramerSection from '../FramerSection';
import FramerPageTransition from '../FramerPageTransition';
import BackButton from '../BackButton';

const TroubleScreen = ({
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd
}) => {
  const troubleItems = [
    { title: 'úzkosť', duration: '12 min' },
    { title: 'bolesť', duration: '15 min' },
    { title: 'smútok', duration: '18 min' },
    { title: 'hnev', duration: '10 min' },
    { title: 'nespavosť', duration: '25 min' }
  ];

  return (
    <FramerPageTransition screenKey="trouble">
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
              trable
            </h1>
            <p className="text-xl text-center text-gray-700 mb-16" style={{fontFamily: 'Playfair Display'}}>
              pomoc pri konkrétnych ťažkostiach
            </p>
          </FramerSection>

          <div className="space-y-4">
            {troubleItems.map((item, idx) => (
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
                    <h3 className="text-2xl font-light" style={{fontFamily: 'Playfair Display'}}>
                      {item.title}
                    </h3>
                    <span className="text-gray-500" style={{fontFamily: 'Playfair Display'}}>
                      {item.duration}
                    </span>
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

export default TroubleScreen;
