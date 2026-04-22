/**
 * 🔍 Diagnostic Script: Identify which Firebase Storage files are failing
 * Run this in browser console (F12) when your app is running
 */

(async function diagnoseDownloadURLs() {
  console.log('🔍 Diagnosing Firebase Storage download URLs...\n');

  try {
    // Import Firebase
    const { storage } = await import('/src/config/secure-firebase.js');
    const { ref, getDownloadURL, listAll } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js');

    // Test files from different folders
    const testFiles = [
      'hudba/ambient-journey/Ambient Journey - 01 Zhooliox.mp3',
      'hudba/ambient-journey/cover.jpg',
      'dychanie/breath-1.ogg',
      'meditacie/SK/test-meditacie.mp3',
      'background/pexels-ahmetyuksek-30623134.jpg'
    ];

    console.log('📋 Testing individual file download URLs:\n');

    for (const fileName of testFiles) {
      console.log(`🔍 Testing: ${fileName}`);

      try {
        const fileRef = ref(storage, fileName);
        const downloadURL = await getDownloadURL(fileRef);

        if (downloadURL) {
          console.log(`✅ SUCCESS: ${fileName}`);
          console.log(`   URL: ${downloadURL.substring(0, 60)}...`);

          // Test if URL is actually accessible
          try {
            const response = await fetch(downloadURL, { method: 'HEAD' });
            console.log(`   HTTP Status: ${response.status} ${response.statusText}`);

            // Check CORS headers
            const corsHeader = response.headers.get('Access-Control-Allow-Origin');
            console.log(`   CORS: ${corsHeader || 'NOT SET'}`);

            if (response.ok) {
              console.log(`   ✅ File is accessible`);
            } else {
              console.log(`   ⚠️ File returned HTTP ${response.status}`);
            }
          } catch (fetchError) {
            console.log(`   ⚠️ Fetch failed: ${fetchError.message}`);
          }
        } else {
          console.log(`❌ FAILED: ${fileName} - URL is null`);
        }

      } catch (error) {
        console.log(`❌ FAILED: ${fileName}`);
        console.log(`   Error: ${error.message}`);
        console.log(`   Code: ${error.code || 'unknown'}`);
      }

      console.log('');
    }

    // Check folder structure
    console.log('\n📂 Checking folder structure:\n');

    const folders = ['hudba', 'dychanie', 'meditacie', 'background'];

    for (const folder of folders) {
      try {
        const folderRef = ref(storage, folder);
        const result = await listAll(folderRef);

        console.log(`✅ ${folder}/`);
        console.log(`   Files: ${result.items.length}`);
        console.log(`   Subfolders: ${result.prefixes.length}`);

        // Show first few files
        if (result.items.length > 0) {
          console.log(`   Sample files:`);
          result.items.slice(0, 3).forEach(item => {
            console.log(`     - ${item.name}`);
          });
        }

        // Show subfolders
        if (result.prefixes.length > 0) {
          console.log(`   Subfolders:`);
          result.prefixes.forEach(prefix => {
            console.log(`     - ${prefix.name}/`);
          });
        }

      } catch (error) {
        console.log(`❌ ${folder}/ - ${error.message}`);
      }

      console.log('');
    }

    // Check if FastMetadataService has valid data
    console.log('\n📊 Checking FastMetadataService:\n');

    const { fastMetadataService } = await import('/src/services/fastMetadataService.js');

    console.log(`Initialized: ${fastMetadataService.isInitialized}`);
    console.log(`Loading: ${fastMetadataService.isLoading}`);
    console.log(`Metadata size: ${fastMetadataService.metadata.size}`);

    if (fastMetadataService.metadata.size > 0) {
      console.log('\n🔍 Checking metadata for null downloadURLs:');

      let nullCount = 0;
      let validCount = 0;

      fastMetadataService.metadata.forEach((metadata, key) => {
        if (metadata.type === 'audio' || metadata.type === 'album_track') {
          if (!metadata.downloadURL) {
            console.log(`❌ NULL URL: ${metadata.fileName}`);
            nullCount++;
          } else {
            validCount++;
          }
        }
      });

      console.log(`\n📊 Summary:`);
      console.log(`   Valid URLs: ${validCount}`);
      console.log(`   Null URLs: ${nullCount}`);
    }

    console.log('\n✅ Diagnostic complete!\n');

  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
  }
})();
