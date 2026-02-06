const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Lazy-loaded Storage
let storage;
function getStorage() {
  if (!storage) {
    const { Storage } = require('@google-cloud/storage');
    storage = new Storage();
  }
  return storage;
}

// Inicializace Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Firebase Function pro extrakci metadat z MP3 souborů
 * Spouští se při změně v Firebase Storage
 */
exports.extractMP3Metadata = functions.storage.object().onFinalize(async (object) => {
  const filePath = object.name;
  const contentType = object.contentType;

  // Zkontroluj, jestli je to audio soubor (MP3, OGG, OGA)
  const filePathLower = filePath.toLowerCase();
  const isAudioFile = contentType && contentType.startsWith('audio/') &&
    (filePathLower.endsWith('.mp3') ||
      filePathLower.endsWith('.ogg') ||
      filePathLower.endsWith('.oga'));

  if (!isAudioFile) {
    console.log('Skipping non-audio file:', filePath);
    return null;
  }

  // Zkontroluj, jestli je soubor v podporované složce
  const isInTargetFolder = filePath.startsWith('hudba/') ||
    filePath.startsWith('slova/') ||
    filePath.startsWith('dychanie/') ||
    filePath.startsWith('meditacie/') ||
    filePath.startsWith('CZ/') ||
    filePath.startsWith('SK/') ||
    filePath.startsWith('EN/');

  if (!isInTargetFolder) {
    console.log('Skipping file outside target folders:', filePath);
    return null;
  }

  console.log('Processing audio file:', filePath);

  try {
    // Stáhni soubor do dočasné složky
    const bucket = getStorage().bucket(object.bucket);
    const tempFilePath = path.join(os.tmpdir(), path.basename(filePath));
    await bucket.file(filePath).download({ destination: tempFilePath });

    // Extrahuj metadata pomocí ffprobe
    const metadata = await extractMetadataWithFFprobe(tempFilePath);

    // Urči příponu souboru
    const fileExt = path.extname(filePath).toLowerCase();
    const baseName = path.basename(filePath, fileExt);

    // Urči contentType podle přípony
    let finalContentType = contentType;
    if (fileExt === '.ogg' || fileExt === '.oga') {
      finalContentType = 'audio/ogg';
    } else if (fileExt === '.mp3') {
      finalContentType = 'audio/mpeg';
    }

    // Přidej dodatečné informace
    const completeMetadata = {
      fileName: filePath,
      displayName: baseName,
      folder: filePath.split('/')[0],
      subFolder: filePath.split('/').length > 2 ? filePath.split('/')[1] : null,
      downloadURL: `https://firebasestorage.googleapis.com/v0/b/${object.bucket}/o/${encodeURIComponent(filePath)}?alt=media`,
      fullPath: filePath,
      duration: metadata.duration,
      durationFormatted: formatDuration(metadata.duration),
      durationDetailed: formatDurationDetailed(metadata.duration),
      isValid: metadata.duration > 0,
      fileSize: parseInt(object.size),
      contentType: finalContentType,
      lastModified: new Date().toISOString(),
      extracted: true,
      // Dodatečné informace pro slova soubory
      ...(filePath.startsWith('slova/') ? {
        gender: extractGender(path.basename(filePath)),
        topic: extractTopic(path.basename(filePath)),
        type: extractType(path.basename(filePath))
      } : {})
    };

    // Ulož do Firestore (bez "/" v doc ID)
    const safeDocId = filePath.replace(/\//g, '_');
    await admin.firestore().collection('audio-metadata').doc(safeDocId).set(completeMetadata, { merge: true });

    // Ulož do Realtime Database v novém formátu (keyed podle bezpečné cesty)
    const safePath = sanitizePath(filePath);
    const realtimeRef = admin.database().ref(`audio-metadata/${safePath}`);
    const snapshot = await realtimeRef.once('value');
    const existingData = snapshot.val() || {};

    await realtimeRef.set({
      ...existingData,
      ...completeMetadata,
      lastUpdated: new Date().toISOString(),
      source: 'extractMetadata'
    });

    console.log('Metadata extracted and saved for:', filePath);

    // Smaž dočasný soubor
    fs.unlinkSync(tempFilePath);

    return null;
  } catch (error) {
    console.error('Error extracting metadata for', filePath, ':', error);
    return null;
  }
});

/**
 * Extrahuje metadata pomocí ffprobe
 */
function extractMetadataWithFFprobe(filePath) {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      filePath
    ]);

    let output = '';
    let errorOutput = '';

    ffprobe.stdout.on('data', (data) => {
      output += data.toString();
    });

    ffprobe.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe failed with code ${code}: ${errorOutput}`));
        return;
      }

      try {
        const result = JSON.parse(output);
        const duration = parseFloat(result.format.duration) || 0;
        resolve({ duration: Math.round(duration) });
      } catch (parseError) {
        reject(new Error(`Failed to parse ffprobe output: ${parseError.message}`));
      }
    });
  });
}

/**
 * Formátování délky
 */
function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return 'N/A';
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Detailní formátování délky
 */
function formatDurationDetailed(seconds) {
  if (!seconds || seconds <= 0) return 'N/A';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  return `${minutes}m ${secs}s`;
}

/**
 * Extrahuje pohlaví ze jména souboru
 */
function extractGender(fileName) {
  if (fileName.includes('muzsky') || fileName.includes('MSK')) return 'male';
  if (fileName.includes('zensky') || fileName.includes('FSK')) return 'female';
  return null;
}

/**
 * Extrahuje téma ze jména souboru
 */
function extractTopic(fileName) {
  const match = fileName.match(/-([^-]+)\.(mp3|ogg|oga)$/i);
  return match ? match[1] : null;
}

/**
 * Sanitizuje cestu pro Realtime Database
 */
function sanitizePath(path) {
  return path
    .replace(/\./g, '_DOT_')
    .replace(/#/g, '_HASH_')
    .replace(/\$/g, '_DOLLAR_')
    .replace(/\[/g, '_LBRACKET_')
    .replace(/\]/g, '_RBRACKET_')
    .replace(/\//g, '_SLASH_')
    .replace(/\\/g, '_BACKSLASH_');
}

/**
 * Extrahuje typ ze jména souboru
 */
function extractType(fileName) {
  if (fileName.includes('MSK')) return 'MSK';
  if (fileName.includes('FSK')) return 'FSK';
  return null;
}
