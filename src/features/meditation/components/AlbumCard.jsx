import React from 'react';
import { FramerButton, FramerSection } from '@components';

export const AlbumCard = ({
  item,
  idx,
  activeAudio,
  onItemClick,
  getDisplayDuration,
  isLoadingCovers,
  textColors
}) => {
  // Fallback barvy, pokud textColors není poskytnuto
  const colors = textColors || {
    heading: 'text-black',
    secondary: 'text-gray-700',
    muted: 'text-gray-500',
    bgCard: 'bg-white/50',
    border: 'border-black/10',
    isDark: false
  };

  return (
    <FramerSection
      key={item.key || idx}
      animationType="slideInUp"
      delay={0.2 + idx * 0.1}
    >
      <FramerButton
        variant="ghost"
        className={`w-full p-6 text-left ${colors.bgCard} backdrop-blur rounded-3xl ${colors.border} border transition-all duration-200 hover:-translate-y-1 ${
          activeAudio ? 'pointer-events-none opacity-50' : ''
        } ${colors.isDark ? 'hover:bg-white/20' : 'hover:bg-white'}`}
        onClick={activeAudio ? undefined : () => onItemClick(item)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {item.type === 'album' && (
              <div className={`w-16 h-16 rounded-lg overflow-hidden ${colors.isDark ? 'bg-gray-700' : 'bg-gray-200'} flex-shrink-0`}>
                {item.coverImage ? (
                  <img
                    src={item.coverImage}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : (
                  <div className={`w-full h-full ${colors.isDark ? 'bg-gradient-to-br from-gray-700 to-gray-800' : 'bg-gradient-to-br from-gray-200 to-gray-300'} flex items-center justify-center ${colors.muted}`}>
                    {isLoadingCovers ? (
                      <div className="animate-spin text-lg">⏳</div>
                    ) : (
                      <div className="text-2xl">🎵</div>
                    )}
                  </div>
                )}
                <div className={`w-full h-full ${colors.isDark ? 'bg-gradient-to-br from-gray-700 to-gray-800' : 'bg-gradient-to-br from-gray-200 to-gray-300'} flex items-center justify-center ${colors.muted} placeholder-hidden`}>
                  <div className="text-2xl">🎵</div>
                </div>
              </div>
            )}
            <div className="flex-1">
              <h3 className={`text-2xl font-light ${colors.heading}`}>
                {item.title}
              </h3>
              {item.type === 'album' && (
                <p className={`text-sm ${colors.muted} mt-1`}>
                  Album • {item.tracks.length} skladieb
                </p>
              )}
              {item.type === 'song' && (
                <p className={`text-sm ${colors.muted} mt-1`}>
                  Skladba • {getDisplayDuration(item)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {item.type === 'song' && (
              <span className={`text-2xl font-light ${colors.muted}`}>
                {getDisplayDuration(item)}
              </span>
            )}
            {item.type === 'album' && (
              <span className={`text-2xl font-light ${colors.muted}`}>
                {item.totalDuration}
              </span>
            )}
          </div>
        </div>
      </FramerButton>
    </FramerSection>
  );
};
