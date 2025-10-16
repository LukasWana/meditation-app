import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FramerButton from '../FramerButton';
import FramerSection from '../FramerSection';
import FramerPageTransition from '../FramerPageTransition';
import BackButton from '../BackButton';
import AudioPlayer from '../AudioPlayer';
import { AUDIO_FILES } from '../../hooks/useFirebaseAudio';

const TroubleScreen = ({
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd
}) => {
  const [activeAudio, setActiveAudio] = useState(null);

  const troubleItems = [
    {
      title: 'úzkosť - ženský hlas',
      duration: '4:25',
      audioSrc: AUDIO_FILES.FEMALE_MSK
    },
    {
      title: 'úzkosť - mužský hlas',
      duration: '4:25',
      audioSrc: AUDIO_FILES.MALE_MSK
    },
    {
      title: 'úzkosť - ženský hlas FSK',
      duration: '4:25',
      audioSrc: AUDIO_FILES.FEMALE_FSK
    },
    {
      title: 'úzkosť - mužský hlas FSK',
      duration: '4:25',
      audioSrc: AUDIO_FILES.MALE_FSK
    },
    {
      title: 'zbav sa strachu z osamelosti',
      duration: '6:25',
      audioSrc: AUDIO_FILES.FEAR_LONELINESS
    }
  ];

  const handleItemClick = (item) => {
    if (item.audioSrc) {
      setActiveAudio(item);
    }
  };

  const handleCloseAudio = () => {
    setActiveAudio(null);
  };

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
                  onClick={() => handleItemClick(item)}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-light" style={{fontFamily: 'Playfair Display'}}>
                      {item.title}
                    </h3>
                    <div className="flex items-center space-x-3">
                      <span className="text-gray-500" style={{fontFamily: 'Playfair Display'}}>
                        {item.duration}
                      </span>
                      {item.audioSrc && (
                        <span className="text-black text-lg">♪</span>
                      )}
                    </div>
                  </div>
                </FramerButton>
              </FramerSection>
            ))}
          </div>

        </div>

        {/* Audio Player Modal */}
        <AnimatePresence>
          {activeAudio && (
            <AudioPlayer
              key="audio-player"
              audioSrc={activeAudio.audioSrc}
              title={activeAudio.title}
              onClose={handleCloseAudio}
            />
          )}
        </AnimatePresence>
      </div>
    </FramerPageTransition>
  );
};

export default TroubleScreen;
