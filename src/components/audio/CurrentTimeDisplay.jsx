import React from 'react';

const CurrentTimeDisplay = ({
  currentTime,
  formatTime,
  className = "text-black",
  style = {}
}) => {
  return (
    <span
      className={className}
      style={{
        fontFamily: 'Playfair Display',
        verticalAlign: 'baseline',
        fontSize: '22px',
        ...style
      }}
    >
      {formatTime(currentTime)}
    </span>
  );
};

export default CurrentTimeDisplay;
