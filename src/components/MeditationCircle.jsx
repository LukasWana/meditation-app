import React, { useRef, useEffect, useState } from 'react';
import { meditationAnimations } from '../utils/simpleAnimations';

const MeditationCircle = ({
  time,
  totalTime,
  isPlaying,
  className = ''
}) => {
  const circleRef = useRef(null);
  const innerCircleRef = useRef(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const newProgress = totalTime > 0 ? (totalTime - time) / totalTime : 0;
    setProgress(newProgress);
  }, [time, totalTime]);

  useEffect(() => {
    const circle = circleRef.current;
    const innerCircle = innerCircleRef.current;

    if (!circle || !innerCircle) return;

    if (isPlaying) {
      // Pulsujúca animácia pre vnútorný kruh
      meditationAnimations.pulse(innerCircle);

      // Rotujúca animácia pre vonkajší kruh
      circle.style.transform = 'rotate(0deg)';
      circle.style.transition = `transform ${totalTime}s linear`;

      requestAnimationFrame(() => {
        circle.style.transform = 'rotate(360deg)';
      });
    } else {
      // Zastavenie animácií
      circle.style.transition = '';
      circle.style.transform = '';
      innerCircle.style.transition = '';
      innerCircle.style.transform = '';
    }
  }, [isPlaying, totalTime]);

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
        <circle
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
          className="transition-all duration-1000 ease-out"
        />
      </svg>

      {/* Vnútorný animovaný kruh */}
      <div
        ref={innerCircleRef}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="w-32 h-32 rounded-full bg-black/5 flex items-center justify-center">
          <span className="text-6xl font-light" style={{fontFamily: 'Playfair Display'}}>
            {Math.floor(time / 60)}:{(time % 60).toString().padStart(2, '0')}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MeditationCircle;
