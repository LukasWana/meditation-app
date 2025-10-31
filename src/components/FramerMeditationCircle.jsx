import React, { useRef, useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';

const FramerMeditationCircle = ({
  time,
  totalTime,
  isPlaying,
  className = ''
}) => {
  const circleRef = useRef(null);
  const innerCircleControls = useAnimation();
  const outerCircleControls = useAnimation();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const newProgress = totalTime > 0 ? Math.max(0, Math.min(1, (totalTime - time) / totalTime)) : 0;
    setProgress(newProgress);
  }, [time, totalTime]);

  useEffect(() => {
    if (isPlaying) {
      // Pulsujúca animácia pre vnútorný kruh
      innerCircleControls.start({
        scale: [1, 1.1, 1],
        opacity: [0.8, 1, 0.8],
        transition: {
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }
      });

      // Rotujúca animácia pre vonkajší kruh
      outerCircleControls.start({
        rotate: 360,
        transition: {
          duration: totalTime,
          ease: "linear",
          repeat: Infinity
        }
      });
    } else {
      // Zastavenie animácií
      innerCircleControls.stop();
      outerCircleControls.stop();

      // Reset na pôvodnú pozíciu
      innerCircleControls.set({ scale: 1, opacity: 0.8 });
      outerCircleControls.set({ rotate: 0 });
    }
  }, [isPlaying, totalTime, innerCircleControls, outerCircleControls]);

  const circumference = 2 * Math.PI * 140;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className={`relative w-80 h-80 mx-auto ${className}`}>
      <svg className="w-full h-full transform -rotate-90">
        {/* Pozadie kruhu */}
        <circle
          cx="160"
          cy="160"
          r="140"
          stroke="#d9d6d0"
          strokeWidth="2"
          fill="none"
        />
        {/* Progress kruh */}
        <motion.circle
          ref={circleRef}
          cx="160"
          cy="160"
          r="140"
          stroke="#333"
          strokeWidth="2"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          animate={outerCircleControls}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: strokeDashoffset
          }}
        />
      </svg>

      {/* Vnútorný animovaný kruh */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={innerCircleControls}
      >
        <motion.div
          className="w-40 h-40 rounded-full bg-black/5 flex items-center justify-center p-4"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <motion.span
            className="text-6xl font-light leading-tight"
            animate={isPlaying ? {
              scale: [1, 1.05, 1],
              transition: {
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }
            } : {}}
          >
            {Math.floor(time / 60)}:{(time % 60).toString().padStart(2, '0')}
          </motion.span>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default FramerMeditationCircle;
