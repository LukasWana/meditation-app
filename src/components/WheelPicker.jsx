import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
  const rafRef = useRef(null);
  const onChangeTimeoutRef = useRef(null);
  const isScrollingRef = useRef(false);
  const isInitializedRef = useRef(false);
  const itemHeight = 50;

  // Počet položek k zobrazení (5 položek podle obrázku)
  const visibleItems = 5;
  const itemsToShow = visibleItems;

  // Generuj všechny možné hodnoty pomocí useMemo pro optimalizaci
  const values = useMemo(() => {
    const vals = [];
    for (let i = min; i <= max; i += step) {
      vals.push(i);
    }
    return vals;
  }, [min, max, step]);

  // Najdi index aktuální hodnoty
  const currentIndex = useMemo(() => values.indexOf(value), [values, value]);
  const targetScrollY = useMemo(() =>
    currentIndex >= 0 ? currentIndex * itemHeight : 0,
    [currentIndex, itemHeight]
  );

  // Inicializuj scroll pozici při prvním renderu
  useEffect(() => {
    if (containerRef.current && !isInitializedRef.current && currentIndex >= 0) {
      containerRef.current.scrollTop = targetScrollY;
      setScrollY(targetScrollY);
      isInitializedRef.current = true;
    }
  }, [targetScrollY, currentIndex]);

  // Aktualizuj scroll při změně hodnoty zvenčí (jen když uživatel neposouvá)
  useEffect(() => {
    if (containerRef.current && !isDragging && !isScrollingRef.current && currentIndex >= 0) {
      const newScrollY = currentIndex * itemHeight;
      const currentScrollY = containerRef.current.scrollTop;
      const difference = Math.abs(currentScrollY - newScrollY);

      // Aktualizuj pouze pokud je rozdíl větší než 1px (aby nedošlo k nekonečnému loop)
      if (difference > 1) {
        containerRef.current.scrollTop = newScrollY;
        setScrollY(newScrollY);
      }
    }
  }, [value, currentIndex, isDragging]);

  // Optimalizovaný handleScroll s requestAnimationFrame
  const handleScroll = useCallback((e) => {
    if (!isDragging) setIsDragging(true);
    if (!isScrollingRef.current) isScrollingRef.current = true;

    const scrollTop = e.target.scrollTop;

    // Zruš předchozí RAF pokud existuje
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    // Použij RAF pro plynulou aktualizaci scrollY
    rafRef.current = requestAnimationFrame(() => {
      setScrollY(scrollTop);

      // Najdi nejbližší hodnotu
      const index = Math.round(scrollTop / itemHeight);
      const clampedIndex = Math.max(0, Math.min(values.length - 1, index));
      const newValue = values[clampedIndex];

      // Throttle onChange volání - aktualizuj pouze pokud se hodnota změnila
      if (newValue !== value) {
        // Zruš předchozí timeout
        if (onChangeTimeoutRef.current) {
          clearTimeout(onChangeTimeoutRef.current);
        }

        // Použij malý timeout pro throttling (16ms = ~60fps)
        onChangeTimeoutRef.current = setTimeout(() => {
          onChange(newValue);
        }, 16);
      }
    });
  }, [value, values, onChange, isDragging]);

  // Vyčistit při unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (onChangeTimeoutRef.current) {
        clearTimeout(onChangeTimeoutRef.current);
      }
    };
  }, []);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);

    // Snap na nejbližší hodnotu
    if (containerRef.current) {
      const currentScrollY = containerRef.current.scrollTop;
      const index = Math.round(currentScrollY / itemHeight);
      const clampedIndex = Math.max(0, Math.min(values.length - 1, index));
      const targetScroll = clampedIndex * itemHeight;
      const newValue = values[clampedIndex];

      containerRef.current.scrollTo({
        top: targetScroll,
        behavior: 'smooth'
      });
      setScrollY(targetScroll);

      // Aktualizuj hodnotu pokud se změnila (použij setTimeout pro zajištění plynulého snapu)
      setTimeout(() => {
        isScrollingRef.current = false;
        if (newValue !== value) {
          onChange(newValue);
        }
      }, 100);
    } else {
      isScrollingRef.current = false;
    }
  }, [values, value, onChange, itemHeight]);

  // Vypočti střed (výška kontejneru / 2)
  const centerY = useMemo(() => (itemsToShow * itemHeight) / 2, [itemsToShow, itemHeight]);

  // Vypočti aktuální scroll index pro renderování
  const scrollIndex = useMemo(() => {
    const currentScroll = scrollY || targetScrollY || (currentIndex * itemHeight);
    return currentScroll / itemHeight;
  }, [scrollY, targetScrollY, currentIndex, itemHeight]);

  // Komponenta pro jednotlivou položku - memoizovaná pro lepší výkon
  const WheelItem = React.memo(({ val, index, scrollIndex, itemHeight }) => {
    // Vypočti vzdálenost od středu na základě aktuální scroll pozice
    const distanceFromCenter = React.useMemo(() =>
      Math.abs(index - scrollIndex),
      [index, scrollIndex]
    );

    // Postupně se ztrácející efekt - podle obrázku
    // Střední hodnota (distance = 0) je plně viditelná, ostatní postupně slábnou
    const styleProps = React.useMemo(() => {
      const opacity = distanceFromCenter === 0 ? 1 : Math.max(0.2, 1 - distanceFromCenter * 0.25);
      const scale = distanceFromCenter === 0 ? 1 : Math.max(0.7, 1 - distanceFromCenter * 0.12);
      const fontWeight = distanceFromCenter === 0 ? 600 : Math.max(300, 600 - distanceFromCenter * 100);
      const fontSize = distanceFromCenter === 0 ? 24 : Math.max(16, 24 - distanceFromCenter * 3);
      const colorIntensity = distanceFromCenter === 0 ? 1 : Math.max(0.3, 1 - distanceFromCenter * 0.2);

      return { opacity, scale, fontWeight, fontSize, colorIntensity };
    }, [distanceFromCenter]);

    return (
      <div
        className="flex items-center justify-center"
        style={{
          height: itemHeight,
          scrollSnapAlign: 'center',
          scrollSnapStop: 'always'
        }}
      >
        <div
          style={{
            opacity: styleProps.opacity,
            transform: `scale(${styleProps.scale})`,
            fontWeight: styleProps.fontWeight,
            fontSize: `${styleProps.fontSize}px`,
            color: `rgba(0, 0, 0, ${styleProps.colorIntensity})`,
            willChange: 'opacity, transform', // Optimalizace pro GPU
            transition: 'opacity 0.1s, transform 0.1s, font-weight 0.1s, font-size 0.1s, color 0.1s'
          }}
        >
          {val}
        </div>
      </div>
    );
  });

  WheelItem.displayName = 'WheelItem';

  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      {label && (
        <label className="text-sm font-medium mb-2 block text-center text-gray-700 w-full">
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
          {values.map((val, index) => (
            <WheelItem
              key={val}
              val={val}
              index={index}
              scrollIndex={scrollIndex}
              itemHeight={itemHeight}
            />
          ))}

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
    <div className={`flex items-center justify-center gap-4 ${className}`}>
      <div className="flex flex-col items-center">
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
      <div className="flex flex-col items-center">
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

