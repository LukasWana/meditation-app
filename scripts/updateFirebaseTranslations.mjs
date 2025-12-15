/**
 * Skript pro aktualizaci překladů v Firebase Realtime Database
 *
 * Použití:
 *   node scripts/updateFirebaseTranslations.mjs
 *
 * Nebo v aplikaci:
 *   import { updateFirebaseTranslations } from './scripts/updateFirebaseTranslations.mjs';
 *   await updateFirebaseTranslations();
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Načti aktuální slovník z LanguageContext.jsx
function loadTranslations() {
  const filePath = join(__dirname, '../src/contexts/LanguageContext.jsx');
  const content = readFileSync(filePath, 'utf-8');

  // Extrahuj DEFAULT_TRANSLATIONS pomocí jednoduchého parsování
  // Najdeme sekci DEFAULT_TRANSLATIONS = { ... }
  const startMarker = 'export const DEFAULT_TRANSLATIONS = {';
  const startIndex = content.indexOf(startMarker);

  if (startIndex === -1) {
    throw new Error('Nepodařilo se najít DEFAULT_TRANSLATIONS v LanguageContext.jsx');
  }

  // Najdeme konec objektu (rovnováha závorek)
  let braceCount = 0;
  let inString = false;
  let stringChar = null;
  let endIndex = startIndex + startMarker.length;

  for (let i = startIndex + startMarker.length; i < content.length; i++) {
    const char = content[i];
    const prevChar = i > 0 ? content[i - 1] : '';

    // Sleduj stringy
    if (!inString && (char === '"' || char === "'" || char === '`')) {
      inString = true;
      stringChar = char;
    } else if (inString && char === stringChar && prevChar !== '\\') {
      inString = false;
      stringChar = null;
    }

    if (!inString) {
      if (char === '{') braceCount++;
      if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          endIndex = i + 1;
          break;
        }
      }
    }
  }

  const translationsCode = content.substring(startIndex + startMarker.length - 7, endIndex);

  // Vytvoř funkci, která vrátí objekt
  const func = new Function('return ' + translationsCode);
  return func();
}

// Vytvoř strukturu dat pro Firebase
function createUIData(translations) {
  return {
    translations: {
      SK: { ...translations.SK },
      CZ: { ...translations.CZ },
      EN: { ...translations.EN }
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
}

// Exportovaná funkce pro použití v aplikaci
export async function updateFirebaseTranslations() {
  try {
    console.log('🔄 Načítám aktuální slovník z LanguageContext.jsx...');

    // Dynamicky importuj Firebase konfiguraci a služby
    const { realtimeDatabase } = await import('../src/config/secure-firebase.js');
    const { ref, set } = await import('firebase/database');

    const translations = loadTranslations();
    const uiData = createUIData(translations);

    console.log('📤 Ukládám do Firebase Realtime Database...');
    console.log(`   - SK: ${Object.keys(uiData.translations.SK).length} klíčů`);
    console.log(`   - CZ: ${Object.keys(uiData.translations.CZ).length} klíčů`);
    console.log(`   - EN: ${Object.keys(uiData.translations.EN).length} klíčů`);

    // Ulož do Firebase
    const uiDataRef = ref(realtimeDatabase, 'ui-data');
    await set(uiDataRef, uiData);

    console.log('✅ Překlady úspěšně aktualizovány v Firebase!');
    console.log(`   Cesta: ui-data`);
    console.log(`   Aktualizováno: ${uiData.lastUpdated}`);

    return true;
  } catch (error) {
    console.error('❌ Chyba při aktualizaci překladů:', error);
    throw error;
  }
}

// Pokud je skript spuštěn přímo, spusť aktualizaci
if (import.meta.url === `file://${process.argv[1]}`) {
  updateFirebaseTranslations()
    .then(() => {
      console.log('✅ Hotovo!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Skript selhal:', error);
      process.exit(1);
    });
}

