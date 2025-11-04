const { extractMP3Metadata } = require('./extractMetadata');
const { downloadProxy } = require('./downloadProxy');
const { generateWaveform } = require('./generateWaveform');
const metadataSync = require('./metadataSync');

exports.extractMP3Metadata = extractMP3Metadata;
exports.downloadProxy = downloadProxy;
exports.generateWaveform = generateWaveform;
// Exportuj všechny funkce z metadataSync
Object.keys(metadataSync).forEach(key => {
  exports[key] = metadataSync[key];
});