/**
 * Script pro inicializaci Firestore kolekce s audio metadaty
 * Tento script se spustí jednou pro vytvoření metadata kolekce
 */

import { collection, doc, setDoc, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

// Ukázková metadata pro audio soubory
const sampleMetadata = [
  {
    fileName: 'muzsky4FSK-uzkost-osamelost.mp3',
    size: 2500000,
    contentType: 'audio/mpeg',
    duration: '3:00',
    estimatedDuration: 180,
    type: 'slova',
    downloadURL: 'https://firebasestorage.googleapis.com/v0/b/meditations-audio.firebasestorage.app/o/muzsky4FSK-uzkost-osamelost.mp3'
  },
  {
    fileName: 'zensky4FSK-uzkost-osamelost.mp3',
    size: 2400000,
    contentType: 'audio/mpeg',
    duration: '2:55',
    estimatedDuration: 175,
    type: 'slova',
    downloadURL: 'https://firebasestorage.googleapis.com/v0/b/meditations-audio.firebasestorage.app/o/zensky4FSK-uzkost-osamelost.mp3'
  },
  {
    fileName: 'muzsky4MSK-uzkost-osamelost.mp3',
    size: 2600000,
    contentType: 'audio/mpeg',
    duration: '3:10',
    estimatedDuration: 190,
    type: 'slova',
    downloadURL: 'https://firebasestorage.googleapis.com/v0/b/meditations-audio.firebasestorage.app/o/muzsky4MSK-uzkost-osamelost.mp3'
  },
  {
    fileName: '00--00--00--00-ambient1.mp3',
    size: 5000000,
    contentType: 'audio/mpeg',
    duration: '5:00',
    estimatedDuration: 300,
    type: 'hudba',
    downloadURL: 'https://firebasestorage.googleapis.com/v0/b/meditations-audio.firebasestorage.app/o/00--00--00--00-ambient1.mp3'
  },
  {
    fileName: '00--00--00--01-ambient2.mp3',
    size: 4800000,
    contentType: 'audio/mpeg',
    duration: '4:45',
    estimatedDuration: 285,
    type: 'hudba',
    downloadURL: 'https://firebasestorage.googleapis.com/v0/b/meditations-audio.firebasestorage.app/o/00--00--00--01-ambient2.mp3'
  },
  {
    fileName: '00--00--00--02-nature.mp3',
    size: 5200000,
    contentType: 'audio/mpeg',
    duration: '5:20',
    estimatedDuration: 320,
    type: 'hudba',
    downloadURL: 'https://firebasestorage.googleapis.com/v0/b/meditations-audio.firebasestorage.app/o/00--00--00--02-nature.mp3'
  }
];

/**
 * Inicializuje Firestore kolekci s audio metadaty
 */
export async function initializeFirestoreMetadata() {
  try {
    console.log('Initializing Firestore metadata collection...');

    const collectionName = 'audio-metadata';
    const metadataCollection = collection(db, collectionName);

    // Zkontroluj, jestli už existují data
    const existingDocs = await getDocs(metadataCollection);

    if (existingDocs.empty) {
      console.log('No existing metadata found, creating new collection...');

      // Vytvoř metadata dokumenty
      for (const metadata of sampleMetadata) {
        const docRef = doc(db, collectionName, metadata.fileName);
        const docData = {
          ...metadata,
          timeCreated: new Date().toISOString(),
          updated: new Date().toISOString()
        };

        await setDoc(docRef, docData);
        console.log(`Created metadata for: ${metadata.fileName}`);
      }

      console.log(`Successfully created ${sampleMetadata.length} metadata documents`);
    } else {
      console.log(`Metadata collection already exists with ${existingDocs.size} documents`);

      // Zkontroluj, jestli jsou všechna ukázková metadata přítomna
      const existingFileNames = new Set();
      existingDocs.forEach(doc => {
        existingFileNames.add(doc.id);
      });

      // Přidej chybějící metadata
      const missingMetadata = sampleMetadata.filter(metadata =>
        !existingFileNames.has(metadata.fileName)
      );

      if (missingMetadata.length > 0) {
        console.log(`Adding ${missingMetadata.length} missing metadata documents...`);

        for (const metadata of missingMetadata) {
          const docRef = doc(db, collectionName, metadata.fileName);
          const docData = {
            ...metadata,
            timeCreated: new Date().toISOString(),
            updated: new Date().toISOString()
          };

          await setDoc(docRef, docData);
          console.log(`Added metadata for: ${metadata.fileName}`);
        }
      }
    }

    console.log('Firestore metadata initialization completed');

  } catch (error) {
    console.error('Failed to initialize Firestore metadata:', error);
    throw error;
  }
}

/**
 * Funkce pro spuštění z konzole prohlížeče
 */
window.initializeFirestoreMetadata = initializeFirestoreMetadata;

// Automaticky spustí inicializaci při importu (pouze v development)
if (process.env.NODE_ENV === 'development') {
  console.log('Firestore metadata initialization script loaded');
  console.log('Run: window.initializeFirestoreMetadata() to initialize metadata');
}
