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
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        style={{ height: '100vh' }}
      >
        <motion.div
          className="flex-1 flex items-center justify-center bg-[#f4ddc4] cursor-pointer"
          onClick={() => onNavigateToScreen('slova')}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <motion.div
            className="text-center px-2 sm:px-8 py-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3, ease: "easeOut" }}
          >
            <div
              className="text-5xl font-light tracking-wide py-4 leading-loose"
              style={{fontFamily: 'Playfair Display'}}
            >
              slova
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          className="flex-1 flex items-center justify-center bg-[#ffffff] cursor-pointer"
          onClick={() => onNavigateToScreen('bez-slov')}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <motion.div
            className="text-center px-2 sm:px-8 py-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3, ease: "easeOut" }}
          >
            <div
              className="text-5xl font-light tracking-wide py-4 leading-loose"
              style={{fontFamily: 'Playfair Display'}}
            >
              hudba
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          className="flex-1 flex items-center justify-center bg-[#f4ddc4] cursor-pointer"
          onClick={() => onNavigateToScreen('meditation')}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <motion.div
            className="text-center px-2 sm:px-8 py-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3, ease: "easeOut" }}
          >
            <div
              className="text-5xl font-light tracking-wide mb-4 py-4 leading-loose"
              style={{fontFamily: 'Playfair Display'}}
            >
              meditácia
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          className="flex-1 flex items-center justify-center bg-[#ffffff] cursor-pointer"
          onClick={() => onNavigateToScreen('breath')}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <motion.div
            className="text-center px-2 sm:px-8 py-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.3, ease: "easeOut" }}
          >
            <div
              className="text-5xl font-light tracking-wide py-4 leading-loose"
              style={{fontFamily: 'Playfair Display'}}
            >
              dýchanie
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </FramerPageTransition>
  );
};

export default HomeScreen;
