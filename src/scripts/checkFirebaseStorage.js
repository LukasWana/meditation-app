

import { storage } from '../services/firebase';
import { ref, listAll, getMetadata } from 'firebase/storage';
import log from '../services/logger';

export async function checkFirebaseStorage() {
  console.log('🔍 Checking Firebase Storage content...');
  
  try {
    const storageRef = ref(storage);
    const result = await listAll(storageRef);
    
    console.log('📁 Storage root contents:');
    console.log(`   Folders: ${result.prefixes.length}`);
    console.log(`   Files: ${result.items.length}`);
    
    // Zobraz složky
    if (result.prefixes.length > 0) {
      console.log('\n📂 Folders:');
      for (const folderRef of result.prefixes) {
        console.log(`   - ${folderRef.name}`);
        
        // Zobraz obsah složky
        const folderResult = await listAll(folderRef);
        console.log(`     Files in ${folderRef.name}: ${folderResult.items.length}`);
        
        // Zobraz první 5 souborů
        for (let i = 0; i < Math.min(5, folderResult.items.length); i++) {
          const fileRef = folderResult.items[i];
          try {
            const metadata = await getMetadata(fileRef);
            console.log(`       📄 ${fileRef.name} (${Math.round(metadata.size / 1024)} KB, ${metadata.contentType})`);
          } catch (error) {
            console.log(`       📄 ${fileRef.name} (metadata error)`);
          }
        }
        
        if (folderResult.items.length > 5) {
          console.log(`       ... and ${folderResult.items.length - 5} more files`);
        }
      }
    }
    
    // Zobraz soubory v root
    if (result.items.length > 0) {
      console.log('\n📄 Files in root:');
      for (const fileRef of result.items) {
        try {
          const metadata = await getMetadata(fileRef);
          console.log(`   📄 ${fileRef.name} (${Math.round(metadata.size / 1024)} KB, ${metadata.contentType})`);
        } catch (error) {
          console.log(`   📄 ${fileRef.name} (metadata error)`);
        }
      }
    }
    
    // Spočítej celkový počet souborů
    let totalFiles = result.items.length;
    for (const folderRef of result.prefixes) {
      const folderResult = await listAll(folderRef);
      totalFiles += folderResult.items.length;
    }
    
    console.log(`\n📊 Total files in storage: ${totalFiles}`);
    
    return {
      success: true,
      folders: result.prefixes.length,
      files: result.items.length,
      totalFiles: totalFiles,
      prefixes: result.prefixes.map(p => p.name),
      rootFiles: result.items.map(i => i.name)
    };
    
  } catch (error) {
    console.error('❌ Failed to check Firebase Storage:', error);
    log.error('Failed to check Firebase Storage:', error);
    return { success: false, error: error.message };
  }
}




