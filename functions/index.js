/**
 * Firebase Functions entry point
 * Exportuje všechny functions pro metadata synchronizaci
 */

const metadataSync = require('./metadataSync');

// Exportuj functions
exports.helloWorld = metadataSync.helloWorld;
exports.testMetadata = metadataSync.testMetadata;
exports.onFileUpload = metadataSync.onFileUpload;
exports.syncStorage = metadataSync.syncStorage;
exports.getFileStats = metadataSync.getFileStats;
exports.saveScrapedMetadata = metadataSync.saveScrapedMetadata;
exports.cleanupMetadata = metadataSync.cleanupMetadata;
