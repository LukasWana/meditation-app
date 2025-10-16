import React from 'react';
import { motion } from 'framer-motion';
import { FramerPageTransition } from '@components';

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
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{ height: '100vh' }}
      >
        <div
          className="flex-1 flex items-center justify-center bg-[#ffffff] cursor-pointer transition-colors duration-200 hover:bg-[#f4f4f4]"
          onClick={() => onNavigateToScreen('meditation')}
        >
          <div className="text-center px-8 py-4">
            <div
              className="text-5xl font-light tracking-wide mb-4 py-4 leading-loose"
              style={{fontFamily: 'Playfair Display'}}
            >
              meditácia
            </div>
            <div className="flex justify-center gap-2">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="w-2 h-2 bg-black rounded-full"
                />
              ))}
            </div>
          </div>
        </div>

        <div
          className="flex-1 flex items-center justify-center bg-[#f4ddc4] cursor-pointer transition-colors duration-200 hover:bg-[#f4f4f4]"
          onClick={() => onNavigateToScreen('breath')}
        >
          <div className="text-center px-8 py-4">
            <div
              className="text-5xl font-light tracking-wide py-4 leading-loose"
              style={{fontFamily: 'Playfair Display'}}
            >
              dýchanie
            </div>
          </div>
        </div>

        <div
          className="flex-1 flex items-center justify-center bg-[#ffffff] cursor-pointer transition-colors duration-200 hover:bg-[#f4f4f4]"
          onClick={() => onNavigateToScreen('journey')}
        >
          <div className="text-center px-8 py-4">
            <div
              className="text-5xl font-light tracking-wide py-4 leading-loose"
              style={{fontFamily: 'Playfair Display'}}
            >
              na cesty
            </div>
          </div>
        </div>

        <div
          className="flex-1 flex items-center justify-center bg-[#f4ddc4] cursor-pointer transition-colors duration-200 hover:bg-[#f4f4f4]"
          onClick={() => onNavigateToScreen('trouble')}
        >
          <div className="text-center px-8 py-4">
            <div
              className="text-5xl font-light tracking-wide py-4 leading-loose"
              style={{fontFamily: 'Playfair Display'}}
            >
              trable
            </div>
          </div>
        </div>
      </motion.div>
    </FramerPageTransition>
  );
};

export default HomeScreen;
