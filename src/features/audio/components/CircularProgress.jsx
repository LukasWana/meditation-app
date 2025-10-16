import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

const CircularProgress = ({
  progress,
  onSeek,
  className = "w-[80vw] h-[80vw] max-w-[480px] max-h-[480px] min-w-[240px] min-h-[240px]"
}) => {
  const radius = 160;
  const circumference = 2 * Math.PI * radius;
  const [isDragging, setIsDragging] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
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
    // Přidáme malé zpoždění pro resetování dragging stavu
    setTimeout(() => {
      setIsDragging(false);
    }, 100);
  };

  // Handler pro kliknutí s ochranou proti dvojitému tapu
  const handleClick = (e) => {
    // Na touch zařízeních ignorujeme onClick úplně
    if (isTouchDevice) {
      return;
    }

    const now = Date.now();
    const timeDiff = now - lastClickTime;

    // Pokud je to dvojitý tap (méně než 300ms), ignorujeme
    if (timeDiff < 300) {
      setLastClickTime(now);
      return;
    }

    setLastClickTime(now);

    // Pokud jsme právě dokončili dragging, nechceme spustit onClick
    if (isDragging) {
      return;
    }

    // Spustíme onSeek pouze pokud není dragging
    if (onSeek) {
      onSeek(e);
    }
  };


  // Přidáme event listenery s passive: false pro touch události
  useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement) return;

    const handleTouchMovePassive = (e) => {
      if (isDragging) {
        e.preventDefault();
        handleSeek(e);
      }
    };

    const handleTouchStartPassive = (e) => {
      e.preventDefault();
      setIsTouchDevice(true);
      setIsDragging(true);
      handleSeek(e);
    };

    const handleTouchEndPassive = () => {
      // Přidáme malé zpoždění pro resetování dragging stavu
      setTimeout(() => {
        setIsDragging(false);
      }, 100);
    };

    // Přidáme event listenery s passive: false
    svgElement.addEventListener('touchstart', handleTouchStartPassive, { passive: false });
    svgElement.addEventListener('touchmove', handleTouchMovePassive, { passive: false });
    svgElement.addEventListener('touchend', handleTouchEndPassive, { passive: false });

    return () => {
      svgElement.removeEventListener('touchstart', handleTouchStartPassive);
      svgElement.removeEventListener('touchmove', handleTouchMovePassive);
      svgElement.removeEventListener('touchend', handleTouchEndPassive);
    };
  }, [isDragging, onSeek]);

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
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
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
