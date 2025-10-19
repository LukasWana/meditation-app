/**
 * Admin Service - pro server-side operace s Firebase Admin SDK
 * POZOR: Tento soubor je pouze pro Cloud Functions, ne pro klientský kód!
 */

// Toto by mělo běžet pouze v Cloud Functions prostředí
if (typeof window === 'undefined') {
  const admin = require('firebase-admin');

  // Inicializace Admin SDK (pouze na serveru)
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      storageBucket: 'meditations-audio.firebasestorage.app'
    });
  }

  class AdminService {
    /**
     * Synchronizuje metadata z Storage do Firestore
     */
    static async syncStorageToFirestore() {
      try {
        const bucket = admin.storage().bucket();
        const firestore = admin.firestore();

        // Načti všechny audio soubory
        const [files] = await bucket.getFiles({ prefix: 'hudba/' });
        const [slovaFiles] = await bucket.getFiles({ prefix: 'slova/' });

        const allFiles = [...files, ...slovaFiles];

        console.log(`🔄 Syncing ${allFiles.length} files to Firestore...`);

        // Zpracuj každý soubor
        for (const file of allFiles) {
          try {
            const fileName = file.name;
            const downloadURL = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;

            // Získej metadata souboru
            const [metadata] = await file.getMetadata();

            // Ulož do Firestore
            await firestore.collection('metadata').doc(fileName).set({
              fileName,
              downloadURL,
              size: metadata.size,
              contentType: metadata.contentType,
              timeCreated: metadata.timeCreated,
              updated: metadata.updated,
              folder: fileName.split('/')[0],
              subFolder: fileName.split('/').length > 2 ? fileName.split('/')[1] : null,
              lastSynced: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log(`✅ Synced: ${fileName}`);
          } catch (error) {
            console.error(`❌ Failed to sync ${file.name}:`, error.message);
          }
        }

        console.log(`🎉 Sync completed: ${allFiles.length} files processed`);
        return { success: true, processed: allFiles.length };

      } catch (error) {
        console.error('❌ Sync failed:', error);
        return { success: false, error: error.message };
      }
    }

    /**
     * Vyčistí neexistující soubory z Firestore
     */
    static async cleanupOrphanedMetadata() {
      try {
        const bucket = admin.storage().bucket();
        const firestore = admin.firestore();

        // Načti všechny metadata z Firestore
        const snapshot = await firestore.collection('metadata').get();

        let cleanedCount = 0;

        for (const doc of snapshot.docs) {
          const metadata = doc.data();
          const fileName = metadata.fileName;

          try {
            // Zkontroluj, zda soubor existuje v Storage
            const file = bucket.file(fileName);
            await file.getMetadata();

            // Soubor existuje, pokračuj
            console.log(`✅ File exists: ${fileName}`);
          } catch (error) {
            if (error.code === 404) {
              // Soubor neexistuje, smaž z Firestore
              await doc.ref.delete();
              cleanedCount++;
              console.log(`🗑️ Cleaned orphaned metadata: ${fileName}`);
            }
          }
        }

        console.log(`🧹 Cleanup completed: ${cleanedCount} orphaned entries removed`);
        return { success: true, cleaned: cleanedCount };

      } catch (error) {
        console.error('❌ Cleanup failed:', error);
        return { success: false, error: error.message };
      }
    }

    /**
     * Generuje statistiky o souborech
     */
    static async generateFileStats() {
      try {
        const bucket = admin.storage().bucket();
        const firestore = admin.firestore();

        // Statistiky z Storage
        const [hudbaFiles] = await bucket.getFiles({ prefix: 'hudba/' });
        const [slovaFiles] = await bucket.getFiles({ prefix: 'slova/' });

        // Statistiky z Firestore
        const metadataSnapshot = await firestore.collection('metadata').get();

        const stats = {
          storage: {
            hudba: hudbaFiles.length,
            slova: slovaFiles.length,
            total: hudbaFiles.length + slovaFiles.length
          },
          firestore: {
            total: metadataSnapshot.size
          },
          timestamp: new Date().toISOString()
        };

        // Ulož statistiky do Firestore
        await firestore.collection('stats').doc('files').set(stats);

        console.log('📊 File stats generated:', stats);
        return { success: true, stats };

      } catch (error) {
        console.error('❌ Stats generation failed:', error);
        return { success: false, error: error.message };
      }
    }

    /**
     * Nastaví uživatelské oprávnění
     */
    static async setUserRole(uid, role) {
      try {
        await admin.auth().setCustomUserClaims(uid, { role });
        console.log(`👤 User ${uid} role set to: ${role}`);
        return { success: true };
      } catch (error) {
        console.error('❌ Failed to set user role:', error);
        return { success: false, error: error.message };
      }
    }

    /**
     * Získá informace o uživateli
     */
    static async getUserInfo(uid) {
      try {
        const user = await admin.auth().getUser(uid);
        return {
          success: true,
          user: {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            role: user.customClaims?.role || 'user',
            createdAt: user.metadata.creationTime
          }
        };
      } catch (error) {
        console.error('❌ Failed to get user info:', error);
        return { success: false, error: error.message };
      }
    }
  }

  module.exports = AdminService;
} else {
  // Klientský kód - pouze API volání
  class AdminService {
    /**
     * Volá Cloud Function pro synchronizaci
     */
    static async syncStorage() {
      try {
        const response = await fetch('/api/admin/sync-storage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        console.error('❌ Sync request failed:', error);
        return { success: false, error: error.message };
      }
    }

    /**
     * Volá Cloud Function pro cleanup
     */
    static async cleanupMetadata() {
      try {
        const response = await fetch('/api/admin/cleanup-metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        console.error('❌ Cleanup request failed:', error);
        return { success: false, error: error.message };
      }
    }

    /**
     * Volá Cloud Function pro statistiky
     */
    static async getFileStats() {
      try {
        const response = await fetch('/api/admin/file-stats', {
          method: 'GET'
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        console.error('❌ Stats request failed:', error);
        return { success: false, error: error.message };
      }
    }
  }

  // Export pro ES6 moduly
  export default AdminService;
}
