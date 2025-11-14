import React from 'react';
import { AlbumCard } from './AlbumCard';
import { useTheme } from '@hooks/useTheme';

export const AlbumGrid = ({
  hudbaItems,
  activeAudio,
  onItemClick,
  getDisplayDuration,
  isLoadingCovers,
  textColors
}) => {
  const theme = useTheme();

  if (hudbaItems.length === 0) {
    const bgCard = textColors?.bgCard
      ? (typeof textColors.bgCard === 'string' && textColors.bgCard.startsWith('bg-')
          ? theme.colors.overlay.white50
          : textColors.bgCard)
      : theme.colors.overlay.white50;
    const borderColor = textColors?.border
      ? (typeof textColors.border === 'string' && textColors.border.startsWith('border-')
          ? theme.colors.overlay.black10
          : textColors.border)
      : theme.colors.overlay.black10;
    const secondaryColor = textColors?.secondary
      ? (typeof textColors.secondary === 'string' && textColors.secondary.startsWith('text-')
          ? theme.colors.gray[600]
          : textColors.secondary)
      : theme.colors.gray[600];
    const mutedColor = textColors?.muted
      ? (typeof textColors.muted === 'string' && textColors.muted.startsWith('text-')
          ? theme.colors.gray[500]
          : textColors.muted)
      : theme.colors.gray[500];

    return (
      <div
        className="text-center py-8 rounded-3xl border backdrop-blur"
        style={{
          backgroundColor: bgCard,
          borderColor: borderColor
        }}
      >
        <p
          className="text-lg"
          style={{ color: secondaryColor, fontSize: theme.typography.fontSize.lg }}
        >
          Žiadne skladby nie sú dostupné
        </p>
        <p
          className="text-sm mt-2"
          style={{ color: mutedColor, fontSize: theme.typography.fontSize.sm }}
        >
          Skúste zmeniť nastavenia v menu
        </p>
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
