import React from 'react';
import { Heading } from '@components/ui/Heading';

const AudioPlayerHeader = ({ title, duration, formatTime }) => {
  return (
    <div className="absolute top-[4vw] sm:top-8 left-1/2 transform -translate-x-1/2 w-full max-w-[480px] px-4">
      <div className="flex flex-col items-center justify-center">
        <Heading level={2} visual={2} className="text-center">
          {title}
        </Heading>
        {duration && duration > 0 && (
          <span
            className="text-gray-600 text-[20vw] mt-1"
          >
            {formatTime(duration)}
          </span>
        )}
      </div>
    </div>
  );
};

export default AudioPlayerHeader;
