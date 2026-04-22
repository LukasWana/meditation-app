
import React from 'react';
import { useTheme } from '@contexts/ThemeContext';

const SimpleLoading = ({ message = "Načítám data...", show = true }) => {
  if (!show) return null;

  const { getScreenBackgroundColor, getCurrentThemeColors } = useTheme();
  const themeColors = getCurrentThemeColors?.() || {};

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{
        backgroundColor: getScreenBackgroundColor?.() || '#f4ddc4'
      }}
    >
      <div className="text-center">
        <div
          className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto mb-4"
          style={{
            borderColor: themeColors?.primary || 'rgba(0, 0, 0, 0.3)',
            borderBottomColor: themeColors?.primary || 'rgba(0, 0, 0, 0.8)'
          }}
        ></div>
        <p className="text-xl mb-2" style={{ color: themeColors?.text || 'rgba(0, 0, 0, 1)' }}>{message}</p>
        <div
          className="w-64 rounded-full h-2 mx-auto"
          style={{
            backgroundColor: themeColors?.card || 'rgba(200, 200, 200, 0.5)'
          }}
        >
          <div
            className="h-2 rounded-full animate-pulse"
            style={{
              width: '60%',
              backgroundColor: themeColors?.primary || 'rgba(0, 0, 0, 0.6)'
            }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default SimpleLoading;

