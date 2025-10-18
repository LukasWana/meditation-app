import React from 'react';

const CurrentTimeDisplay = ({
  currentTime,
  formatTime,
  className = "text-black",
  style = {}
}) => {
  return (
    <div
      className={className}
      style={{
        fontFamily: 'Playfair Display',
        fontSize: '32px',
        ...style
      }}
    >
      {formatTime(currentTime)}
    </div>
  );
};

export default CurrentTimeDisplay;
