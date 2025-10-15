import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import FramerButton from './components/FramerButton';
import FramerSection from './components/FramerSection';
import FramerMeditationCircle from './components/FramerMeditationCircle';
import FramerPageTransition from './components/FramerPageTransition';
import BackButton from './components/BackButton';

export default function MeditationApp() {
  const [screen, setScreen] = useState('home');
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(300);
  const [selectedDuration, setSelectedDuration] = useState(5);
  const [breathPhase, setBreathPhase] = useState('in');
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [stats, setStats] = useState({
    totalMinutes: 47,
    streak: 3,
    totalSessions: 12
  });

  const minSwipeDistance = 50;

  useEffect(() => {
    let interval;
    if (isPlaying && time > 0) {
      interval = setInterval(() => {
        setTime(t => t - 1);
      }, 1000);
    } else if (time === 0 && isPlaying) {
      setIsPlaying(false);
      setStats(prev => ({
        ...prev,
        totalMinutes: prev.totalMinutes + selectedDuration,
        totalSessions: prev.totalSessions + 1
      }));
    }
    return () => clearInterval(interval);
  }, [isPlaying, time, selectedDuration]);

  useEffect(() => {
    if (screen === 'breath') {
      const interval = setInterval(() => {
        setBreathPhase(prev => {
          if (prev === 'in') return 'hold';
          if (prev === 'hold') return 'out';
          return 'in';
        });
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [screen]);


  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleReset = () => {
    setIsPlaying(false);
    setTime(selectedDuration * 60);
  };

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientY);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isDownSwipe = distance < -minSwipeDistance;

    if (isDownSwipe && screen !== 'home') {
      setScreen('home');
      setTouchStart(null);
      setTouchEnd(null);
    }
  };

  const handleBackClick = () => {
    setScreen('home');
  };

  const screens = ['meditation', 'help', 'journey', 'trouble'];

  const navigateToScreen = (screenName) => {
    setScreen(screenName);
  };

  if (screen === 'home') {
    return (
      <FramerPageTransition screenKey="home">
        <div
          className="min-h-screen w-full max-w-full bg-[#f4ddc4] flex flex-col overflow-x-hidden"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <FramerSection
            className="flex-1 flex items-center justify-center bg-[#f4ddc4] cursor-pointer transition-colors duration-200 hover:bg-[#f0d4b5]"
            onClick={() => navigateToScreen('meditation')}
            animationType="slideInLeft"
            delay={0.1}
          >
            <div className="text-center px-8">
              <h1 className="text-4xl font-light tracking-wide mb-4" style={{fontFamily: 'Playfair Display'}}>
                meditácia
              </h1>
              <div className="flex justify-center gap-2">
                <div className="w-2 h-2 bg-black rounded-full"></div>
                <div className="w-2 h-2 bg-black rounded-full"></div>
                <div className="w-2 h-2 bg-black rounded-full"></div>
              </div>
            </div>
          </FramerSection>

          <FramerSection
            className="flex-1 flex items-center justify-center bg-[#f4ddc4] cursor-pointer transition-colors duration-200 hover:bg-[#f0d4b5]"
            onClick={() => navigateToScreen('help')}
            animationType="slideInLeft"
            delay={0.2}
          >
            <h2 className="text-4xl font-light tracking-wide" style={{fontFamily: 'Playfair Display'}}>
              první pomoc
            </h2>
          </FramerSection>

          <FramerSection
            className="flex-1 flex items-center justify-center bg-[#d9d6d0] cursor-pointer transition-colors duration-200 hover:bg-[#ccc9c3]"
            onClick={() => navigateToScreen('journey')}
            animationType="slideInLeft"
            delay={0.3}
          >
            <h2 className="text-4xl font-light tracking-wide" style={{fontFamily: 'Playfair Display'}}>
              na cesty
            </h2>
          </FramerSection>

          <FramerSection
            className="flex-1 flex items-center justify-center bg-[#f4ddc4] cursor-pointer transition-colors duration-200 hover:bg-[#f0d4b5]"
            onClick={() => navigateToScreen('trouble')}
            animationType="slideInLeft"
            delay={0.4}
          >
            <h2 className="text-4xl font-light tracking-wide" style={{fontFamily: 'Playfair Display'}}>
              trable
            </h2>
          </FramerSection>
        </div>
      </FramerPageTransition>
    );
  }

  if (screen === 'meditation') {
    return (
      <FramerPageTransition screenKey="meditation">
        <div
          className="min-h-screen w-full max-w-full bg-[#f4ddc4] flex flex-col items-center justify-center p-8 overflow-x-hidden relative"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <BackButton onClick={() => navigateToScreen('home')} />
          <div className="max-w-md w-full">
            <FramerSection
              className="text-center mb-16"
              animationType="fadeIn"
              delay={0.1}
            >
              <h1 className="text-5xl font-light mb-2" style={{fontFamily: 'Playfair Display'}}>
                meditácia
              </h1>
              <div className="flex justify-center gap-2 mt-4">
                <div className="w-2 h-2 bg-black rounded-full"></div>
                <div className="w-2 h-2 bg-black rounded-full"></div>
                <div className="w-2 h-2 bg-black rounded-full"></div>
              </div>
            </FramerSection>

            <FramerSection
              className="mb-12"
              animationType="scaleIn"
              delay={0.2}
            >
              <FramerMeditationCircle
                time={time}
                totalTime={selectedDuration * 60}
                isPlaying={isPlaying}
              />
            </FramerSection>

            {!isPlaying && time === selectedDuration * 60 && (
              <FramerSection
                className="flex justify-center gap-4 mb-12"
                animationType="fadeIn"
                delay={0.3}
              >
                {[5, 10, 15, 20].map((mins, index) => (
                  <FramerButton
                    key={mins}
                    onClick={() => {
                      setSelectedDuration(mins);
                      setTime(mins * 60);
                    }}
                    variant={selectedDuration === mins ? 'rounded' : 'secondary'}
                    className="w-16 h-16"
                  >
                    <span style={{fontFamily: 'Playfair Display'}}>
                      {mins}
                    </span>
                  </FramerButton>
                ))}
              </FramerSection>
            )}

            <FramerSection
              className="flex justify-center gap-6"
              animationType="fadeIn"
              delay={0.4}
            >
              <FramerButton
                onClick={() => setIsPlaying(!isPlaying)}
                variant="rounded"
                className="w-20 h-20"
              >
                {isPlaying ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
              </FramerButton>
              <FramerButton
                onClick={handleReset}
                variant="secondary"
                className="w-20 h-20 rounded-full"
              >
                <RotateCcw size={28} />
              </FramerButton>
            </FramerSection>

            <FramerSection
              className="text-center mt-12"
              animationType="fadeIn"
              delay={0.5}
            >
              <p className="text-gray-500 text-sm" style={{fontFamily: 'Playfair Display'}}>
                potiahni dole pre návrat
              </p>
            </FramerSection>
          </div>
        </div>
      </FramerPageTransition>
    );
  }

  if (screen === 'breath') {
    const getBreathText = () => {
      if (breathPhase === 'in') return 'nadýchni sa';
      if (breathPhase === 'hold') return 'podrž';
      return 'vydýchni';
    };

    return (
      <FramerPageTransition screenKey="breath">
        <div
          className="min-h-screen w-full max-w-full bg-[#f4ddc4] flex flex-col items-center justify-center p-8 overflow-x-hidden relative"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <BackButton onClick={() => navigateToScreen('help')} />
          <FramerSection
            className="text-center mb-20"
            animationType="fadeIn"
            delay={0.1}
          >
            <h2 className="text-5xl font-light mb-8" style={{fontFamily: 'Playfair Display'}}>
              dýchanie
            </h2>

            <div className="relative mb-16 flex items-center justify-center h-64">
              <motion.div
                className="w-48 h-48 rounded-full bg-black/10"
                animate={{
                  scale: breathPhase === 'in' || breathPhase === 'hold' ? 1.25 : 0.75,
                  opacity: breathPhase === 'hold' ? 0.8 : 1
                }}
                transition={{
                  duration: 4,
                  ease: "easeInOut",
                  repeat: Infinity
                }}
              />
            </div>

            <motion.p
              className="text-5xl font-light mb-4"
              style={{fontFamily: 'Playfair Display'}}
              key={breathPhase}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {getBreathText()}
            </motion.p>
            <p className="text-gray-600 text-lg" style={{fontFamily: 'Playfair Display'}}>
              4 sekundy
            </p>
          </FramerSection>

          <FramerSection
            className="text-center mt-12"
            animationType="fadeIn"
            delay={0.2}
          >
            <p className="text-gray-500 text-sm" style={{fontFamily: 'Playfair Display'}}>
              potiahni dole pre návrat
            </p>
          </FramerSection>
        </div>
      </FramerPageTransition>
    );
  }

  if (screen === 'help') {
    return (
      <FramerPageTransition screenKey="help">
        <div
          className="min-h-screen w-full max-w-full bg-[#f4ddc4] flex flex-col overflow-x-hidden relative"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <BackButton onClick={() => navigateToScreen('home')} />
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-md w-full">
              <FramerSection
                className="mb-16"
                animationType="fadeIn"
                delay={0.1}
              >
                <h1 className="text-6xl font-light text-center" style={{fontFamily: 'Playfair Display'}}>
                  první pomoc
                </h1>
              </FramerSection>

              <div className="space-y-6">
                <FramerSection
                  animationType="slideInUp"
                  delay={0.2}
                >
                  <FramerButton
                    onClick={() => setScreen('breath')}
                    variant="ghost"
                    className="w-full p-8 text-left"
                  >
                    <div>
                      <h3 className="text-3xl font-light mb-2" style={{fontFamily: 'Playfair Display'}}>
                        dýchanie
                      </h3>
                      <p className="text-gray-600" style={{fontFamily: 'Playfair Display'}}>
                        upokojujúce dýchacie cvičenie
                      </p>
                    </div>
                  </FramerButton>
                </FramerSection>

                <FramerSection
                  animationType="slideInUp"
                  delay={0.3}
                >
                  <FramerButton
                    variant="ghost"
                    className="w-full p-8 text-left"
                  >
                    <div>
                      <h3 className="text-3xl font-light mb-2" style={{fontFamily: 'Playfair Display'}}>
                        ukotvenie
                      </h3>
                      <p className="text-gray-600" style={{fontFamily: 'Playfair Display'}}>
                        5-4-3-2-1 technika
                      </p>
                    </div>
                  </FramerButton>
                </FramerSection>

                <FramerSection
                  animationType="slideInUp"
                  delay={0.4}
                >
                  <FramerButton
                    variant="ghost"
                    className="w-full p-8 text-left"
                  >
                    <div>
                      <h3 className="text-3xl font-light mb-2" style={{fontFamily: 'Playfair Display'}}>
                        ticho
                      </h3>
                      <p className="text-gray-600" style={{fontFamily: 'Playfair Display'}}>
                        5 minút kľudu
                      </p>
                    </div>
                  </FramerButton>
                </FramerSection>
              </div>

              <FramerSection
                className="text-center mt-12"
                animationType="fadeIn"
                delay={0.5}
              >
                <p className="text-gray-500 text-sm" style={{fontFamily: 'Playfair Display'}}>
                  potiahni dole pre návrat
                </p>
              </FramerSection>
            </div>
          </div>
        </div>
      </FramerPageTransition>
    );
  }

  if (screen === 'journey') {
    return (
      <FramerPageTransition screenKey="journey">
        <div
          className="min-h-screen w-full max-w-full bg-[#f4ddc4] flex flex-col items-center justify-center p-8 overflow-x-hidden relative"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <BackButton onClick={() => navigateToScreen('home')} />
          <div className="max-w-md w-full">
            <FramerSection
              className="text-center mb-8"
              animationType="fadeIn"
              delay={0.1}
            >
              <h1 className="text-6xl font-light" style={{fontFamily: 'Playfair Display'}}>
                na cesty
              </h1>
              <p className="text-xl text-gray-700 mt-4" style={{fontFamily: 'Playfair Display'}}>
                krátke meditácie do každého dňa
              </p>
            </FramerSection>

            <div className="space-y-4">
              {[
                { time: '3 min', title: 'ranné prebudenie', icon: '☀️' },
                { time: '5 min', title: 'prestávka v práci', icon: '☕' },
                { time: '7 min', title: 'večerné uvoľnenie', icon: '🌙' },
                { time: '10 min', title: 'pred spánkom', icon: '✨' }
              ].map((item, idx) => (
                <FramerSection
                  key={idx}
                  animationType="slideInUp"
                  delay={0.2 + idx * 0.1}
                >
                  <FramerButton
                    variant="ghost"
                    className="w-full p-6 text-left bg-white/50 backdrop-blur rounded-none border border-black/10"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 mb-1" style={{fontFamily: 'Playfair Display'}}>
                          {item.time}
                        </p>
                        <h3 className="text-2xl font-light" style={{fontFamily: 'Playfair Display'}}>
                          {item.title}
                        </h3>
                      </div>
                      <span className="text-3xl">{item.icon}</span>
                    </div>
                  </FramerButton>
                </FramerSection>
              ))}
            </div>

            <FramerSection
              className="text-center mt-12"
              animationType="fadeIn"
              delay={0.6}
            >
              <p className="text-gray-500 text-sm" style={{fontFamily: 'Playfair Display'}}>
                potiahni dole pre návrat
              </p>
            </FramerSection>
          </div>
        </div>
      </FramerPageTransition>
    );
  }

  if (screen === 'trouble') {
    return (
      <FramerPageTransition screenKey="trouble">
        <div
          className="min-h-screen w-full max-w-full bg-[#f4ddc4] flex flex-col items-center justify-center p-8 overflow-x-hidden relative"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <BackButton onClick={() => navigateToScreen('home')} />
          <div className="max-w-md w-full">
            <FramerSection
              className="text-center mb-8"
              animationType="fadeIn"
              delay={0.1}
            >
              <h1 className="text-6xl font-light" style={{fontFamily: 'Playfair Display'}}>
                trable
              </h1>
              <p className="text-xl text-gray-700 mt-4" style={{fontFamily: 'Playfair Display'}}>
                pomoc pri konkrétnych ťažkostiach
              </p>
            </FramerSection>

            <div className="space-y-4">
              {[
                { title: 'úzkosť', duration: '12 min' },
                { title: 'bolesť', duration: '15 min' },
                { title: 'smútok', duration: '18 min' },
                { title: 'hnev', duration: '10 min' },
                { title: 'nespavosť', duration: '25 min' }
              ].map((item, idx) => (
                <FramerSection
                  key={idx}
                  animationType="slideInUp"
                  delay={0.2 + idx * 0.1}
                >
                  <FramerButton
                    variant="ghost"
                    className="w-full p-6 text-left bg-white/50 backdrop-blur rounded-none border border-black/10"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-light" style={{fontFamily: 'Playfair Display'}}>
                        {item.title}
                      </h3>
                      <span className="text-gray-500" style={{fontFamily: 'Playfair Display'}}>
                        {item.duration}
                      </span>
                    </div>
                  </FramerButton>
                </FramerSection>
              ))}
            </div>

            <FramerSection
              className="text-center mt-12"
              animationType="fadeIn"
              delay={0.7}
            >
              <p className="text-gray-500 text-sm" style={{fontFamily: 'Playfair Display'}}>
                potiahni dole pre návrat
              </p>
            </FramerSection>
          </div>
        </div>
      </FramerPageTransition>
    );
  }

  return null;
}
