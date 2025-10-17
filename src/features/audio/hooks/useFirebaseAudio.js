import { useState, useEffect } from 'react';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '@services/firebase';
import cacheService from '@services/cacheService';

export const useFirebaseAudio = (audioFileName) => {
  console.log('useFirebaseAudio called with audioFileName:', audioFileName);
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
        console.log('loadAudioUrl - Loading:', audioFileName);
        setLoading(true);
        setError(null);

        // Zkontroluj cache první
        const cachedUrl = cacheService.getAudioUrl(audioFileName);
        if (cachedUrl) {
          console.log('loadAudioUrl - From cache:', audioFileName);
          setAudioUrl(cachedUrl);
          setLoading(false);
          return;
        }

        // Vytvoření reference k souboru v Firebase Storage
        const audioRef = ref(storage, audioFileName);

        // Získání download URL
        const url = await getDownloadURL(audioRef);

        // Ulož do cache
        cacheService.setAudioUrl(audioFileName, url);

        console.log('loadAudioUrl - Success, URL:', url);
        setAudioUrl(url);

        // Spusť metadata preloading pro rychlejší přístup příště
        cacheService._preloadFirebaseMetadata(url, audioFileName).catch(err => {
          console.warn('Metadata preload failed:', err);
        });

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
// Formát: "hlas4kód-téma.mp3"
// hlas: muzsky/zensky
// kód: F=female, M=male, N=none/general + SK/CZ/EN=jazyk
export const AUDIO_FILES = {
  // Úzkosť a osamelosť
  ANXIETY_FEMALE_VOICE: 'muzsky4FSK-uzkost-osamelost.mp3', // Mužský hlas pro ženy
  ANXIETY_MALE_VOICE: 'zensky4MSK-uzkost-osamelost.mp3',   // Ženský hlas pro muže
  ANXIETY_GENERAL: 'muzsky4NSK-uzkost-osamelost.mp3',      // Obecný obsah

  // Strach z osamelosti
  FEAR_LONELINESS_FEMALE: 'zensky4FSK-strach-osamelost.mp3',
  FEAR_LONELINESS_MALE: 'muzsky4MSK-strach-osamelost.mp3',
  FEAR_LONELINESS_GENERAL: 'zensky4NSK-strach-osamelost.mp3',

  // Stres z práce
  STRESS_WORK_FEMALE: 'zensky4FSK-stres-praca.mp3',
  STRESS_WORK_MALE: 'muzsky4MSK-stres-praca.mp3',
  STRESS_WORK_GENERAL: 'muzsky4NSK-stres-praca.mp3',

  // Problémy se spánkem
  SLEEP_FEMALE: 'zensky4FSK-spank.mp3',
  SLEEP_MALE: 'muzsky4MSK-spank.mp3',
  SLEEP_GENERAL: 'zensky4NSK-spank.mp3',

  // Deprese
  DEPRESSION_FEMALE: 'muzsky4FSK-depresia.mp3',
  DEPRESSION_MALE: 'zensky4MSK-depresia.mp3',
  DEPRESSION_GENERAL: 'muzsky4NSK-depresia.mp3',

  // Relaxace
  RELAXATION_FEMALE: 'zensky4FSK-relaxacia.mp3',
  RELAXATION_MALE: 'muzsky4MSK-relaxacia.mp3',
  RELAXATION_GENERAL: 'zensky4NSK-relaxacia.mp3'
};

// Seznam všech audio souborů pro filtrování
export const ALL_AUDIO_FILES = Object.values(AUDIO_FILES);
