// Test script pro kontrolu načítání dat z Firebase do cache
import { storage } from './src/services/firebase.js';
import { ref, listAll, getDownloadURL } from 'firebase/storage';
import offlineCacheService from './src/services/offlineCacheService.js';

async function testCacheLoading() {
  console.log('🧪 Testing cache loading...');
  
  try {
    // Inicializuj cache service
    console.log('🔄 Initializing cache service...');
    const initialized = await offlineCacheService.initialize();
    console.log('✅ Cache initialized:', initialized);
    
    if (!initialized) {
      console.error('❌ Cache service failed to initialize');
      return;
    }
    
    // Načti všechny soubory z Firebase Storage
    console.log('🔄 Loading files from Firebase Storage...');
    const listRef = ref(storage, '');
    const result = await listAll(listRef);
    console.log('📊 Firebase Storage loaded:', {
      items: result.items.length,
      prefixes: result.prefixes.length
    });
    
    // Filtruj pouze MP3 soubory
    const mp3Files = result.items.filter(item => 
      item.name.toLowerCase().endsWith('.mp3')
    );
    console.log('🎵 MP3 files found:', mp3Files.length);
    
    // Testuj načítání prvních 5 souborů
    const testFiles = mp3Files.slice(0, 5);
    console.log('🧪 Testing with first 5 files:', testFiles.map(f => f.name));
    
    const audioFiles = [];
    
    for (const file of testFiles) {
      try {
        console.log(`🔄 Loading ${file.name}...`);
        const downloadURL = await getDownloadURL(file);
        console.log(`✅ Download URL obtained for ${file.name}:`, downloadURL);
        
        audioFiles.push({
          fileName: file.name,
          downloadURL: downloadURL
        });
      } catch (error) {
        console.error(`❌ Failed to get download URL for ${file.name}:`, error);
      }
    }
    
    console.log('📊 Audio files prepared:', audioFiles.length);
    
    // Testuj cache operace
    console.log('🔄 Testing cache operations...');
    const cacheResult = await offlineCacheService.cacheAllAudioFiles(audioFiles, (progress) => {
      console.log('📊 Cache progress:', progress);
    });
    
    console.log('✅ Cache result:', cacheResult);
    
    // Zkontroluj cache stats
    const stats = await offlineCacheService.getCacheStats();
    console.log('📊 Cache stats:', stats);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Spusť test
testCacheLoading().then(() => {
  console.log('🏁 Test completed');
}).catch(error => {
  console.error('❌ Test error:', error);
});
