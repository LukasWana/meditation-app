const { extractMP3Metadata } = require('./extractMetadata');
const { downloadProxy } = require('./downloadProxy');
const { generateWaveform } = require('./generateWaveform');
const metadataSync = require('./metadataSync');
const sharedSettings = require('./sharedSettings');

exports.extractMP3Metadata = extractMP3Metadata;
exports.downloadProxy = downloadProxy;
exports.generateWaveform = generateWaveform;
// Exportuj všechny funkce z metadataSync
Object.keys(metadataSync).forEach(key => {
  exports[key] = metadataSync[key];
});

// Exportuj sdílení nastavení
Object.keys(sharedSettings).forEach(key => {
  exports[key] = sharedSettings[key];
});