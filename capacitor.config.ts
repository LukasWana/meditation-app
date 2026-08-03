import type { CapacitorConfig } from '@capacitor/cli';
import * as fs from 'fs';
import * as path from 'path';

// Dynamické načtení Google Web Client ID ze staženého souboru google-services.json
let webClientId = '';
try {
  const jsonPath = path.join(__dirname, 'android', 'app', 'google-services.json');
  if (fs.existsSync(jsonPath)) {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    if (data.client && data.client.length > 0) {
      for (const cl of data.client) {
        if (cl.oauth_client && cl.oauth_client.length > 0) {
          for (const auth of cl.oauth_client) {
            // client_type === 3 je Web Client ID, které vyžaduje GoogleAuth plugin
            if (auth.client_type === 3) {
              webClientId = auth.client_id;
              break;
            }
          }
        }
        if (webClientId) break;
      }
    }
  }
} catch (e) {
  console.warn('⚠️ Nepodařilo se automaticky načíst google-services.json:', e);
}

const config: CapacitorConfig = {
  appId: 'com.lukaswana.meditationapp',
  appName: 'Meditation App',
  webDir: 'dist',
  backgroundColor: '#00000000',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: webClientId,
      androidClientId: webClientId,
      forceCodeForRefreshToken: true
    }
  }
};

export default config;
