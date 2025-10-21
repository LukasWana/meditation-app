

import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../services/firebase.js';

export const showDatabaseData = async () => {
  try {
    console.log('🔍 Zobrazuji data z Firestore databáze...\n');

    // Získej data z audio-metadata kolekce
    const audioMetadataRef = collection(db, 'audio-metadata');
    const audioQuery = query(audioMetadataRef, orderBy('fileName'), limit(20));
    const audioSnapshot = await getDocs(audioQuery);

    console.log(`📊 Audio-metadata kolekce (${audioSnapshot.size} záznamů):`);
    console.log('=' .repeat(60));

    if (audioSnapshot.empty) {
      console.log('❌ Kolekce audio-metadata je prázdná');
    } else {
      audioSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`📄 Document ID: ${doc.id}`);
        console.log(`   FileName: ${data.fileName || 'N/A'}`);
        console.log(`   Duration: ${data.duration || 'N/A'}`);
        console.log(`   DurationFormatted: ${data.durationFormatted || 'N/A'}`);
        console.log(`   Title: ${data.title || 'N/A'}`);
        console.log(`   Folder: ${data.folder || 'N/A'}`);
        console.log(`   Updated: ${data.updated || 'N/A'}`);
        console.log('   ' + '-'.repeat(50));
      });
    }

    // Získej data z system kolekce
    console.log('\n🔧 System kolekce:');
    console.log('=' .repeat(60));

    try {
      const systemRef = collection(db, 'system');
      const systemSnapshot = await getDocs(systemRef);

      if (systemSnapshot.empty) {
        console.log('❌ Kolekce system je prázdná');
      } else {
        systemSnapshot.forEach((doc) => {
          const data = doc.data();
          console.log(`📄 Document ID: ${doc.id}`);
          console.log(`   Data:`, JSON.stringify(data, null, 2));
          console.log('   ' + '-'.repeat(50));
        });
      }
    } catch (error) {
      console.log('❌ Chyba při načítání system kolekce:', error.message);
    }

    // Získej data z cache kolekce
    console.log('\n💾 Cache kolekce:');
    console.log('=' .repeat(60));

    try {
      const cacheRef = collection(db, 'cache');
      const cacheSnapshot = await getDocs(cacheRef);

      if (cacheSnapshot.empty) {
        console.log('❌ Kolekce cache je prázdná');
      } else {
        console.log(`📊 Cache kolekce (${cacheSnapshot.size} záznamů):`);
        cacheSnapshot.forEach((doc) => {
          const data = doc.data();
          console.log(`📄 Document ID: ${doc.id}`);
          console.log(`   Type: ${data.type || 'N/A'}`);
          console.log(`   Key: ${data.key || 'N/A'}`);
          console.log(`   Timestamp: ${data.timestamp || 'N/A'}`);
          console.log('   ' + '-'.repeat(50));
        });
      }
    } catch (error) {
      console.log('❌ Chyba při načítání cache kolekce:', error.message);
    }

    console.log('\n✅ Zobrazení dat dokončeno!');

  } catch (error) {
    console.error('❌ Chyba při načítání dat z databáze:', error);
  }
};

// Spusť script pokud je volán přímo
if (import.meta.url === `file://${process.argv[1]}`) {
  showDatabaseData();
}



