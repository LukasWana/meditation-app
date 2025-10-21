import React from 'react';
import { AlbumCard } from './AlbumCard';
export const AlbumGrid = ({
  hudbaItems,
  activeAudio,
  onItemClick,
  getDisplayDuration,
  isLoadingCovers
}) => {
  if (hudbaItems.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 text-lg">Žiadne skladby nie sú dostupné</p>
        <p className="text-gray-500 text-sm mt-2">Skúste zmeniť nastavenia v menu</p>
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
        />
      ))}
    </div>
  );
};
