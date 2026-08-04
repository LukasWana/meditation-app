import { useEffect, useRef } from 'react';
import { backgroundAudio } from '@services/backgroundAudioService';

export function useBackgroundAudio({ isPlaying, title, artist, duration, artworkUrl }) {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!backgroundAudio.isAvailable()) return;

    if (!initializedRef.current && isPlaying) {
      initializedRef.current = true;
      backgroundAudio.start();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!backgroundAudio.isAvailable() || !initializedRef.current) return;
    if (title || artist || duration) {
      backgroundAudio.setMetadata({
        title: title || 'Meditace',
        artist: artist || 'Meditation App',
        artworkUrl,
        duration: duration || 0,
      });
    }
  }, [title, artist, duration, artworkUrl]);

  useEffect(() => {
    if (!backgroundAudio.isAvailable() || !initializedRef.current) return;
    backgroundAudio.setPlaying(isPlaying);
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      if (backgroundAudio.isAvailable() && initializedRef.current) {
        backgroundAudio.stop();
        initializedRef.current = false;
      }
    };
  }, []);
}