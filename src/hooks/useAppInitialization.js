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

  useEffect(() => {
    let cancelled = false;

    const ensureFirebase = async () => {
      try {
        await waitForFirebaseReady();
        if (!cancelled) {
          setFirebaseReady(true);
        }
      } catch (error) {
        if (!cancelled) {
          setFirebaseError(error);
        }
      }
    };

    ensureFirebase();

    return () => {
      cancelled = true;
    };
  }, []);

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