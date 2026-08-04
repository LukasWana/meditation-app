import { Capacitor } from '@capacitor/core';

const TAG = 'BackgroundAudioService';

let isInitialized = false;
let listenerRegistered = false;
let mediaSessionCallbacks = new Set();

async function getPlugin() {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    return Capacitor.registerPlugin('AudioPlugin');
  } catch (e) {
    console.warn(TAG, 'AudioPlugin not available:', e.message);
    return null;
  }
}

async function ensureListener() {
  if (listenerRegistered) return;
  const plugin = await getPlugin();
  if (!plugin) return;

  listenerRegistered = true;
  try {
    plugin.addListener('mediaButtonEvent', (event) => {
      const action = event?.event || event?.data;
      if (!action) return;
      mediaSessionCallbacks.forEach(cb => {
        try { cb(action); } catch (e) { void e; }
      });
    });
  } catch (e) {
    listenerRegistered = false;
  }
}

export const backgroundAudio = {
  async start() {
    const plugin = await getPlugin();
    if (!plugin) return;
    await plugin.startForeground();
    await ensureListener();
    isInitialized = true;
  },

  async stop() {
    const plugin = await getPlugin();
    if (!plugin) return;
    await plugin.stopForeground();
    isInitialized = false;
  },

  async setMetadata({ title, artist, artworkUrl, duration }) {
    const plugin = await getPlugin();
    if (!plugin) return;
    await plugin.setMetadata({
      title: title || 'Meditace',
      artist: artist || 'Meditation App',
      artworkUrl: artworkUrl || null,
      duration: duration || 0,
    });
  },

  async setPlaying(playing) {
    const plugin = await getPlugin();
    if (!plugin) return;
    await plugin.setPlaying({ playing });
  },

  async setPosition(position) {
    const plugin = await getPlugin();
    if (!plugin) return;
    await plugin.setPosition({ position });
  },

  onMediaButton(callback) {
    mediaSessionCallbacks.add(callback);
    return () => mediaSessionCallbacks.delete(callback);
  },

  isAvailable() {
    return Capacitor.isNativePlatform();
  },

  isInitialized() {
    return isInitialized;
  },
};