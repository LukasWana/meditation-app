import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useShaderSettings } from '@contexts/ShaderSettingsContext';

const CircularProgress = ({
  progress,
  onSeek,
  className = "w-[50vw] h-[50vw] max-w-[400px] max-h-[400px] min-w-[200px] min-h-[200px]",
  backgroundColor = "rgba(255,255,255,0.3)",
  progressColor,
  backgroundProgressColor = "white",
  backgroundProgressOpacity = 0.15,
  strokeWidth = 20,
  backgroundStrokeWidth = 12,
  section
}) => {
  const { getColorForSection } = useShaderSettings();

  // Urči finální barvu progressu
  const finalProgressColor = useMemo(() => {
    // Pokud je explicitně poskytnut progressColor, použij ho (má prioritu)
    if (progressColor) {
      return progressColor;
    }

    // Pokud je poskytnuta sekce, zkus získat barvu z kontextu
    if (section) {
      const sectionColor = getColorForSection(section);
      if (sectionColor) {
        return sectionColor;
      }
    }

    // Fallback na výchozí barvu
    return "limegreen";
  }, [progressColor, section, getColorForSection]);
  const radius = 180; // Snížil radius aby se vešel do viewBox
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


  // Přidáme event listenery s passive: false pro touch události pouze pokud je onSeek nastaven
  useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement || !onSeek) return; // Nezpracovávej touch události pokud není onSeek

    const handleTouchMovePassive = (e) => {
      if (isDragging) {
        // Pouze pokud je dragging aktivní, zkusme preventDefault
        try {
          e.preventDefault();
        } catch (err) {
          // Ignoruj chybu pokud preventDefault není možný
        }
        handleSeek(e);
      }
    };

    const handleTouchStartPassive = (e) => {
      // Pouze pokud není scrollování v procesu, zkusme preventDefault
      try {
        e.preventDefault();
      } catch (err) {
        // Ignoruj chybu pokud preventDefault není možný (např. při scrollování)
        return;
      }
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
    if (!svgRef.current || !onSeek) {
      return;
    }

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
      className={`${className} transform -rotate-90 ${onSeek ? 'cursor-pointer' : ''} select-none circular-element`}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      viewBox="0 0 450 450"
      style={{
        aspectRatio: '1/1',
        userSelect: 'none',
        position: 'relative',
        zIndex: 10,
        isolation: 'isolate',
        pointerEvents: onSeek ? 'auto' : 'none'
      }}
    >
      {/* Background Circle */}
      <circle
        cx="225"
        cy="225"
        r={radius}
        stroke={backgroundColor}
        strokeWidth={backgroundStrokeWidth}
        fill="none"
      />
      {/* Background Progress Circle - Duplicate with opacity */}
      <motion.circle
        cx="225"
        cy="225"
        r={radius}
        stroke={backgroundProgressColor}
        strokeWidth={strokeWidth * 2.5}
        fill="none"
        strokeLinecap="butt"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - progress / 100)}
        transition={{ duration: 0.1 }}
        opacity={backgroundProgressOpacity}
      />
      {/* Main Progress Circle */}
      <motion.circle
        cx="225"
        cy="225"
        r={radius}
        stroke={finalProgressColor}
        strokeWidth={strokeWidth}
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
