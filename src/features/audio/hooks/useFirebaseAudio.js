import { useState, useEffect } from 'react';
import { storage, ensureFirebase } from '@config/secure-firebase';
import cacheService from '@services/cacheServiceRefactored';
import offlineCacheService from '@services/offlineCacheService';

export const useFirebaseAudio = (audioFileName) => {
  // console.log('🔗 useFirebaseAudio called with:', audioFileName);
  const [audioUrl, setAudioUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentFileName, setCurrentFileName] = useState(null);
  const [fallbackUsed, setFallbackUsed] = useState(false);
  const [dataSource, setDataSource] = useState(null); // 'cache' nebo 'internet'

  // Pokud není fileName, vrať prázdné hodnoty
  if (!audioFileName) {
    return { audioUrl: null, loading: false, error: 'No fileName provided' };
  }

  useEffect(() => {
    if (!audioFileName) {
      setLoading(false);
      return;
    }

    // Zkontroluj, jestli už máme URL pro tento soubor
    if (audioUrl && audioFileName === currentFileName) {
      return;
    }

    // Zkontroluj, jestli se soubor nezměnil
    if (audioFileName === currentFileName) {
      return;
    }

    const loadAudioUrl = async () => {
      try {
        setLoading(true);
        setError(null);

        await ensureFirebase();

        // Inicializuj enhanced offline cache service
        await offlineCacheService.initialize();

        // 1. Nejprve zkusíme získat originální download URL ze Storage (pokud jsme online)
        let originalUrl = null;
        let fetchFailed = false;

        try {
          const { ref, getDownloadURL } = await import('firebase/storage');
          const audioRef = ref(storage, audioFileName);
          console.log('🔗 Fetching download URL for:', audioFileName);
          originalUrl = await getDownloadURL(audioRef);
          console.log('🔗 Download URL obtained:', originalUrl);
        } catch (storageErr) {
          console.warn('⚠️ Failed to fetch download URL from storage (possibly offline):', storageErr.message);
          fetchFailed = true;
        }

        // 2. Pokud se podařilo získat URL, zkontrolujeme cache a použijeme lokální Blob URL pro bezchybné přehrávání
        if (originalUrl && originalUrl.startsWith('http')) {
          const cachedPlayableUrl = await offlineCacheService.getAudioUrl(audioFileName, originalUrl);
          
          if (cachedPlayableUrl && cachedPlayableUrl.startsWith('blob:')) {
            console.log('🔗 Using offline cached blob URL for:', audioFileName);
            setAudioUrl(cachedPlayableUrl);
            setCurrentFileName(audioFileName);
            setDataSource('cache');
            setLoading(false);
            return;
          }

          // Zkontroluj druhou cache (in-memory)
          const cachedUrl = cacheService.getAudioUrl(audioFileName);
          if (cachedUrl) {
            console.log('🔗 Using cached URL for:', audioFileName);
            setAudioUrl(cachedUrl);
            setCurrentFileName(audioFileName);
            setDataSource('cache');
            setLoading(false);
            return;
          }

          // Ulož originální URL do cache a hraj online
          cacheService.setAudioUrl(audioFileName, originalUrl);
          setAudioUrl(originalUrl);
          setCurrentFileName(audioFileName);
          setDataSource('internet');
          setFallbackUsed(false);

          // Spusť preloading na pozadí
          cacheService.preloadAudio(originalUrl, audioFileName).catch(err => {
            console.warn('Audio preload failed:', err);
          });
          
          return;
        }

        // 3. Pokud jsme offline nebo Storage selhal, zkusíme vytvořit Blob URL přímo z offline cache
        try {
          const cachedResponse = await offlineCacheService.getFile(audioFileName);
          if (cachedResponse && cachedResponse.type !== 'opaque') {
            const blob = await cachedResponse.blob();
            const blobUrl = URL.createObjectURL(blob);
            console.log('🔗 Online fetch failed, playing from offline cached blob URL:', audioFileName);
            setAudioUrl(blobUrl);
            setCurrentFileName(audioFileName);
            setDataSource('cache');
            setLoading(false);
            return;
          }
        } catch (cacheErr) {
          console.warn('⚠️ Offline cache extraction failed:', cacheErr.message);
        }

        // Pokud vše ostatní selhalo a fetch ze storage neprošel, vyhodíme chybu
        if (fetchFailed) {
          throw new Error('Nepodařilo se připojit k serveru a soubor není uložen v offline paměti.');
        }

      } catch (err) {
        console.error('Chyba při načítání audio URL:', err);

        // Fallback mechanismus - zkus lokální soubor
        if (!fallbackUsed) {
          console.log('🔗 Attempting fallback for:', audioFileName);

          // Zkus fallback URL (např. z public/media)
          const fallbackUrl = `/media/${audioFileName}`;
          console.log('🔗 Using fallback URL:', fallbackUrl);

          setAudioUrl(fallbackUrl);
          setCurrentFileName(audioFileName);
          setDataSource('cache');
          setFallbackUsed(true);
          setError(null); // Clear error při úspěšném fallbacku
        } else {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    loadAudioUrl();
  }, [audioFileName]);

  return {
    audioUrl,
    loading,
    error,
    fallbackUsed,
    dataSource
  };
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
