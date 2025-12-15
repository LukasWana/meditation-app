/**
 * Utility funkce pro aktualizaci překladů v Firebase Realtime Database
 * Načte aktuální slovník z LanguageContext.jsx a uloží ho do Firebase
 */

import { DEFAULT_TRANSLATIONS } from '@contexts/LanguageContext';
import { realtimeDatabase } from '@config/secure-firebase';
import { ref, set } from 'firebase/database';
import log from '@services/logger';

/**
 * Aktualizuje překlady v Firebase Realtime Database
 * @returns {Promise<boolean>} True pokud bylo úspěšně uloženo
 */
export async function updateFirebaseTranslations() {
  try {
    log.info('🔄 Aktualizuji překlady v Firebase...');

    // Vytvoř strukturu dat pro Firebase (podobně jako getDefaultUIData v uiDataService)
    const uiData = {
      translations: {
        SK: { ...DEFAULT_TRANSLATIONS.SK },
        CZ: { ...DEFAULT_TRANSLATIONS.CZ },
        EN: { ...DEFAULT_TRANSLATIONS.EN }
      },
      config: {
        colors: {
          primary: '#f4ddc4',
          secondary: '#000000',
          background: '#f4ddc4'
        },
        layout: {
          defaultLayout: 'grid'
        }
      },
      texts: {
        emptyState: {
          SK: 'Žiadne súbory nenájdené',
          CZ: 'Žádné soubory nenalezeny',
          EN: 'No files found'
        },
        selected: {
          SK: '✓ Vybraté',
          CZ: '✓ Vybráno',
          EN: '✓ Selected'
        }
      },
      version: '1.0.0',
      lastUpdated: new Date().toISOString()
    };

    log.info(`📤 Ukládám do Firebase Realtime Database...`);
    log.info(`   - SK: ${Object.keys(uiData.translations.SK).length} klíčů`);
    log.info(`   - CZ: ${Object.keys(uiData.translations.CZ).length} klíčů`);
    log.info(`   - EN: ${Object.keys(uiData.translations.EN).length} klíčů`);

    // Ulož do Firebase
    const uiDataRef = ref(realtimeDatabase, 'ui-data');
    await set(uiDataRef, uiData);

    log.success('✅ Překlady úspěšně aktualizovány v Firebase!');
    log.info(`   Cesta: ui-data`);
    log.info(`   Aktualizováno: ${uiData.lastUpdated}`);

    return true;
  } catch (error) {
    log.error('❌ Chyba při aktualizaci překladů:', error);
    throw error;
  }
}

