import React from 'react';
import { useTheme } from '@hooks/useTheme';

const SimpleLoading = ({ message = "Načítám data...", show = true }) => {
  const theme = useTheme();

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        backgroundColor: theme.colors.background,
        zIndex: theme.zIndex.modal
      }}
    >
      <div className="text-center">
        <div
          className="animate-spin rounded-full mx-auto mb-4"
          style={{
            height: theme.sizes.icon.lg,
            width: theme.sizes.icon.lg,
            borderWidth: '2px',
            borderBottomColor: theme.colors.gray[700],
            borderTopColor: 'transparent',
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
          }}
        ></div>
        <p
          className="mb-2"
          style={{
            fontSize: theme.typography.fontSize.xl,
            color: theme.colors.gray[700]
          }}
        >
          {message}
        </p>
        <div
          className="rounded-full h-2 mx-auto"
          style={{
            width: '16rem',
            backgroundColor: theme.colors.gray[200],
          }}
        >
          <div
            className="h-2 rounded-full animate-pulse"
            style={{
              width: '60%',
              backgroundColor: theme.colors.gray[700]
            }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default SimpleLoading;

