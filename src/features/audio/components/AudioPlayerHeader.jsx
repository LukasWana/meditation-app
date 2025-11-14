import React from 'react';
import { useTheme } from '@hooks/useTheme';

const AudioPlayerHeader = ({ title, duration, formatTime }) => {
  const theme = useTheme();
  return (
    <div className="absolute top-[4vw] sm:top-8 left-1/2 transform -translate-x-1/2 w-full max-w-[480px] px-4">
      <div className="flex flex-col items-center justify-center">
        <h2
          className="text-[4vw] text-center"
          style={{
            fontWeight: theme.typography.fontWeight.light
          }}
        >
          {title}
        </h2>
        {duration && duration > 0 && (
          <span
            className="text-[20vw] mt-1"
            style={{ color: theme.colors.gray[600] }}
          >
            {formatTime(duration)}
          </span>
        )}
      </div>
    </div>
  );
};

export default AudioPlayerHeader;
