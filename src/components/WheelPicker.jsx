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
  const itemHeight = 50;

  // Počet položek k zobrazení (5 položek podle obrázku)
  const visibleItems = 5;
  const itemsToShow = visibleItems;

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
    setScrollY(scrollTop); // Aktualizuj scrollY pro re-render efektu

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
      {/* Světle šedý obdélník s zakulacenými rohy */}
      <div className="relative bg-gray-100 rounded-2xl overflow-hidden" style={{ width: '80px', height: itemsToShow * itemHeight }}>
        {/* Scrollovatelný kontejner */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          onTouchEnd={handleTouchEnd}
          onMouseUp={handleTouchEnd}
          className="overflow-y-auto scrollbar-hide h-full"
          style={{
            scrollSnapType: 'y mandatory'
          }}
        >
          {/* Padding nahoře pro první položky */}
          <div style={{ height: centerY - itemHeight / 2 }} />

          {/* Seznam hodnot */}
          {values.map((val, index) => {
            // Vypočti vzdálenost od středu na základě aktuální scroll pozice
            // Použij scrollY nebo targetScrollY pro plynulý efekt
            const currentScroll = scrollY || targetScrollY || (currentIndex * itemHeight);
            const scrollIndex = currentScroll / itemHeight;
            const distanceFromCenter = Math.abs(index - scrollIndex);

            // Postupně se ztrácející efekt - podle obrázku
            // Střední hodnota (distance = 0) je plně viditelná, ostatní postupně slábnou
            const opacity = distanceFromCenter === 0 ? 1 : Math.max(0.2, 1 - distanceFromCenter * 0.25);
            const scale = distanceFromCenter === 0 ? 1 : Math.max(0.7, 1 - distanceFromCenter * 0.12);
            const fontWeight = distanceFromCenter === 0 ? 600 : Math.max(300, 600 - distanceFromCenter * 100);
            const fontSize = distanceFromCenter === 0 ? 24 : Math.max(16, 24 - distanceFromCenter * 3);
            const colorIntensity = distanceFromCenter === 0 ? 1 : Math.max(0.3, 1 - distanceFromCenter * 0.2);

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
                <div
                  style={{
                    opacity,
                    transform: `scale(${scale})`,
                    fontWeight,
                    fontSize: `${fontSize}px`,
                    color: `rgba(0, 0, 0, ${colorIntensity})`,
                    transition: 'opacity 0.1s, transform 0.1s, font-weight 0.1s, font-size 0.1s, color 0.1s'
                  }}
                >
                  {val}
                </div>
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

