/**
 * Script pro inicializaci Firestore databáze s metadaty
 * Spustí se v konzoli prohlížeče pro naplnění databáze
 */

import { collection, doc, setDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@services/firebase';
import { ref, listAll, getDownloadURL, getMetadata } from 'firebase/storage';
import { storage } from '@services/firebase';

// Ukázková metadata pro testování
const sampleMetadata = {
  "ambient1.mp3": {
    fileName: "ambient1.mp3",
    size: 5000000,
    contentType: "audio/mpeg",
    duration: "5:00",
    estimatedDuration: 300,
    type: "hudba",
    downloadURL: "https://firebasestorage.googleapis.com/v0/b/meditations-audio.firebasestorage.app/o/ambient1.mp3",
    timeCreated: "2024-01-01T00:00:00.000Z",
    updated: "2024-01-01T00:00:00.000Z"
  },
  "ambient2.mp3": {
    fileName: "ambient2.mp3",
    size: 4800000,
    contentType: "audio/mpeg",
    duration: "4:45",
    estimatedDuration: 285,
    type: "hudba",
    downloadURL: "https://firebasestorage.googleapis.com/v0/b/meditations-audio.firebasestorage.app/o/ambient2.mp3",
    timeCreated: "2024-01-01T00:00:00.000Z",
    updated: "2024-01-01T00:00:00.000Z"
  },
  "nature.mp3": {
    fileName: "nature.mp3",
    size: 6000000,
    contentType: "audio/mpeg",
    duration: "6:00",
    estimatedDuration: 360,
    type: "hudba",
    downloadURL: "https://firebasestorage.googleapis.com/v0/b/meditations-audio.firebasestorage.app/o/nature.mp3",
    timeCreated: "2024-01-01T00:00:00.000Z",
    updated: "2024-01-01T00:00:00.000Z"
  }
};

/**
 * Inicializuje Firestore kolekci s metadaty
 */
export const initializeFirestoreMetadata = async () => {
  try {
    console.log('🚀 Initializing Firestore metadata collection...');

    const collectionName = 'audio-metadata';
    const metadataCollection = collection(db, collectionName);

    // Zkontroluj, jestli už existují data
    const q = query(metadataCollection, orderBy('fileName'));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.size > 0) {
      console.log(`✅ Metadata collection already exists with ${querySnapshot.size} records`);
      return;
    }

    // Vytvoř ukázková metadata
    console.log('📝 Creating sample metadata...');

    for (const [fileName, metadata] of Object.entries(sampleMetadata)) {
      const docRef = doc(db, collectionName, fileName);
      await setDoc(docRef, metadata);
      console.log(`✅ Created metadata for ${fileName}`);
    }

    console.log('🎉 Firestore metadata collection initialized successfully!');

  } catch (error) {
    console.error('❌ Failed to initialize Firestore metadata:', error);
    throw error;
  }
};

/**
 * Načte skutečná metadata z Firebase Storage a uloží do Firestore
 */
export const loadRealMetadataToFirestore = async () => {
  try {
    console.log('🔄 Loading real metadata from Firebase Storage...');

    const collectionName = 'audio-metadata';
    const hudbaRef = ref(storage, 'hudba');
    const result = await listAll(hudbaRef);

    console.log(`📊 Found ${result.items.length} files in hudba folder`);

    for (const itemRef of result.items) {
      try {
        // Získej download URL
        const downloadURL = await getDownloadURL(itemRef);

        // Získej metadata
        const metadata = await getMetadata(itemRef);

        // Vytvoř metadata objekt
        const audioMetadata = {
          fileName: itemRef.name,
          size: metadata.size,
          contentType: metadata.contentType,
          duration: estimateDuration(metadata.size, metadata.contentType),
          estimatedDuration: estimateDurationInSeconds(metadata.size, metadata.contentType),
          type: 'hudba',
          downloadURL: downloadURL,
          timeCreated: metadata.timeCreated,
          updated: metadata.updated
        };

        // Ulož do Firestore
        const docRef = doc(db, collectionName, itemRef.name);
        await setDoc(docRef, audioMetadata);

        console.log(`✅ Saved metadata for ${itemRef.name}`);

      } catch (error) {
        console.warn(`⚠️ Failed to process ${itemRef.name}:`, error);
      }
    }

    console.log('🎉 Real metadata loaded to Firestore successfully!');

  } catch (error) {
    console.error('❌ Failed to load real metadata:', error);
    throw error;
  }
};

/**
 * Odhadne délku na základě velikosti souboru
 */
const estimateDuration = (sizeInBytes, contentType) => {
  if (!sizeInBytes || !contentType) return 'N/A';

  // Průměrný bitrate pro MP3 je ~128 kbps
  const bitrate = 128 * 1000; // 128 kbps v bps
  const durationInSeconds = (sizeInBytes * 8) / bitrate;

  const minutes = Math.floor(durationInSeconds / 60);
  const seconds = Math.floor(durationInSeconds % 60);

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Odhadne délku v sekundách
 */
const estimateDurationInSeconds = (sizeInBytes, contentType) => {
  if (!sizeInBytes || !contentType) return 0;

  const bitrate = 128 * 1000;
  return Math.floor((sizeInBytes * 8) / bitrate);
};

// Exportuj funkce do window objektu pro použití v konzoli
if (typeof window !== 'undefined') {
  window.initializeFirestoreMetadata = initializeFirestoreMetadata;
  window.loadRealMetadataToFirestore = loadRealMetadataToFirestore;

  console.log('🔧 Firestore metadata scripts loaded!');
  console.log('📝 Available commands:');
  console.log('  - initializeFirestoreMetadata() - Create sample metadata');
  console.log('  - loadRealMetadataToFirestore() - Load real metadata from Storage');
}