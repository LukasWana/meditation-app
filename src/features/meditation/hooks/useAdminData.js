import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@services/firebase';
import { isMeditaceFilePath } from '@utils/meditaceStorage';

const isDychaniFilePath = (fileName = '') =>
  typeof fileName === 'string' &&
  (fileName.includes('dychani/') || fileName.includes('dychanie/'));

/**
 * Custom hook pro správu admin dat
 * Spravuje načítání a zobrazení dat z Firestore
 */
export const useAdminData = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [soundFiles, setSoundFiles] = useState([]);
  const [stats, setStats] = useState({
    totalFiles: 0,
    meditaceFiles: 0,
    hudbaFiles: 0,
    dychaniFiles: 0,
    mp3Count: 0,
    oggCount: 0
  });

  const checkStatus = async () => {
    try {
      setLoading(true);
      // Zkontroluj Firestore
      const metadataCollection = collection(db, 'audio-metadata');
      const q = query(metadataCollection, orderBy('fileName'));
      const querySnapshot = await getDocs(q);

      const meditaceFiles = [];
      const hudbaFiles = [];
      const dychaniFiles = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.fileName && isMeditaceFilePath(data.fileName)) {
          meditaceFiles.push(data);
        }
        if (data.fileName && data.fileName.includes('hudba/')) {
          hudbaFiles.push(data);
        }
        if (data.fileName && isDychaniFilePath(data.fileName)) {
          dychaniFiles.push(data);
        }
      });

      const mp3Count = querySnapshot.size - dychaniFiles.length;
      const oggCount = dychaniFiles.length;

      setStats({
        totalFiles: querySnapshot.size,
        meditaceFiles: meditaceFiles.length,
        hudbaFiles: hudbaFiles.length,
        dychaniFiles: dychaniFiles.length,
        mp3Count,
        oggCount
      });

      setStatus(
        `📊 Firestore: ${querySnapshot.size} souborů, 🧘 MEDITACE: ${meditaceFiles.length}, 🎵 HUDBA: ${hudbaFiles.length}, 🫁 DYCHANI: ${dychaniFiles.length} (≈${mp3Count} MP3 / ≈${oggCount} OGG)`
      );
    } catch (error) {
      setStatus(`❌ Chyba při načítání: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  return {
    loading,
    status,
    setStatus,
    setLoading,
    soundFiles,
    setSoundFiles,
    stats,
    checkStatus
  };
};

