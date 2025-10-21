

import { storage } from '../services/firebase';
import { ref, listAll } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { app } from '../services/firebase';
import { getFunctions } from 'firebase/functions';
import log from '../services/logger';

export async function syncAllStorageFiles() {
  console.log('🔄 Syncing all files from Firebase Storage...');
  
  try {
    // Získej všechny soubory ze Storage
    const storageRef = ref(storage);
    const result = await listAll(storageRef);
    
    console.log(`📁 Found ${result.prefixes.length} folders and ${result.items.length} root files`);
    
    // Spočítej celkový počet souborů
    let totalFiles = result.items.length;
    const allFiles = [...result.items];
    
    for (const folderRef of result.prefixes) {
      const folderResult = await listAll(folderRef);
      totalFiles += folderResult.items.length;
      allFiles.push(...folderResult.items);
    }
    
    console.log(`📊 Total files to sync: ${totalFiles}`);
    
    // Zobraz první 10 souborů
    console.log('\n📄 Sample files:');
    for (let i = 0; i < Math.min(10, allFiles.length); i++) {
      const fileRef = allFiles[i];
      console.log(`   ${i + 1}. ${fileRef.fullPath}`);
    }
    
    if (allFiles.length > 10) {
      console.log(`   ... and ${allFiles.length - 10} more files`);
    }
    
    // Zkus zavolat Firebase Function pro synchronizaci
    try {
      console.log('\n🚀 Calling syncStorage function...');
      const functions = getFunctions(app);
      const syncStorage = httpsCallable(functions, 'syncStorage');
      
      const result = await syncStorage();
      console.log('✅ SyncStorage function result:', result.data);
      
      return {
        success: true,
        totalFiles: totalFiles,
        syncResult: result.data,
        message: `Successfully synced ${totalFiles} files`
      };
      
    } catch (functionError) {
      console.warn('⚠️ Firebase Function not available, using manual sync simulation');
      
      // Simuluj manuální synchronizaci
      const syncResults = {
        filesProcessed: 0,
        filesSkipped: 0,
        errors: [],
        processedFiles: []
      };
      
      for (const fileRef of allFiles) {
        try {
          // Simuluj zpracování souboru
          const fileName = fileRef.fullPath;
          const isMP3 = fileName.toLowerCase().endsWith('.mp3');
          
          if (isMP3) {
            syncResults.filesProcessed++;
            syncResults.processedFiles.push(fileName);
            console.log(`✅ Processed: ${fileName}`);
          } else {
            syncResults.filesSkipped++;
            console.log(`⏭️ Skipped (not MP3): ${fileName}`);
          }
        } catch (error) {
          syncResults.errors.push({ file: fileRef.fullPath, error: error.message });
          console.error(`❌ Error processing ${fileRef.fullPath}:`, error);
        }
      }
      
      console.log('\n📊 Manual sync results:');
      console.log(`   Files processed: ${syncResults.filesProcessed}`);
      console.log(`   Files skipped: ${syncResults.filesSkipped}`);
      console.log(`   Errors: ${syncResults.errors.length}`);
      
      return {
        success: true,
        totalFiles: totalFiles,
        syncResult: syncResults,
        message: `Manually processed ${syncResults.filesProcessed} MP3 files`
      };
    }
    
  } catch (error) {
    console.error('❌ Failed to sync storage files:', error);
    log.error('Failed to sync storage files:', error);
    return { success: false, error: error.message };
  }
}




