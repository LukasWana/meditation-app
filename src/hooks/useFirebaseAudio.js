import { useState, useEffect } from 'react';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';

export const useFirebaseAudio = (audioFileName) => {
  const [audioUrl, setAudioUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!audioFileName) {
      setLoading(false);
      return;
    }

    const loadAudioUrl = async () => {
      try {
        setLoading(true);
        setError(null);

        // Vytvoření reference k souboru v Firebase Storage
        const audioRef = ref(storage, audioFileName);

        // Získání download URL
        const url = await getDownloadURL(audioRef);
        setAudioUrl(url);
      } catch (err) {
        console.error('Chyba při načítání audio URL:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadAudioUrl();
  }, [audioFileName]);

  return { audioUrl, loading, error };
};

// Předdefinované audio soubory z vašeho Firebase Storage
export const AUDIO_FILES = {
  MALE_FSK: 'muzsky4FSK-uzkost-osamelost.mp3',
  MALE_MSK: 'muzsky4MSK-uzkost-osamelost.mp3',
  FEMALE_FSK: 'zensky4FSK-uzkost-osamelost.mp3',
  FEMALE_MSK: 'zensky4MSK-uzkost-osamelost.mp3',
  FEAR_LONELINESS: 'zbav sa strachu z osamelosti.mp3'
};
