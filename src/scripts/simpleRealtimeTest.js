

import { database } from '../services/firebase';
import { ref, set, get, push } from 'firebase/database';

export async function simpleRealtimeTest() {
  console.log('🧪 Simple Realtime Database Test...');
  console.log('🗄️ Database URL:', database.app.options.databaseURL);

  try {
    // Test 1: Uložení jednoduchých dat
    const testRef = ref(database, 'test/simple');
    const testData = {
      message: 'Hello from Realtime Database! 🎉',
      timestamp: new Date().toISOString(),
      testId: Math.random().toString(36).substr(2, 9)
    };

    console.log('📤 Saving data...');
    await set(testRef, testData);
    console.log('✅ Data saved successfully');

    // Test 2: Načtení dat
    console.log('📥 Loading data...');
    const snapshot = await get(testRef);

    if (snapshot.exists()) {
      const data = snapshot.val();
      console.log('✅ Data loaded successfully');
      console.log('📊 Data:', data);

      if (data.message === testData.message) {
        console.log('✅ Data integrity check passed');
        return { success: true, data };
      } else {
        console.log('❌ Data integrity check failed');
        return { success: false, error: 'Data mismatch' };
      }
    } else {
      console.log('❌ No data found');
      return { success: false, error: 'No data found' };
    }

  } catch (error) {
    console.error('❌ Simple test failed:', error);
    return { success: false, error: error.message };
  }
}

// Test s push (pro seznamy)
export async function testPushData() {
  console.log('🧪 Testing push data...');

  try {
    const listRef = ref(database, 'test/list');
    const newItemRef = push(listRef);

    await set(newItemRef, {
      message: 'New item in list',
      timestamp: new Date().toISOString(),
      id: newItemRef.key
    });

    console.log('✅ Push data test successful');
    console.log('🔑 New item key:', newItemRef.key);

    return { success: true, key: newItemRef.key };
  } catch (error) {
    console.error('❌ Push test failed:', error);
    return { success: false, error: error.message };
  }
}




