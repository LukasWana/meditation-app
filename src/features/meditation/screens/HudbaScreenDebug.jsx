import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FramerButton, FramerSection, FramerPageTransition, BackButton } from '@components';
import { AudioPlayer } from '@features/audio';
import { useFirebaseHudbaFilter } from '@features/audio/hooks/useFirebaseHudbaFilter';
import { log } from '@services/logger';
import { captureError } from '@services/errorMonitoring';

const HudbaScreenDebug = ({
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  gender = 'none',
  onPlayerStateChange
}) => {
  const [activeAudio, setActiveAudio] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});

  // Použij původní hudební filtrovací systém
  const { hudbaItems, isLoading, error, stats } = useFirebaseHudbaFilter();

  // Rozšířené debug logging - opraveno pro zabránění nekonečné smyčky
  React.useEffect(() => {
    const debugData = {
      isLoading,
      error,
      itemsCount: hudbaItems?.length || 0,
      stats: stats ? {
        totalFiles: stats.totalFiles,
        availableFiles: stats.availableFiles,
        lastUpdated: stats.lastUpdated
      } : null,
      items: hudbaItems?.slice(0, 3).map(item => ({
        key: item.key,
        title: item.title,
        type: item.type
      })) || [] // Pouze základní info pro debug
    };

    setDebugInfo(debugData);
    log.debug('HudbaScreenDebug state:', debugData);

    if (error) {
      captureError('HudbaScreen loading error', error, { debugData });
    }
  }, [isLoading, error, hudbaItems?.length, stats?.totalFiles, stats?.availableFiles]);

  const handleItemClick = (item) => {
    log.audio('Item clicked:', item);

    if (item.type === 'album') {
      // Spusť první skladbu z alba
      if (item.tracks && item.tracks.length > 0) {
        const firstTrack = item.tracks[0];
        setActiveAudio({
          audioSrc: firstTrack.audioSrc,
          title: firstTrack.trackName,
          fileName: firstTrack.fileName,
          albumCover: item.coverImage,
          albumTracks: item.tracks,
          currentTrackIndex: 0
        });
        onPlayerStateChange?.(true);
      }
    } else if (item.audioSrc) {
      // Pro jednotlivé skladby
      setActiveAudio({
        ...item,
        albumCover: item.coverImage // Předaj cover obrázek
      });
      onPlayerStateChange?.(true);
    }
  };

  const handleCloseAudio = () => {
    setActiveAudio(null);
    onPlayerStateChange?.(false);
  };

  const handleRefresh = () => {
    log.info('Manual refresh triggered');
    window.location.reload();
  };

  // Loading state - rozšířený s debug info
  if (isLoading) {
    return (
      <FramerPageTransition screenKey="hudba">
        <div className="min-h-screen w-full max-w-full bg-[#f4ddc4] flex flex-col items-center justify-center p-2 sm:p-8 pb-20 overflow-x-hidden relative">
          <BackButton onClick={() => onNavigateToScreen('home')} />
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-700 mx-auto mb-4"></div>
            <p className="text-xl text-gray-700">Načítám hudbu...</p>
            <p className="text-sm text-gray-500 mt-2">Debug: {JSON.stringify(debugInfo)}</p>
          </div>
        </div>
      </FramerPageTransition>
    );
  }

  // Error state - rozšířený s debug info
  if (error) {
    return (
      <FramerPageTransition screenKey="hudba">
        <div className="min-h-screen w-full max-w-full bg-[#f4ddc4] flex flex-col items-center justify-center p-2 sm:p-8 pb-20 overflow-x-hidden relative">
          <BackButton onClick={() => onNavigateToScreen('home')} />
          <div className="text-center">
            <p className="text-xl text-red-600 mb-4">Chyba při načítání</p>
            <p className="text-gray-700 mb-4">{error}</p>
            <div className="text-sm text-gray-500 mb-4 p-4 bg-white/30 rounded-lg">
              <p>Debug info:</p>
              <pre className="text-xs overflow-auto max-h-32">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Obnovit stránku
            </button>
          </div>
        </div>
      </FramerPageTransition>
    );
  }

  return (
    <FramerPageTransition screenKey="bez-slov">
      <div
        className={`min-h-screen w-full max-w-full bg-[#f4ddc4] flex flex-col items-center justify-center p-2 sm:p-8 pb-20 overflow-x-hidden relative ${
          activeAudio ? 'pointer-events-none' : ''
        }`}
        onTouchStart={activeAudio ? undefined : onTouchStart}
        onTouchMove={activeAudio ? undefined : onTouchMove}
        onTouchEnd={activeAudio ? undefined : onTouchEnd}
      >
        <BackButton
          onClick={() => onNavigateToScreen('home')}
          className={activeAudio ? 'pointer-events-none opacity-50' : ''}
        />

        <div className="max-w-md w-full mt-16">
          <FramerSection
            className="text-center mb-8"
            animationType="fadeIn"
            delay={0.1}
          >
            <h1 className="text-6xl font-light" style={{fontFamily: 'Playfair Display'}}>
              hudba
            </h1>

            {/* Debug info */}
            {import.meta.env.MODE === 'development' && (
              <div className="text-center mb-4 p-2 bg-white/30 rounded-lg text-xs">
                <p>Items: {hudbaItems?.length || 0}</p>
                <p>Loading: {isLoading ? 'Yes' : 'No'}</p>
                <p>Error: {error || 'None'}</p>
              </div>
            )}
          </FramerSection>

          <div className="space-y-4">
            {hudbaItems.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 text-lg">Žiadne skladby nie sú dostupné</p>
                <p className="text-gray-500 text-sm mt-2">Skúste zmeniť nastavenia v menu</p>
                <div className="text-xs text-gray-400 mt-4 p-2 bg-white/30 rounded">
                  Debug: {JSON.stringify(debugInfo)}
                </div>
              </div>
            ) : (
              hudbaItems.map((item, idx) => (
                <FramerSection
                  key={item.key || idx}
                  animationType="slideInUp"
                  delay={0.2 + idx * 0.1}
                >
                  <FramerButton
                    variant="ghost"
                    className={`w-full p-6 text-left bg-white/50 backdrop-blur rounded-none border border-black/10 ${
                      activeAudio ? 'pointer-events-none opacity-50' : ''
                    }`}
                    onClick={activeAudio ? undefined : () => handleItemClick(item)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {item.type === 'album' && item.coverImage && (
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                            <img
                              src={item.coverImage}
                              alt={item.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400" style={{display: 'none'}}>
                              🎵
                            </div>
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="text-2xl font-light" style={{fontFamily: 'Playfair Display'}}>
                            {item.title}
                          </h3>
                          {item.type === 'album' && (
                            <p className="text-sm text-gray-500 mt-1">
                              Album • {item.tracks?.length || 0} skladieb
                            </p>
                          )}
                          {item.type === 'hudba' && item.duration && (
                            <p className="text-sm text-gray-500 mt-1">
                              {item.duration}
                            </p>
                          )}
                          {/* Debug info pro každou položku */}
                          {import.meta.env.MODE === 'development' && (
                            <p className="text-xs text-gray-400 mt-1">
                              Type: {item.type}, AudioSrc: {item.audioSrc ? 'Yes' : 'No'}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {item.type === 'hudba' && (
                          <span className="text-2xl font-light text-gray-500" style={{fontFamily: 'Playfair Display'}}>
                            {item.duration}
                          </span>
                        )}
                        {item.type === 'album' && (
                          <span className="text-2xl font-light text-gray-500" style={{fontFamily: 'Playfair Display'}}>
                            {item.totalDuration}
                          </span>
                        )}
                      </div>
                    </div>
                  </FramerButton>
                </FramerSection>
              ))
            )}
          </div>

        </div>

        {/* Audio Player Modal */}
        <AnimatePresence>
          {activeAudio && (
            <AudioPlayer
              key="audio-player"
              audioSrc={activeAudio.audioSrc}
              title={activeAudio.title}
              onClose={handleCloseAudio}
              albumCover={activeAudio.albumCover}
              albumTracks={activeAudio.albumTracks}
              currentTrackIndex={activeAudio.currentTrackIndex}
              onTrackChange={(newIndex) => {
                if (activeAudio.albumTracks && activeAudio.albumTracks[newIndex]) {
                  const track = activeAudio.albumTracks[newIndex];
                  setActiveAudio({
                    ...activeAudio,
                    audioSrc: track.audioSrc,
                    title: track.trackName,
                    fileName: track.fileName,
                    currentTrackIndex: newIndex
                  });
                }
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </FramerPageTransition>
  );
};

export default HudbaScreenDebug;
