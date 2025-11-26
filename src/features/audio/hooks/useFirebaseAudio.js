import { useState, useEffect } from 'react';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '@services/firebase';
import cacheService from '@services/cacheServiceRefactored';
import enhancedOfflineCacheService from '@services/enhancedOfflineCacheService';

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

        // Inicializuj enhanced offline cache service
        await enhancedOfflineCacheService.initialize();

        // Zkontroluj offline cache PRVNÍ - šetří mobilní data
        const offlineUrl = await enhancedOfflineCacheService.getFile(audioFileName);
        if (offlineUrl) {
          console.log('🔗 Using offline URL for:', audioFileName, '(saving mobile data)');
          setAudioUrl(offlineUrl);
          setCurrentFileName(audioFileName);
          setDataSource('cache');
          setLoading(false);
          return;
        }

        // Zkontroluj cache druhé
        const cachedUrl = cacheService.getAudioUrl(audioFileName);
        if (cachedUrl) {
          console.log('🔗 Using cached URL for:', audioFileName);
          setAudioUrl(cachedUrl);
          setCurrentFileName(audioFileName);
          setDataSource('cache');
          setLoading(false);
          return;
        }

        // Vytvoření reference k souboru v Firebase Storage
        const audioRef = ref(storage, audioFileName);

        // Získání download URL - Service Worker se postará o cache
        console.log('🔗 Fetching download URL for:', audioFileName);
        const url = await getDownloadURL(audioRef);
        console.log('🔗 Download URL obtained:', url);

        // Ověř, že URL je platné
        if (!url || !url.startsWith('http')) {
          throw new Error('Invalid download URL received');
        }

        // Ulož do cache
        cacheService.setAudioUrl(audioFileName, url);

        setAudioUrl(url);
        setCurrentFileName(audioFileName);
        setDataSource('internet');
        setFallbackUsed(false); // Reset fallback flag při úspěchu

        // Spusť metadata preloading pro rychlejší přístup příště
        cacheService._preloadFirebaseMetadata(url, audioFileName).catch(err => {
          console.warn('Metadata preload failed:', err);
        });

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
