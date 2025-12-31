import React from 'react';
import { FramerButton, FramerSection } from '@components';

export const AlbumCard = ({
  item,
  idx,
  activeAudio,
  onItemClick,
  getDisplayDuration,
  isLoadingCovers
}) => {
  return (
    <FramerSection
      animationType="slideInUp"
      delay={0.2 + idx * 0.1}
    >
      <FramerButton
        variant="ghost"
        className={`w-full p-6 text-left bg-white/50 backdrop-blur rounded-none border border-black/10 ${
          activeAudio ? 'pointer-events-none opacity-50' : ''
        }`}
        onClick={activeAudio ? undefined : () => onItemClick(item)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {item.type === 'album' && (
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                {item.coverImage ? (
                  <img
                    src={item.coverImage}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      if (e.target && e.target.nextSibling) {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-500">
                    {isLoadingCovers ? (
                      <div className="animate-spin text-lg">⏳</div>
                    ) : (
                      <div className="text-2xl">🎵</div>
                    )}
                  </div>
                )}
                <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-500 placeholder-hidden">
                  <div className="text-2xl">🎵</div>
                </div>
              </div>
            )}
            <div className="flex-1">
              <h3 className="text-2xl font-light">
                {item.title}
              </h3>
              {item.type === 'album' && (
                <p className="text-sm text-gray-500 mt-1">
                  Album • {item.tracks.length} skladieb
                </p>
              )}
              {item.type === 'song' && (
                <p className="text-sm text-gray-500 mt-1">
                  Skladba • {getDisplayDuration(item)}
                </p>
              )}
            </div>
          </div>
          {item.type === 'album' && (
            <div className="flex items-center space-x-3">
              <span className="text-2xl font-light text-gray-500">
                {item.totalDuration}
              </span>
            </div>
          )}
        </div>
      </FramerButton>
    </FramerSection>
  );
};
