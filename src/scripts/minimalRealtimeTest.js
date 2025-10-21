

import { database } from '../services/firebase';
import { ref, set, get } from 'firebase/database';

export async function minimalRealtimeTest() {
  console.log('🧪 Minimal Realtime Database Test...');
  console.log('🗄️ Database URL:', database.app.options.databaseURL);

  try {
    // Test 1: Uložení velmi jednoduchých dat
    const testRef = ref(database, 'minimal-test');
    const testData = {
      message: 'Hello!',
      timestamp: new Date().toISOString()
    };

    console.log('📤 Saving minimal data...');
    await set(testRef, testData);
    console.log('✅ Data saved successfully');

    // Test 2: Načtení dat
    console.log('📥 Loading data...');
    const snapshot = await get(testRef);

    if (snapshot.exists()) {
      const data = snapshot.val();
      console.log('✅ Data loaded successfully');
      console.log('📊 Data:', data);

      return { success: true, data };
    } else {
      console.log('❌ No data found');
      return { success: false, error: 'No data found' };
    }

  } catch (error) {
    console.error('❌ Minimal test failed:', error);
    return { success: false, error: error.message };
  }
}



