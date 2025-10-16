import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';

const CircularProgress = ({
  progress,
  onSeek,
  className = "w-[80vw] h-[80vw] max-w-[480px] max-h-[480px] min-w-[240px] min-h-[240px]"
}) => {
  const radius = 160;
  const circumference = 2 * Math.PI * radius;
  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef(null);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    handleSeek(e);
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      handleSeek(e);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    e.preventDefault();
    setIsDragging(true);
    handleSeek(e);
  };

  const handleTouchMove = (e) => {
    if (isDragging) {
      e.preventDefault();
      handleSeek(e);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleSeek = (e) => {
    if (!svgRef.current || !onSeek) return;

    const rect = svgRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let clientX, clientY;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    const angle = Math.atan2(deltaY, deltaX) + Math.PI / 2; // Přidáme π/2 kvůli -rotate-90
    const normalizedAngle = (angle + 2 * Math.PI) % (2 * Math.PI);
    const progressValue = (normalizedAngle / (2 * Math.PI)) * 100;

    onSeek(progressValue);
  };

  return (
    <svg
      ref={svgRef}
      className={`${className} transform -rotate-90 cursor-pointer select-none`}
      onClick={!isDragging ? onSeek : undefined}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      viewBox="0 0 340 340"
      style={{ aspectRatio: '1/1', userSelect: 'none' }}
    >
      {/* Background Circle */}
      <circle
        cx="170"
        cy="170"
        r={radius}
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="12"
        fill="none"
      />
      {/* Background Progress Circle - Duplicate with 50% opacity and 50% thicker */}
      <motion.circle
        cx="170"
        cy="170"
        r={radius}
        stroke="white"
        strokeWidth="50"
        fill="none"
        strokeLinecap="butt"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - progress / 100)}
        transition={{ duration: 0.1 }}
        opacity="0.15"
      />
      {/* Main Progress Circle */}
      <motion.circle
        cx="170"
        cy="170"
        r={radius}
        stroke="limegreen"
        strokeWidth="20"
        fill="none"
        strokeLinecap="butt"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - progress / 100)}
        transition={{ duration: 0.1 }}
      />
    </svg>
  );
};

export default CircularProgress;
