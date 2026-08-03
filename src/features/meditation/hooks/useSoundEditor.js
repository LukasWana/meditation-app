import { useState, useRef, useEffect } from 'react';
import { ref as dbRef, set, get } from 'firebase/database';
import { database, ensureFirebase } from '@config/secure-firebase';
import { realtimeMetadataService } from '@services/realtimeMetadataService';

export const useSoundEditor = (setLoading, setStatus) => {
  const [soundFiles, setSoundFiles] = useState([]);
  const [editingDescriptions, setEditingDescriptions] = useState({});
  const [playingPreview, setPlayingPreview] = useState(null);
  const previewAudioRef = useRef(null);

  const loadSoundFiles = async () => {
    setLoading(true);
    setStatus('🔄 Načítám zvuky...');
    try {
      await ensureFirebase();
      const allMetadata = await realtimeMetadataService.getAllMetadata();

      // Filtruj pouze soubory z dychanie složky
      const dychanieFiles = Object.values(allMetadata).filter(file => {
        const fileName = file.fileName || '';
        const isInDychanieFolder = fileName.startsWith('dychanie/');
        const isOggFile = fileName.endsWith('.ogg') || fileName.endsWith('.oga');
        const isMp3File = fileName.endsWith('.mp3');
        return isInDychanieFolder && (isOggFile || isMp3File);
      });

      const mappedFiles = dychanieFiles.map(file => {
        const fileNameOnly = file.fileNameOnly || file.fileName.split('/').pop();
        const name = file.displayName || file.fileNameOnly || fileNameOnly.replace(/\.(ogg|oga|mp3)$/i, '');

        return {
          id: file.fileName,
          fileName: file.fileName,
          fileNameOnly: fileNameOnly,
          name: name,
          description: file.description || '',
          downloadURL: file.downloadURL || file.audioSrc,
          waveformData: file.waveformData || file.waveform || null,
          waveformMax: file.waveformMax || null
        };
      });

      setSoundFiles(mappedFiles);
      setStatus(`✅ Načteno ${mappedFiles.length} zvuků`);
    } catch (error) {
      setStatus(`❌ Chyba při načítání zvuků: ${error.message}`);
      console.error('❌ Failed to load sound files:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveDescription = async (fileName, description) => {
    setLoading(true);
    setStatus('💾 Ukládám popisek...');
    try {
      await ensureFirebase();
      const safePath = realtimeMetadataService.sanitizePath(fileName);
      const fileRef = dbRef(database, `audio-metadata/${safePath}`);

      const snapshot = await get(fileRef);
      const currentData = snapshot.exists() ? snapshot.val() : {};

      await set(fileRef, {
        ...currentData,
        description: description,
        lastUpdated: new Date().toISOString()
      });

      setSoundFiles(prev => prev.map(file =>
        file.fileName === fileName ? { ...file, description } : file
      ));
      setEditingDescriptions(prev => {
        const next = { ...prev };
        delete next[fileName];
        return next;
      });

      setStatus('✅ Popisek uložen');
    } catch (error) {
      setStatus(`❌ Chyba při ukládání popisku: ${error.message}`);
      console.error('❌ Failed to save description:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (file) => {
    if (!file.downloadURL) {
      setStatus('⚠️ Není dostupná download URL pro preview');
      return;
    }

    if (playingPreview === file.fileName && previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.src = '';
      previewAudioRef.current = null;
      setPlayingPreview(null);
      return;
    }

    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.src = '';
      previewAudioRef.current = null;
    }

    const audio = new Audio(file.downloadURL);
    audio.volume = 0.7;

    audio.onended = () => {
      setPlayingPreview(null);
      previewAudioRef.current = null;
    };

    audio.onerror = (error) => {
      console.error('❌ Chyba při přehrávání preview:', error);
      setPlayingPreview(null);
      previewAudioRef.current = null;
    };

    try {
      await audio.play();
      previewAudioRef.current = audio;
      setPlayingPreview(file.fileName);
    } catch (error) {
      console.error('❌ Nelze přehrát audio:', error);
      setStatus('❌ Nelze přehrát audio');
    }
  };

  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.src = '';
        previewAudioRef.current = null;
      }
    };
  }, []);

  return {
    soundFiles,
    editingDescriptions,
    setEditingDescriptions,
    playingPreview,
    loadSoundFiles,
    saveDescription,
    handlePreview
  };
};
