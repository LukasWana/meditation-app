import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Service Worker Manager - registers SW only in production
 */
export default function ServiceWorkerManager() {
  const {
    offlineReady,
    needRefresh,
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('✅ PWA: Service Worker registered', r);
    },
    onRegisterError(error) {
      console.error('❌ PWA: Service Worker registration failed', error);
    },
    onNeedRefresh() {
      console.log('🔄 PWA: New content available');
      updateServiceWorker(true);
    },
    onOfflineReady() {
      console.log('✅ PWA: App ready to work offline');
    }
  });

  return null; // Doesn't render anything
}
