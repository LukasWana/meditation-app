import React from 'react';
import { motion } from 'framer-motion';
import CircularProgress from '@features/audio/components/CircularProgress';
import { useLanguage } from '@contexts/LanguageContext';
import { useTheme } from '@hooks/useTheme';

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Komponenta pro zobrazení timeru meditace
 * Zobrazuje CircularProgress, čas a fázi dýchání
 */
const MeditationTimer = ({
  isPlaying,
  breathPhase,
  progress,
  breathInDuration,
  breathOutDuration,
  breathRhythmProgress,
  inPhaseProgress,
  animationDuration,
  initialScale,
  minScale,
  maxScale,
  textColors
}) => {
  const { t } = useLanguage();
  const theme = useTheme();
  const cycleDuration = breathInDuration + breathOutDuration;

  // Fallback na theme, pokud textColors není poskytnuto
  const colors = textColors || {
    primary: theme.colors.black,
    secondary: theme.colors.gray[700],
    isDark: false
  };

  return (
    <>
      {/* Title a Duration nad CircularProgress */}
      <div className="mb-6 z-10 w-full flex flex-col items-center space-y-0">
        {/* Textový indikátor fáze dýchání */}
        {isPlaying && (
          <motion.p
            key={breathPhase}
            className="text-2xl font-light"
            style={{
              color: typeof colors.secondary === 'string' && colors.secondary.startsWith('text-')
                ? theme.colors.gray[700]
                : colors.secondary || theme.colors.gray[700],
              fontWeight: theme.typography.fontWeight.light
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {breathPhase === 'in' ? t('nadech') : t('vydech')}
          </motion.p>
        )}
      </div>

      {/* CircularProgress s Play/Pause Button - všechny kruhové prvky zarovnané vertikálně */}
      <div className="relative flex-shrink-0 flex items-center justify-center" style={{ isolation: 'isolate', overflow: 'visible', width: '50vw', height: '50vw', maxWidth: '400px', maxHeight: '400px', minWidth: '250px', minHeight: '250px', margin: '0 auto' }}>
        {/* Dýchací animace během meditace - SPODNÍ vrstva - pod kruhovým ukazatelem */}
        {isPlaying && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{
              zIndex: 0,
              isolation: 'isolate',
              transform: 'translateZ(0)',
              overflow: 'visible'
            }}
          >
            {/* Animace kolečka - nafukuje se při nádechu, vyfukuje při výdechu */}
            <motion.div
              key={breathPhase}
              className="rounded-full"
              style={{
                width: '45vw',
                height: '45vw',
                maxWidth: '350px',
                maxHeight: '350px',
                minWidth: '220px',
                minHeight: '220px',
                background: colors.isDark
                  ? `radial-gradient(circle, ${theme.colors.black} 0%, ${theme.colors.black} 25%, ${theme.colors.black} 25%, ${theme.colors.black} 100%)`
                  : `radial-gradient(circle, ${theme.colors.white} 0%, ${theme.colors.white} 25%, ${theme.colors.white} 25%, ${theme.colors.white} 100%)`,
                transformOrigin: 'center center',
                position: 'absolute',
                top: '50%',
                left: '50%',
                zIndex: 0,
                willChange: 'transform'
              }}
              initial={{
                scale: initialScale,
                x: '-50%',
                y: '-50%'
              }}
              animate={{
                scale: breathPhase === 'in' ? maxScale : minScale,
                x: '-50%',
                y: '-50%'
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: animationDuration,
                ease: 'easeInOut'
              }}
            />
          </div>
        )}

        {/* CircularProgress - nad animací */}
        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 10, isolation: 'isolate', transform: 'translateZ(0)' }}>
          <CircularProgress
            progress={progress}
            onSeek={null}
            className="w-[50vw] h-[50vw] max-w-[400px] max-h-[400px] min-w-[250px] min-h-[250px]"
            style={{ position: 'relative', zIndex: 10 }}
          />
          {/* Vnitřní kruhový ukazatel pro rytmus dýchání */}
          {isPlaying && cycleDuration > 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 1 }}>
              <svg
                className="w-[40vw] h-[40vw] max-w-[320px] max-h-[320px] min-w-[200px] min-h-[200px] transform -rotate-90"
                viewBox="0 0 450 450"
                style={{ aspectRatio: '1/1' }}
              >
                {/* Pozadí - celý kruh */}
                <circle
                  cx="225"
                  cy="225"
                  r="200"
                  stroke={colors.isDark ? theme.colors.overlay.white15 : theme.colors.overlay.black15}
                  strokeWidth="6"
                  fill="none"
                />
                {/* Nádech část - zvýrazněná podle poměru */}
                <circle
                  cx="225"
                  cy="225"
                  r="200"
                  stroke={colors.isDark ? theme.colors.overlay.white40 : theme.colors.overlay.black20}
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 200 * (inPhaseProgress / 100)} ${2 * Math.PI * 200}`}
                  strokeDashoffset="0"
                  style={{ strokeLinecap: 'butt' }}
                />
                {/* Progress - aktuální pozice v cyklu */}
                <motion.circle
                  cx="225"
                  cy="225"
                  r="200"
                  stroke={colors.isDark ? theme.colors.white : theme.colors.black}
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 200}`}
                  strokeDashoffset={`${2 * Math.PI * 200 * (1 - breathRhythmProgress / 100)}`}
                  style={{ strokeLinecap: 'round' }}
                  transition={{ duration: 0.1 }}
                />
              </svg>
            </div>
          )}
        </div>

      </div>
    </>
  );
};

/**
 * Komponenta pro zobrazení času meditace
 */
export const MeditationTimeDisplay = ({ time, textColors }) => {
  const theme = useTheme();
  const colors = textColors || {
    primary: theme.colors.black
  };

  return (
    <div className="mt-6 text-center">
      <div
        className="font-medium text-2xl"
        style={{
          color: typeof colors.primary === 'string' && colors.primary.startsWith('text-')
            ? theme.colors.black
            : colors.primary || theme.colors.black,
          fontWeight: theme.typography.fontWeight.medium,
          fontSize: theme.typography.fontSize['2xl']
        }}
      >
        {formatTime(time)}
      </div>
    </div>
  );
};

export default MeditationTimer;

