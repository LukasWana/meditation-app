import React from 'react';

const CurrentTimeDisplay = ({
  currentTime,
  formatTime,
  className = "text-black",
  style = {}
}) => {
  return (
    <div
      className={`${className} text-32`}
      style={style}
    >
      {formatTime(currentTime)}
    </div>
  );
};

export default CurrentTimeDisplay;
