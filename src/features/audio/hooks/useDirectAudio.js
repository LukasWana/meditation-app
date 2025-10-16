import { useState, useEffect } from 'react';

// Přímé URL k audio souborům z Firebase Storage
// Tyto URL získáte z Firebase Console → Storage → Files → Download URL
export const DIRECT_AUDIO_URLS = {
  MALE_FSK: 'https://firebasestorage.googleapis.com/v0/b/meditations-audio.firebasestorage.app/o/muzsky4FSK-uzkost-osamelost.mp3?alt=media&token=YOUR_TOKEN_HERE',
  MALE_MSK: 'https://firebasestorage.googleapis.com/v0/b/meditations-audio.firebasestorage.app/o/muzsky4MSK-uzkost-osamelost.mp3?alt=media&token=YOUR_TOKEN_HERE',
  FEMALE_FSK: 'https://firebasestorage.googleapis.com/v0/b/meditations-audio.firebasestorage.app/o/zensky4FSK-uzkost-osamelost.mp3?alt=media&token=YOUR_TOKEN_HERE',
  FEMALE_MSK: 'https://firebasestorage.googleapis.com/v0/b/meditations-audio.firebasestorage.app/o/zensky4MSK-uzkost-osamelost.mp3?alt=media&token=YOUR_TOKEN_HERE',
  FEAR_LONELINESS: 'https://firebasestorage.googleapis.com/v0/b/meditations-audio.firebasestorage.app/o/zbav%20sa%20strachu%20z%20osamelosti.mp3?alt=media&token=YOUR_TOKEN_HERE'
};

// Hook pro přímé použití URL
export const useDirectAudio = (audioKey) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const audioUrl = DIRECT_AUDIO_URLS[audioKey] || null;

  useEffect(() => {
    if (audioUrl) {
      setLoading(true);
      setError(null);

      // Otestujeme, zda URL funguje
      fetch(audioUrl, { method: 'HEAD' })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        })
        .catch(err => {
          console.error('Chyba při načítání audio URL:', err);
          setError(err.message);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [audioUrl]);

  return { audioUrl, loading, error };
};
