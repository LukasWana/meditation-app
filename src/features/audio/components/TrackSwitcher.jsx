import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const TrackSwitcher = ({
  tracks,
  currentTrackIndex,
  onTrackChange
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const tracksPerPage = 10;

  if (!tracks || tracks.length <= 1) return null;

  // Počet stránek
  const totalPages = Math.ceil(tracks.length / tracksPerPage);

  // Aktuální skladby na stránce
  const startIndex = currentPage * tracksPerPage;
  const endIndex = Math.min(startIndex + tracksPerPage, tracks.length);
  const currentTracks = tracks.slice(startIndex, endIndex);

  // Automatické přepnutí na správnou stránku při změně currentTrackIndex
  useEffect(() => {
    const trackPage = Math.floor(currentTrackIndex / tracksPerPage);
    if (trackPage !== currentPage) {
      setCurrentPage(trackPage);
    }
  }, [currentTrackIndex, tracksPerPage]);

  // Inteligentní zalamování - zalamuj až když je potřeba
  const shouldWrap = tracks.length > 10; // Zalamuj až při více než 10 skladbách

  if (!shouldWrap) {
    // Pro malý počet skladeb - jeden řádek
    return (
      <div className="flex items-center justify-center space-x-2 mt-6 max-w-full px-4">
        {currentTracks.map((track, index) => {
          const globalIndex = startIndex + index;
          return (
            <motion.button
              key={globalIndex}
              onClick={() => globalIndex !== currentTrackIndex && onTrackChange(globalIndex)}
              className={`
                w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 flex-shrink-0
                ${globalIndex === currentTrackIndex
                  ? 'bg-black text-white cursor-default'
                  : 'bg-white text-black hover:bg-gray-100 cursor-pointer'
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
    );
  }

  // Pro velký počet skladeb - paginace s 10 skladbami na stránku (5 na řádek, 2 řádky)
  const maxTracksPerRow = 5; // 5 skladeb na řádek pro lepší zobrazení

  // Rozděl aktuální skladby do řádků
  const trackRows = [];
  for (let i = 0; i < currentTracks.length; i += maxTracksPerRow) {
    trackRows.push(currentTracks.slice(i, i + maxTracksPerRow));
  }


  // Navigační funkce
  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4 mt-6 max-w-full px-4">
      {/* Skladby */}
      {trackRows.map((rowTracks, rowIndex) => (
        <div key={rowIndex} className="flex items-center justify-center space-x-2">
          {rowTracks.map((track, index) => {
            const globalIndex = startIndex + rowIndex * maxTracksPerRow + index;
            return (
              <motion.button
                key={globalIndex}
                onClick={() => {
                  if (globalIndex !== currentTrackIndex) {
                    onTrackChange(globalIndex);
                  }
                }}
                className={`
                  w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 flex-shrink-0
                  ${globalIndex === currentTrackIndex
                    ? 'bg-black text-white cursor-default'
                    : 'bg-white text-black hover:bg-gray-100 cursor-pointer'
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

      {/* Navigace */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-4 mt-4">
          {/* Předchozí stránka */}
          <motion.button
            onClick={goToPrevPage}
            disabled={currentPage === 0}
            className={`
              w-10 h-10 rounded-full flex items-center justify-center text-base font-medium transition-all duration-200
              ${currentPage === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-20'
                : 'bg-white text-black hover:bg-gray-100 cursor-pointer'
              }
            `}
            whileHover={currentPage > 0 ? { scale: 1.05 } : {}}
            whileTap={currentPage > 0 ? { scale: 0.95 } : {}}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20
            }}
          >
            ←
          </motion.button>

          {/* Informace o stránce */}
          <span className="text-sm text-black font-medium">
            {currentPage + 1} / {totalPages}
          </span>

          {/* Další stránka */}
          <motion.button
            onClick={goToNextPage}
            disabled={currentPage === totalPages - 1}
            className={`
              w-10 h-10 rounded-full flex items-center justify-center text-base font-medium transition-all duration-200
              ${currentPage === totalPages - 1
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-20'
                : 'bg-white text-black hover:bg-gray-100 cursor-pointer'
              }
            `}
            whileHover={currentPage < totalPages - 1 ? { scale: 1.05 } : {}}
            whileTap={currentPage < totalPages - 1 ? { scale: 0.95 } : {}}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20
            }}
          >
            →
          </motion.button>
        </div>
      )}
    </div>
  );
};

export default TrackSwitcher;
