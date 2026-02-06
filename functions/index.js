const { extractMP3Metadata } = require('./extractMetadata');
const { downloadProxy } = require('./downloadProxy');
const { generateWaveform } = require('./generateWaveform');
const metadataSync = require('./metadataSync');
const sharedSettings = require('./sharedSettings');

// Explicitly export functions to avoid discovery timeouts
exports.extractMP3Metadata = extractMP3Metadata;
exports.downloadProxy = downloadProxy;
exports.generateWaveform = generateWaveform;

// Export from metadataSync
exports.helloWorld = metadataSync.helloWorld;
exports.testMetadata = metadataSync.testMetadata;
exports.onFileUpload = metadataSync.onFileUpload;
exports.syncAllFiles = metadataSync.syncAllFiles;
exports.syncStorage = metadataSync.syncStorage;
exports.getFileStats = metadataSync.getFileStats;
exports.saveScrapedMetadata = metadataSync.saveScrapedMetadata;
exports.cleanupMetadata = metadataSync.cleanupMetadata;

// Export from sharedSettings
exports.createSharedSettings = sharedSettings.createSharedSettings;
exports.consumeSharedSettings = sharedSettings.consumeSharedSettings;