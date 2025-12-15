/**
 * Helper funkce pro aktualizaci překladů v Firebase
 * Lze spustit z konzole prohlížeče:
 *
 * import { updateFirebaseTranslations } from './utils/updateFirebaseTranslationsHelper';
 * await updateFirebaseTranslations();
 */

import uiDataService from '@services/uiDataService';

/**
 * Aktualizuje překlady v Firebase z aktuálního slovníku
 */
export async function updateFirebaseTranslations() {
  try {
    console.log('🔄 Spouštím aktualizaci překladů v Firebase...');
    await uiDataService.updateTranslationsFromContext();
    console.log('✅ Překlady úspěšně aktualizovány!');
    return true;
  } catch (error) {
    console.error('❌ Chyba při aktualizaci:', error);
    throw error;
  }
}

// Exportuj také do window pro snadný přístup z konzole
if (typeof window !== 'undefined') {
  window.updateFirebaseTranslations = updateFirebaseTranslations;
  console.log('💡 Pro aktualizaci překladů spusť: await updateFirebaseTranslations()');
}

