

import { database } from '../services/firebase';
import { ref, set, get } from 'firebase/database';

export async function offlineRealtimeTest() {
  console.log('🧪 Offline Realtime Database Test...');
  console.log('🗄️ Database URL:', database.app.options.databaseURL);

  try {
    // Test připojení s timeout
    const testRef = ref(database, 'test/offline-connection');
    const testData = {
      message: 'Offline test successful!',
      timestamp: new Date().toISOString(),
      testId: Math.random().toString(36).substr(2, 9)
    };

    console.log('📤 Attempting to save test data...');

    // Nastav timeout pro operaci
    const savePromise = set(testRef, testData);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Connection timeout')), 5000)
    );

    await Promise.race([savePromise, timeoutPromise]);
    console.log('✅ Data saved successfully');

    // Test načtení
    console.log('📥 Attempting to load data...');
    const snapshot = await get(testRef);

    if (snapshot.exists()) {
      const data = snapshot.val();
      console.log('✅ Data loaded successfully');
      console.log('📊 Data:', data);

      return { success: true, data, connectionType: 'online' };
    } else {
      console.log('❌ No data found');
      return { success: false, error: 'No data found', connectionType: 'offline' };
    }

  } catch (error) {
    console.error('❌ Offline test failed:', error);

    // Pokud je to connection error, aplikace bude fungovat v offline módu
    if (error.message.includes('timeout') || error.message.includes('CONNECTION_REFUSED')) {
      console.log('🔄 Realtime Database offline, app will work in offline mode');
      return {
        success: true,
        data: { message: 'Offline mode', timestamp: new Date().toISOString() },
        connectionType: 'offline',
        warning: 'Realtime Database unavailable'
      };
    }

    return { success: false, error: error.message, connectionType: 'error' };
  }
}



