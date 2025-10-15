import React from 'react';
import { motion } from 'framer-motion';
import FramerSection from '../FramerSection';
import FramerPageTransition from '../FramerPageTransition';
import AnimatedText from '../AnimatedText';

const HomeScreen = ({
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd
}) => {

  return (
    <FramerPageTransition screenKey="home">
      <motion.div
        className="min-h-screen w-full max-w-full bg-[#f4ddc4] flex flex-col overflow-x-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeInOut", delay: 0.2 }}
        style={{ height: '100vh' }}
      >
        <FramerSection
          className="flex-1 flex items-center justify-center bg-[#ffffff] cursor-pointer transition-colors duration-200 hover:bg-[#f4f4f4]"
          onClick={() => onNavigateToScreen('meditation')}
          animationType="slideInTop"
          delay={1.0}
        >
          <div className="text-center px-8 py-4">
            <AnimatedText
              delay={1.0}
              className="text-5xl font-light tracking-wide mb-4"
              style={{fontFamily: 'Playfair Display'}}
            >
              meditácia
            </AnimatedText>
            <div className="flex justify-center gap-2">
              {[0, 1, 2].map((index) => (
                <motion.div
                  key={index}
                  className="w-2 h-2 bg-black rounded-full"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    transition: {
                      delay: 0.6 + (index * 0.1),
                      duration: 0.4,
                      type: "spring",
                      stiffness: 300,
                      damping: 20
                    }
                  }}
                />
              ))}
            </div>
          </div>
        </FramerSection>

        <FramerSection
          className="flex-1 flex items-center justify-center bg-[#f4ddc4] cursor-pointer transition-colors duration-200 hover:bg-[#f4f4f4]"
          onClick={() => onNavigateToScreen('breath')}
          animationType="slideInTop"
          delay={1.2}
        >
          <div className="text-center px-8 py-4">
            <AnimatedText
              delay={1.2}
              className="text-5xl font-light tracking-wide"
              style={{fontFamily: 'Playfair Display'}}
            >
              dýchanie
            </AnimatedText>
          </div>
        </FramerSection>

        <FramerSection
          className="flex-1 flex items-center justify-center bg-[#ffffff] cursor-pointer transition-colors duration-200 hover:bg-[#f4f4f4]"
          onClick={() => onNavigateToScreen('journey')}
          animationType="slideInTop"
          delay={1.4}
        >
          <div className="text-center px-8 py-4">
            <AnimatedText
              delay={1.4}
              className="text-5xl font-light tracking-wide"
              style={{fontFamily: 'Playfair Display'}}
            >
              na cesty
            </AnimatedText>
          </div>
        </FramerSection>

        <FramerSection
          className="flex-1 flex items-center justify-center bg-[#f4ddc4] cursor-pointer transition-colors duration-200 hover:bg-[#f4f4f4]"
          onClick={() => onNavigateToScreen('trouble')}
          animationType="slideInTop"
          delay={1.6}
        >
          <div className="text-center px-8 py-4">
            <AnimatedText
              delay={1.6}
              className="text-5xl font-light tracking-wide"
              style={{fontFamily: 'Playfair Display'}}
            >
              trable
            </AnimatedText>
          </div>
        </FramerSection>
      </motion.div>
    </FramerPageTransition>
  );
};

export default HomeScreen;
