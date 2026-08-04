import { Capacitor } from '@capacitor/core';
import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Service Worker Manager - registers SW only in production AND only on web.
 * In Capacitor native apps, the SW is unnecessary (assets are already in the APK)
 * and causes double storage usage + potential cache bloat.
 */
export default function ServiceWorkerManager() {
  if (Capacitor.isNativePlatform()) {
    return null;
  }

  const {
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('PWA: Service Worker registered', r);
    },
    onRegisterError(error) {
      console.error('PWA: Service Worker registration failed', error);
    },
    onNeedRefresh() {
      console.log('PWA: New content available');
      updateServiceWorker(true);
    },
    onOfflineReady() {
      console.log('PWA: App ready to work offline');
    }
  });

  return null;
}