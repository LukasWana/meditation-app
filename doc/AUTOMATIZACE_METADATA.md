# Automatizace synchronizace audio metadat

## Přehled

Tento dokument popisuje automatizovaný systém pro synchronizaci metadat audio souborů v aplikaci. Systém automaticky zpracovává nové soubory při jejich nahrání do Firebase Storage a vytváří metadata pro rychlé načtení v UI.

## Architektura

### 1. **Konfigurační soubor** (`src/config/audioMetadataConfig.js`)

Centralizovaná konfigurace, která definuje:
- **Podporované formáty**: MP3, OGG, OGA
- **Složky**: `hudba/`, `slova/`, `dychanie/`
- **Pravidla zpracování**: rekurzivní načítání, extrakce metadat
- **Automatická synchronizace**: Firebase Storage triggers

### 2. **Firebase Cloud Functions**

#### `functions/extractMetadata.js`
- **Trigger**: `storage.object().onFinalize`
- **Funkce**: Automaticky extrahuje metadata z nově nahraných audio souborů
- **Podporované formáty**: MP3, OGG, OGA
- **Podporované složky**: `hudba/`, `slova/`, `dychanie/`

#### `functions/metadataSync.js`
- **Trigger**: `storage.object().onFinalize`
- **Funkce**: Synchronizuje metadata do Firestore a Realtime Database
- **Automatická aktualizace**: Při každém uploadu nového souboru

### 3. **Admin Panel** (`src/features/meditation/screens/SimpleAdminScreen.jsx`)

Manuální synchronizace a správa:
- **Skenování**: Rekurzivní skenování všech složek
- **Extrakce metadat**: Automatická extrakce délky a dalších metadat
- **Statistiky**: Zobrazení počtu souborů podle formátu a složky

### 4. **Metadata Services**

#### `src/services/fastMetadataService.js`
- Načítá metadata z Realtime Database
- Podporuje všechny složky (`hudba/`, `slova/`, `dychanie/`)
- Automaticky zpracovává podsložky

#### `src/services/realtimeMetadataService.js`
- Poskytuje real-time aktualizace metadat
- Cache pro rychlý přístup

## Jak to funguje

### Automatická synchronizace

1. **Upload souboru** → Uživatel nahraje audio soubor do Firebase Storage
2. **Firebase Trigger** → Cloud Function `extractMetadata.js` se automaticky spustí
3. **Extrakce metadat** → Funkce extrahuje metadata pomocí `ffprobe`
4. **Uložení** → Metadata se uloží do:
   - Firestore (`audio-metadata` collection)
   - Realtime Database (`audio-metadata` node)
5. **Aktualizace UI** → Aplikace automaticky načte nová metadata z Realtime Database

### Manuální synchronizace (Admin Panel)

1. **Skenování** → Admin panel skenuje všechny složky rekurzivně
2. **Extrakce** → Pro každý soubor extrahuje délku pomocí `extractAudioMetadata`
3. **Uložení** → Metadata se uloží do Realtime Database
4. **Statistiky** → Zobrazí se statistiky podle formátu a složky

## Konfigurace

### Podporované formáty

```javascript
{
  mp3: {
    extensions: ['.mp3'],
    contentType: 'audio/mpeg'
  },
  ogg: {
    extensions: ['.ogg', '.oga'],
    contentType: 'audio/ogg'
  }
}
```

### Podporované složky

```javascript
{
  hudba: {
    path: 'hudba',
    formats: ['mp3'],
    recursive: true
  },
  slova: {
    path: 'slova',
    formats: ['mp3'],
    recursive: true
  },
  dychanie: {
    path: 'dychanie',
    formats: ['ogg', 'mp3'],
    recursive: true
  }
}
```

## Výhody automatizace

1. **Automatická synchronizace** - Nové soubory se automaticky zpracují při uploadu
2. **Rychlá metadata** - Metadata jsou dostupná okamžitě po uploadu
3. **Centralizovaná konfigurace** - Jednoduchá správa podporovaných formátů a složek
4. **Real-time aktualizace** - UI se automaticky aktualizuje při změnách
5. **Škálovatelnost** - Funguje pro libovolný počet souborů a složek

## Rozšíření systému

Pro přidání nového formátu nebo složky:

1. **Přidej do konfigurace** (`src/config/audioMetadataConfig.js`):
```javascript
{
  newFormat: {
    extensions: ['.newformat'],
    contentType: 'audio/newformat'
  }
}
```

2. **Uprav Cloud Functions** - Automaticky podporují všechny formáty z konfigurace

3. **Uprav metadata services** - Použij `isSupportedFile()` a `getFormatConfig()` helper funkce

## Monitoring

- **Firebase Console** → Cloud Functions → Logs
- **Admin Panel** → Statistiky synchronizace
- **Realtime Database** → `audio-metadata` node obsahuje všechny metadata

## Troubleshooting

- **Soubory se nezpracovávají** → Zkontroluj Cloud Functions logs
- **Metadata se nezobrazují** → Zkontroluj, jestli je soubor v podporované složce
- **OGG soubory nefungují** → Zkontroluj, jestli je `ffprobe` podporuje

