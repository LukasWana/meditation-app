import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PlayPauseButton = ({
  isPlaying,
  onToggle,
  className = "w-24 h-24"
}) => {
  return (
    <motion.button
      onClick={onToggle}
      className={`${className} rounded-full flex items-center justify-center pointer-events-auto cursor-pointer relative overflow-hidden`}
      style={{ position: 'relative' }}
    >
      {/* Pozadí buttonu - 20% průhledné při přehrávání, jinak neprůhledné */}
      <div
        className="absolute inset-0 rounded-full bg-black/80 backdrop-blur-sm border border-white/20"
        style={{ opacity: isPlaying ? 0.2 : 1 }}
      />
      {/* Ikona - vždy neprůhledná, relativní k buttonu */}
      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {isPlaying ? (
            <motion.div
              key="pause"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="w-8 h-8 flex items-center justify-center"
            >
              <div className="flex space-x-3">
                <div className="w-3 h-10 bg-black"></div>
                <div className="w-3 h-10 bg-black"></div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="play"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="w-0 h-0 border-l-[16px] border-l-white border-y-[12px] border-y-transparent ml-3"
            />
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
};

export default PlayPauseButton;
