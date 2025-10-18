import { motion } from 'framer-motion';

const TrackSwitcher = ({
  tracks,
  currentTrackIndex,
  onTrackChange
}) => {
  if (!tracks || tracks.length <= 1) return null;

  // Vypočítej počet skladeb na řádek (maximálně 3 řádky)
  const maxRows = 3;
  const tracksPerRow = Math.ceil(tracks.length / maxRows);
  const maxTracksPerRow = Math.min(tracksPerRow, 16); // Maximálně 16 skladeb na řádek pro lepší zobrazení

  // Rozděl skladby do řádků
  const trackRows = [];
  for (let i = 0; i < tracks.length; i += maxTracksPerRow) {
    trackRows.push(tracks.slice(i, i + maxTracksPerRow));
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-1 mt-6 max-w-full px-4">
      {trackRows.map((rowTracks, rowIndex) => (
        <div key={rowIndex} className="flex items-center justify-center space-x-1 flex-wrap gap-1">
          {rowTracks.map((track, index) => {
            const globalIndex = rowIndex * maxTracksPerRow + index;
            return (
              <motion.button
                key={globalIndex}
                onClick={() => globalIndex !== currentTrackIndex && onTrackChange(globalIndex)}
                className={`
                  w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200 flex-shrink-0
                  ${globalIndex === currentTrackIndex
                    ? 'bg-black text-white border-2 border-black cursor-default'
                    : 'bg-transparent text-black border-2 border-black hover:bg-black/10 cursor-pointer'
                  }
                `}
                whileHover={globalIndex !== currentTrackIndex ? { scale: 1.05 } : {}}
                whileTap={globalIndex !== currentTrackIndex ? { scale: 0.95 } : {}}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 20
                }}
              >
                {globalIndex + 1}
              </motion.button>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default TrackSwitcher;
