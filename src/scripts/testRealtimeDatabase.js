

import { database } from '../services/firebase';
import { ref, set, get, onValue, off } from 'firebase/database';

async function testRealtimeDatabase() {
  console.log('🧪 Testing Realtime Database...');

  try {
    // Test 1: Uložení dat
    const testRef = ref(database, 'test/connection');
    await set(testRef, {
      message: 'Hello from Realtime Database!',
      timestamp: new Date().toISOString(),
      testId: Math.random().toString(36).substr(2, 9)
    });
    console.log('✅ Test 1 passed: Data saved successfully');

    // Test 2: Načtení dat
    const snapshot = await get(testRef);
    if (snapshot.exists()) {
      console.log('✅ Test 2 passed: Data loaded successfully');
      console.log('📊 Data:', snapshot.val());
    } else {
      console.log('❌ Test 2 failed: No data found');
    }

    // Test 3: Real-time listener
    console.log('🔍 Test 3: Setting up real-time listener...');
    const listenerRef = ref(database, 'test/listener');

    const unsubscribe = onValue(listenerRef, (snapshot) => {
      if (snapshot.exists()) {
        console.log('✅ Test 3 passed: Real-time listener working');
        console.log('📡 Live data:', snapshot.val());
      } else {
        console.log('⏳ Waiting for real-time data...');
      }
    });

    // Simuluj změnu dat
    setTimeout(async () => {
      await set(listenerRef, {
        message: 'Real-time update!',
        timestamp: new Date().toISOString()
      });
    }, 1000);

    // Vyčisti po 3 sekundách
    setTimeout(() => {
      off(listenerRef, 'value', unsubscribe);
      console.log('🧹 Cleanup completed');
    }, 3000);

    return true;
  } catch (error) {
    console.error('❌ Realtime Database test failed:', error);
    return false;
  }
}

export default testRealtimeDatabase;



