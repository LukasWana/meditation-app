

import { database } from '../services/firebase';
import { ref, set, get, onValue, off } from 'firebase/database';

export async function testRealtimeConnection() {
  console.log('🧪 Testing Realtime Database connection...');
  console.log('🗄️ Database URL:', database.app.options.databaseURL);

  try {
    // Test 1: Uložení dat
    const testRef = ref(database, 'test/connection');
    const testData = {
      message: 'Test z aplikace',
      timestamp: new Date().toISOString(),
      testId: Math.random().toString(36).substr(2, 9)
    };

    await set(testRef, testData);
    console.log('✅ Test 1 passed: Data saved successfully');
    console.log('📊 Saved data:', testData);

    // Test 2: Načtení dat
    const snapshot = await get(testRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      console.log('✅ Test 2 passed: Data loaded successfully');
      console.log('📊 Loaded data:', data);

      if (data.message === testData.message) {
        console.log('✅ Data integrity check passed');
        return { success: true, data };
      } else {
        console.log('❌ Data integrity check failed');
        return { success: false, error: 'Data mismatch' };
      }
    } else {
      console.log('❌ Test 2 failed: No data found');
      return { success: false, error: 'No data found' };
    }

  } catch (error) {
    console.error('❌ Realtime Database test failed:', error);
    return { success: false, error: error.message };
  }
}

// Test real-time listener
export function testRealtimeListener(callback) {
  console.log('🔍 Testing real-time listener...');

  const listenerRef = ref(database, 'test/listener');

  const unsubscribe = onValue(listenerRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      console.log('📡 Real-time update received:', data);
      if (callback) callback(data);
    } else {
      console.log('⏳ Waiting for real-time data...');
    }
  });

  // Simuluj změnu dat
  setTimeout(async () => {
    try {
      await set(listenerRef, {
        message: 'Real-time update!',
        timestamp: new Date().toISOString(),
        random: Math.random()
      });
      console.log('📤 Real-time test data sent');
    } catch (error) {
      console.error('❌ Failed to send real-time test data:', error);
    }
  }, 1000);

  // Vyčisti po 5 sekundách
  setTimeout(() => {
    off(listenerRef, 'value', unsubscribe);
    console.log('🧹 Real-time listener cleanup completed');
  }, 5000);

  return unsubscribe;
}







