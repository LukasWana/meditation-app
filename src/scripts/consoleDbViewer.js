

import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/secure-firebase.js';

// Globální funkce pro konzoli
window.showDatabaseData = async () => {
  try {
    console.log('🔍 Zobrazuji data z Firestore databáze...\n');

    // Audio-metadata kolekce
    console.log('📊 Audio-metadata kolekce:');
    console.log('=' .repeat(60));

    const audioRef = collection(db, 'audio-metadata');
    const audioQuery = query(audioRef, orderBy('fileName'), limit(10));
    const audioSnapshot = await getDocs(audioQuery);

    if (audioSnapshot.empty) {
      console.log('❌ Kolekce audio-metadata je prázdná');
    } else {
      console.log(`✅ Načteno ${audioSnapshot.size} záznamů:`);
      audioSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`📄 ${doc.id}:`, {
          fileName: data.fileName,
          duration: data.duration,
          durationFormatted: data.durationFormatted,
          title: data.title,
          folder: data.folder,
          updated: data.updated
        });
      });
    }

    // System kolekce
    console.log('\n🔧 System kolekce:');
    console.log('=' .repeat(60));

    const systemRef = collection(db, 'system');
    const systemSnapshot = await getDocs(systemRef);

    if (systemSnapshot.empty) {
      console.log('❌ Kolekce system je prázdná');
    } else {
      console.log(`✅ Načteno ${systemSnapshot.size} záznamů:`);
      systemSnapshot.forEach((doc) => {
        console.log(`📄 ${doc.id}:`, doc.data());
      });
    }

    // Cache kolekce
    console.log('\n💾 Cache kolekce:');
    console.log('=' .repeat(60));

    const cacheRef = collection(db, 'cache');
    const cacheSnapshot = await getDocs(cacheRef);

    if (cacheSnapshot.empty) {
      console.log('❌ Kolekce cache je prázdná');
    } else {
      console.log(`✅ Načteno ${cacheSnapshot.size} záznamů:`);
      cacheSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`📄 ${doc.id}:`, {
          type: data.type,
          key: data.key,
          timestamp: data.timestamp
        });
      });
    }

    console.log('\n✅ Zobrazení dat dokončeno!');

  } catch (error) {
    console.error('❌ Chyba při načítání dat:', error);
  }
};

// Rychlé funkce pro jednotlivé kolekce
window.showAudioMetadata = async () => {
  try {
    const audioRef = collection(db, 'audio-metadata');
    const snapshot = await getDocs(audioRef);
    console.log(`📊 Audio-metadata (${snapshot.size} záznamů):`);
    snapshot.forEach((doc) => {
      console.log(`  ${doc.id}:`, doc.data());
    });
  } catch (error) {
    console.error('❌ Chyba:', error);
  }
};

window.showSystemData = async () => {
  try {
    const systemRef = collection(db, 'system');
    const snapshot = await getDocs(systemRef);
    console.log(`🔧 System (${snapshot.size} záznamů):`);
    snapshot.forEach((doc) => {
      console.log(`  ${doc.id}:`, doc.data());
    });
  } catch (error) {
    console.error('❌ Chyba:', error);
  }
};

window.showCacheData = async () => {
  try {
    const cacheRef = collection(db, 'cache');
    const snapshot = await getDocs(cacheRef);
    console.log(`💾 Cache (${snapshot.size} záznamů):`);
    snapshot.forEach((doc) => {
      console.log(`  ${doc.id}:`, doc.data());
    });
  } catch (error) {
    console.error('❌ Chyba:', error);
  }
};

console.log('🔍 Database viewer načten! Použijte:');
console.log('  showDatabaseData() - zobrazí všechna data');
console.log('  showAudioMetadata() - zobrazí audio-metadata');
console.log('  showSystemData() - zobrazí system data');
console.log('  showCacheData() - zobrazí cache data');







