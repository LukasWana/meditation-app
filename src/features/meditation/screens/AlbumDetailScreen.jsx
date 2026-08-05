import React, { useState } from 'react';
import { motion } from 'framer-motion';
import FramerSection from '@components/FramerSection';
import FramerButton from '@components/FramerButton';
import BackButton from '@components/BackButton';
import { Heading } from '@components/ui/Heading';
import { AudioPlayer } from '@features/audio';
import { useTheme } from '@contexts/ThemeContext';

const AlbumDetailScreen = ({
  album,
  onNavigateToScreen,
  onPlayerStateChange,
  onTouchStart,
  onTouchMove,
  onTouchEnd
}) => {
  const [activeAudio, setActiveAudio] = useState(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const { currentTheme, getScreenBackgroundColor } = useTheme();

  // Ochrana proti undefined album - MUSÍ BÝT NA ZAČÁTKU
  if (!album || !album.tracks) {
    return (
      <motion.div
        className="min-h-screen w-full max-w-full flex flex-col items-center justify-center"
        style={{ backgroundColor: getScreenBackgroundColor() }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="text-center">
          <Heading level={1}>
            Album nenalezeno
          </Heading>
          <button
            onClick={() => onNavigateToScreen('hudba')}
            className="px-6 py-3 bg-white/50 backdrop-blur rounded-lg border border-black/10 hover:bg-white/70 transition-colors"
          >
            Zpět na hudbu
          </button>
        </div>
      </motion.div>
    );
  }

  const handleTrackClick = (track, index) => {
    // Vytvoř audio objekt stejně jako v HudbaScreen
    const audioData = {
      audioSrc: track.audioSrc,
      title: track.trackName, // Pouze název skladby, bez názvu alba
      fileName: track.fileName
    };
    setActiveAudio(audioData);
    setCurrentTrackIndex(index);
    onPlayerStateChange(true);
  };

  const handleTrackChange = (newIndex) => {
    if (album && album.tracks && album.tracks[newIndex]) {
      const track = album.tracks[newIndex];
      const audioData = {
        audioSrc: track.audioSrc,
        title: track.trackName,
        fileName: track.fileName
      };
      setActiveAudio(audioData);
      setCurrentTrackIndex(newIndex);
    }
  };

  const handleBackClick = () => {
    onNavigateToScreen('hudba');
  };

  const handleCloseAudio = () => {
    setActiveAudio(null);
    setCurrentTrackIndex(0);
    onPlayerStateChange(false);
  };

  return (
    <motion.div
      className="min-h-screen w-full max-w-full flex flex-col overflow-x-hidden relative"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      style={{ height: '100vh' }}
    >
      {/* Cover background */}
      {album?.coverImage && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
          style={{
            backgroundImage: `url(${album.coverImage})`,
            filter: 'blur(20px) brightness(0.8)'
          }}
        />
      )}

      {/* Content overlay */}
      <div
        className="relative z-10 min-h-screen w-full backdrop-blur-sm flex flex-col screen-safe-top"
        style={{
          backgroundColor: currentTheme?.colors?.background
            ? `${currentTheme.colors.background}CC`
            : 'rgba(244, 221, 196, 0.8)'
        }}
      >
        {/* Header s back buttonem */}
        <div className="p-2 sm:p-8 pt-4 pb-4">
          <BackButton onClick={handleBackClick} />
        </div>

        {/* Album info */}
        <div className="flex-1 flex flex-col items-center justify-start p-2 sm:p-8 pb-20">
        <FramerSection
          className="text-center mb-6"
          animationType="fadeIn"
          delay={0.1}
        >
          {/* Album cover */}
          {album.coverImage && (
            <motion.div
              className="w-32 h-32 sm:w-48 sm:h-48 mx-auto mb-6 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.2, ease: "easeInOut" }}
            >
              <img
                src={album.coverImage}
                alt={album.title}
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
                fetchPriority="low"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-4xl sm:text-6xl placeholder-hidden">
                📀
              </div>
            </motion.div>
          )}

          {/* Album title */}
          <div style={{ height: '3.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '0.5rem' }}>
            <Heading level={1}>
              {album.title}
            </Heading>
          </div>

          {/* Track count */}
          <p className="text-lg sm:text-xl text-gray-700">
            {album.tracks.length} skladeb
          </p>
        </FramerSection>

        {/* Track list */}
        <div className="w-full max-w-2xl space-y-3">
          {album.tracks.map((track, index) => (
            <FramerSection
              key={track.trackNumber}
              animationType="slideInUp"
              delay={0.3 + index * 0.1}
            >
              <FramerButton
                variant="ghost"
                className="w-full p-4 sm:p-6 text-left bg-white/50 backdrop-blur rounded-none border border-black/10"
                onClick={() => handleTrackClick(track, index)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Track number */}
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/10 flex items-center justify-center text-sm sm:text-base font-medium text-black flex-shrink-0">
                      {track.trackNumber}
                    </div>

                    {/* Track info */}
                    <div className="flex-1 min-w-0">
                      <Heading level={3} visual={2} className="truncate">
                        {track.trackName}
                      </Heading>
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="flex-shrink-0 ml-4">
                    <span className="text-base sm:text-xl font-light text-gray-500">
                      {track.duration}
                    </span>
                  </div>
                </div>
              </FramerButton>
            </FramerSection>
          ))}
        </div>
        </div>
      </div>

      {/* Audio Player */}
      {activeAudio && (
        <AudioPlayer
          audioSrc={activeAudio.audioSrc}
          title={activeAudio.title}
          onClose={handleCloseAudio}
          className="fixed inset-0 z-50"
          albumCover={album?.coverImage}
          albumTracks={album?.tracks}
          currentTrackIndex={currentTrackIndex}
          onTrackChange={handleTrackChange}
        />
      )}
    </motion.div>
  );
};

export default AlbumDetailScreen;
