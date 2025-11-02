import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

const WheelPicker = ({
  value,
  onChange,
  min = 0,
  max = 60,
  step = 1,
  label = '',
  className = ''
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const containerRef = useRef(null);
  const itemHeight = 60;

  // Počet položek k zobrazení (celkem zobrazíme 7, 3 nahoře + 1 vybraná + 3 dole)
  const visibleItems = 7;
  const itemsToShow = Math.ceil(visibleItems / 2) * 2 + 1; // vždy liché číslo

  // Generuj všechny možné hodnoty
  const values = [];
  for (let i = min; i <= max; i += step) {
    values.push(i);
  }

  // Najdi index aktuální hodnoty
  const currentIndex = values.indexOf(value);
  const targetScrollY = currentIndex >= 0 ? currentIndex * itemHeight : 0;

  // Inicializuj scroll pozici
  useEffect(() => {
    if (containerRef.current && scrollY === 0 && currentIndex >= 0) {
      containerRef.current.scrollTop = targetScrollY;
      setScrollY(targetScrollY);
    }
  }, [targetScrollY, currentIndex]);

  // Aktualizuj scroll při změně hodnoty zvenčí
  useEffect(() => {
    if (containerRef.current && !isDragging && currentIndex >= 0) {
      const newScrollY = currentIndex * itemHeight;
      containerRef.current.scrollTo({
        top: newScrollY,
        behavior: 'smooth'
      });
      setScrollY(newScrollY);
    }
  }, [value, currentIndex, itemHeight, isDragging, values.length]);

  const handleScroll = (e) => {
    if (!isDragging) setIsDragging(true);
    const scrollTop = e.target.scrollTop;
    setScrollY(scrollTop);

    // Najdi nejbližší hodnotu
    const index = Math.round(scrollTop / itemHeight);
    const clampedIndex = Math.max(0, Math.min(values.length - 1, index));
    const newValue = values[clampedIndex];

    if (newValue !== value) {
      onChange(newValue);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    // Snap na nejbližší hodnotu
    if (containerRef.current) {
      const index = Math.round(scrollY / itemHeight);
      const clampedIndex = Math.max(0, Math.min(values.length - 1, index));
      const targetScroll = clampedIndex * itemHeight;

      containerRef.current.scrollTo({
        top: targetScroll,
        behavior: 'smooth'
      });
      setScrollY(targetScroll);
    }
  };

  // Vypočti střed (výška kontejneru / 2)
  const centerY = (itemsToShow * itemHeight) / 2;

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="text-sm font-medium mb-2 block text-center text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        {/* Highlight linka nahoře a dole */}
        <div
          className="absolute left-0 right-0 z-10 pointer-events-none"
          style={{
            top: centerY - itemHeight / 2 - 2,
            height: itemHeight + 4,
            borderTop: '2px solid rgba(0, 0, 0, 0.3)',
            borderBottom: '2px solid rgba(0, 0, 0, 0.3)',
            backgroundColor: 'rgba(255, 255, 255, 0.1)'
          }}
        />

        {/* Scrollovatelný kontejner */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          onTouchEnd={handleTouchEnd}
          onMouseUp={handleTouchEnd}
          className="overflow-y-auto scrollbar-hide"
          style={{
            height: itemsToShow * itemHeight,
            scrollSnapType: 'y mandatory'
          }}
        >
          {/* Padding nahoře pro první položky */}
          <div style={{ height: centerY - itemHeight / 2 }} />

          {/* Seznam hodnot */}
          {values.map((val, index) => {
            const distanceFromCenter = currentIndex >= 0 ? Math.abs(index - currentIndex) : index;
            const opacity = distanceFromCenter === 0 ? 1 : Math.max(0.3, 1 - distanceFromCenter * 0.3);
            const scale = distanceFromCenter === 0 ? 1 : Math.max(0.8, 1 - distanceFromCenter * 0.1);

            return (
              <div
                key={val}
                className="flex items-center justify-center"
                style={{
                  height: itemHeight,
                  scrollSnapAlign: 'center',
                  scrollSnapStop: 'always'
                }}
              >
                <motion.div
                  className="text-2xl font-medium"
                  style={{
                    opacity,
                    transform: `scale(${scale})`
                  }}
                  animate={{
                    opacity: distanceFromCenter === 0 ? 1 : Math.max(0.3, 1 - distanceFromCenter * 0.3),
                    scale: distanceFromCenter === 0 ? 1 : Math.max(0.8, 1 - distanceFromCenter * 0.1)
                  }}
                  transition={{ duration: 0.2 }}
                >
                  {val}
                </motion.div>
              </div>
            );
          })}

          {/* Padding dole pro poslední položky */}
          <div style={{ height: centerY - itemHeight / 2 }} />
        </div>
      </div>
    </div>
  );
};

// Dual Wheel Picker pro dvě hodnoty (např. minuty:sekundy nebo nádech:výdech)
export const DualWheelPicker = ({
  leftValue,
  rightValue,
  onLeftChange,
  onRightChange,
  leftLabel = '',
  rightLabel = '',
  leftMin = 0,
  leftMax = 60,
  leftStep = 1,
  rightMin = 0,
  rightMax = 60,
  rightStep = 1,
  className = ''
}) => {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className="flex-1">
        <WheelPicker
          value={leftValue}
          onChange={onLeftChange}
          min={leftMin}
          max={leftMax}
          step={leftStep}
          label={leftLabel}
        />
      </div>
      <div className="text-3xl font-light pt-8">:</div>
      <div className="flex-1">
        <WheelPicker
          value={rightValue}
          onChange={onRightChange}
          min={rightMin}
          max={rightMax}
          step={rightStep}
          label={rightLabel}
        />
      </div>
    </div>
  );
};

export default WheelPicker;

