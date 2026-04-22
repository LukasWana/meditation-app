import { useEffect, useMemo, useState } from 'react';
import { app, realtimeDatabase as database } from '@config/secure-firebase';
import { useBackgroundDataLoader } from './useBackgroundDataLoader';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const waitForFirebaseReady = async (timeout = 4000) => {
  if (app && database) {
    return true;
  }

  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (app && database) {
      return true;
    }
    await wait(50);
  }

  throw new Error('Firebase initialization timeout');
};

export const useAppInitialization = () => {
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [firebaseError, setFirebaseError] = useState(null);

  console.log('🎯 [CRITICAL] useAppInitialization() CALLED', {
    firebaseReady,
    hasError: !!firebaseError,
    app: !!app,
    database: !!database
  });

  useEffect(() => {
    console.log('🚀 [CRITICAL] useAppInitialization useEffect() FIRED');
    let cancelled = false;

    const ensureFirebase = async () => {
      console.log('🔍 [DEBUG] ensureFirebase() called');
      try {
        console.log('⏳ [DEBUG] Waiting for Firebase to be ready...');
        await waitForFirebaseReady();
        console.log('✅ [DEBUG] Firebase is ready!');
        if (!cancelled) {
          console.log('🎯 [DEBUG] Setting firebaseReady = true');
          setFirebaseReady(true);
          console.log('✅ [DEBUG] firebaseReady state updated');
        } else {
          console.log('⚠️ [DEBUG] Component was cancelled, not setting state');
        }
      } catch (error) {
        console.error('❌ [CRITICAL] ensureFirebase() FAILED:', error);
        if (!cancelled) {
          console.log('🔴 [DEBUG] Setting firebaseError');
          setFirebaseError(error);
        }
      }
    };

    console.log('📞 [DEBUG] Calling ensureFirebase()...');
    ensureFirebase();

    return () => {
      console.log('🧹 [DEBUG] useAppInitialization cleanup - cancelling');
      cancelled = true;
    };
  }, []);

  console.log('📊 [DEBUG] Current state:', {
    firebaseReady,
    hasError: !!firebaseError,
    errorMessage: firebaseError?.message
  });

  const backgroundState = useBackgroundDataLoader({ enabled: firebaseReady });

  const isReady = firebaseReady && backgroundState.isComplete && !firebaseError && !backgroundState.error;

  const phase = useMemo(() => {
    if (firebaseError) {
      return 'error';
    }
    if (!firebaseReady) {
      return 'firebase';
    }
    return backgroundState.phase;
  }, [firebaseError, firebaseReady, backgroundState.phase]);

  const statusMessage = firebaseError
    ? firebaseError.message
    : !firebaseReady
      ? 'Inicializuji Firebase…'
      : backgroundState.statusMessage;

  return {
    ...backgroundState,
    phase,
    statusMessage,
    firebaseReady,
    firebaseError,
    uiData: backgroundState.uiData,
    isReady,
    error: firebaseError || backgroundState.error
  };
};