import React, { createContext, useContext, useState } from 'react';

const AudioAnalysisContext = createContext();

export const useAudioAnalysis = () => {
  const context = useContext(AudioAnalysisContext);
  if (!context) {
    throw new Error('useAudioAnalysis must be used within AudioAnalysisProvider');
  }
  return context;
};

export const AudioAnalysisProvider = ({ children }) => {
  const [audioData, setAudioData] = useState({
    frequencies: new Array(64).fill(0),
    amplitude: 0,
    bass: 0,
    mid: 0,
    treble: 0
  });

  return (
    <AudioAnalysisContext.Provider
      value={{
        audioData,
        setAudioData
      }}
    >
      {children}
    </AudioAnalysisContext.Provider>
  );
};

