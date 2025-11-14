import React from 'react';
import { FramerButton, FramerSection } from '@components';
import { useTheme } from '@hooks/useTheme';

export const AlbumCard = ({
  item,
  idx,
  activeAudio,
  onItemClick,
  getDisplayDuration,
  isLoadingCovers,
  textColors
}) => {
  const theme = useTheme();
  // Fallback barvy, pokud textColors není poskytnuto
  const colors = textColors || {
    heading: theme.colors.black,
    secondary: theme.colors.gray[700],
    muted: theme.colors.gray[500],
    bgCard: theme.colors.overlay.white50,
    border: theme.colors.overlay.black10,
    isDark: false
  };

  // Pomocné funkce pro získání barvy (podporuje jak string třídy, tak theme hodnoty)
  const getColor = (colorKey) => {
    const color = colors[colorKey];
    if (typeof color === 'string' && color.startsWith('text-')) {
      // Pokud je to Tailwind třída, použij theme ekvivalent
      if (colorKey === 'heading') return theme.colors.black;
      if (colorKey === 'secondary') return theme.colors.gray[700];
      if (colorKey === 'muted') return theme.colors.gray[500];
    }
    return color;
  };

  const headingColor = getColor('heading');
  const mutedColor = getColor('muted');
  const bgCard = typeof colors.bgCard === 'string' && colors.bgCard.startsWith('bg-')
    ? theme.colors.overlay.white50
    : colors.bgCard || theme.colors.overlay.white50;
  const borderColor = typeof colors.border === 'string' && colors.border.startsWith('border-')
    ? theme.colors.overlay.black10
    : colors.border || theme.colors.overlay.black10;

  return (
    <FramerSection
      key={item.key || idx}
      animationType="slideInUp"
      delay={0.2 + idx * 0.1}
    >
      <FramerButton
        variant="ghost"
        className={`w-full p-6 text-left backdrop-blur rounded-3xl border transition-all duration-200 hover:-translate-y-1 ${
          activeAudio ? 'pointer-events-none opacity-50' : ''
        }`}
        style={{
          backgroundColor: bgCard,
          borderColor: borderColor
        }}
        onMouseEnter={(e) => {
          if (!activeAudio) {
            e.currentTarget.style.backgroundColor = colors.isDark ? theme.colors.overlay.white20 : theme.colors.white;
          }
        }}
        onMouseLeave={(e) => {
          if (!activeAudio) {
            e.currentTarget.style.backgroundColor = bgCard;
          }
        }}
        onClick={activeAudio ? undefined : () => onItemClick(item)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {item.type === 'album' && (
              <div
                className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0"
                style={{ backgroundColor: colors.isDark ? theme.colors.gray[700] : theme.colors.gray[200] }}
              >
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
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{
                      backgroundImage: colors.isDark
                        ? `linear-gradient(to bottom right, ${theme.colors.gray[700]}, ${theme.colors.gray[800]})`
                        : `linear-gradient(to bottom right, ${theme.colors.gray[200]}, ${theme.colors.gray[300]})`,
                      color: mutedColor
                    }}
                  >
                    {isLoadingCovers ? (
                      <div className="animate-spin text-lg">⏳</div>
                    ) : (
                      <div className="text-2xl">🎵</div>
                    )}
                  </div>
                )}
                <div
                  className="w-full h-full flex items-center justify-center placeholder-hidden"
                  style={{
                    backgroundImage: colors.isDark
                      ? `linear-gradient(to bottom right, ${theme.colors.gray[700]}, ${theme.colors.gray[800]})`
                      : `linear-gradient(to bottom right, ${theme.colors.gray[200]}, ${theme.colors.gray[300]})`,
                    color: mutedColor
                  }}
                >
                  <div className="text-2xl">🎵</div>
                </div>
              </div>
            )}
            <div className="flex-1">
              <h3
                className="text-2xl font-light"
                style={{
                  color: headingColor,
                  fontWeight: theme.typography.fontWeight.light,
                  fontSize: theme.typography.fontSize['2xl']
                }}
              >
                {item.title}
              </h3>
              {item.type === 'album' && (
                <p
                  className="text-sm mt-1"
                  style={{ color: mutedColor, fontSize: theme.typography.fontSize.sm }}
                >
                  Album • {item.tracks.length} skladieb
                </p>
              )}
              {item.type === 'song' && (
                <p
                  className="text-sm mt-1"
                  style={{ color: mutedColor, fontSize: theme.typography.fontSize.sm }}
                >
                  Skladba • {getDisplayDuration(item)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {item.type === 'song' && (
              <span
                className="text-2xl font-light"
                style={{
                  color: mutedColor,
                  fontWeight: theme.typography.fontWeight.light,
                  fontSize: theme.typography.fontSize['2xl']
                }}
              >
                {getDisplayDuration(item)}
              </span>
            )}
            {item.type === 'album' && (
              <span
                className="text-2xl font-light"
                style={{
                  color: mutedColor,
                  fontWeight: theme.typography.fontWeight.light,
                  fontSize: theme.typography.fontSize['2xl']
                }}
              >
                {item.totalDuration}
              </span>
            )}
          </div>
        </div>
      </FramerButton>
    </FramerSection>
  );
};
