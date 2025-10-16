import React from 'react';

const AudioPlayerHeader = ({ title, duration, formatTime }) => {
  return (
    <div className="absolute top-[4vw] sm:top-8 left-1/2 transform -translate-x-1/2 w-full max-w-[480px] px-4">
      <div className="flex items-end justify-center space-x-2">
        <h2
          className="text-[4vw] font-light text-center"
          style={{fontFamily: 'Playfair Display'}}
        >
          {title}
        </h2>
        <span
          className="text-gray-600 text-[4vw]"
          style={{fontFamily: 'Playfair Display'}}
        >
          {formatTime(duration)}
        </span>
      </div>
    </div>
  );
};

export default AudioPlayerHeader;
