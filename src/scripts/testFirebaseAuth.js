

import { auth } from '../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import log from '../services/logger';

export async function testFirebaseAuth() {
  console.log('🧪 Testing Firebase Authentication...');

  try {
    console.log('🔍 Auth instance:', auth);
    console.log('🔍 Auth app:', auth.app.name);
    console.log('🔍 Auth config:', auth.config);

    return {
      success: true,
      message: 'Firebase Auth initialized successfully',
      auth: {
        appName: auth.app.name,
        isInitialized: !!auth.app
      }
    };

  } catch (error) {
    console.error('❌ Firebase Auth test failed:', error);
    return { success: false, error: error.message };
  }
}

export async function createTestUser(email, password) {
  console.log('👤 Creating test user...');

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log('✅ Test user created:', userCredential.user.email);

    return {
      success: true,
      message: 'Test user created successfully',
      user: {
        uid: userCredential.user.uid,
        email: userCredential.user.email
      }
    };

  } catch (error) {
    console.error('❌ Test user creation failed:', error);
    return { success: false, error: error.message };
  }
}

export async function signInTestUser(email, password) {
  console.log('🔐 Signing in test user...');

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Test user signed in:', userCredential.user.email);

    return {
      success: true,
      message: 'Test user signed in successfully',
      user: {
        uid: userCredential.user.uid,
        email: userCredential.user.email
      }
    };

  } catch (error) {
    console.error('❌ Test user sign in failed:', error);
    return { success: false, error: error.message };
  }
}



