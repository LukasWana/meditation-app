import React from 'react';
import { AlbumCard } from './AlbumCard';

export const AlbumGrid = ({
  hudbaItems,
  activeAudio,
  onItemClick,
  getDisplayDuration,
  isLoadingCovers,
  textColors
}) => {
  if (hudbaItems.length === 0) {
    return (
      <div className={`text-center py-8 ${textColors?.bgCard || 'bg-white/50'} rounded-3xl ${textColors?.border || 'border-black/10'} border backdrop-blur`}>
        <p className={`${textColors?.secondary || 'text-gray-600'} text-lg`}>Žiadne skladby nie sú dostupné</p>
        <p className={`${textColors?.muted || 'text-gray-500'} text-sm mt-2`}>Skúste zmeniť nastavenia v menu</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {hudbaItems.map((item, idx) => (
        <AlbumCard
          key={item.key || idx}
          item={item}
          idx={idx}
          activeAudio={activeAudio}
          onItemClick={onItemClick}
          getDisplayDuration={getDisplayDuration}
          isLoadingCovers={isLoadingCovers}
          textColors={textColors}
        />
      ))}
    </div>
  );
};
