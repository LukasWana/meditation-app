/**
 * Firebase Functions entry point
 * Exportuje všechny functions pro metadata synchronizaci
 */

const metadataSync = require('./metadataSync');

// Exportuj functions
exports.helloWorld = metadataSync.helloWorld;
exports.testMetadata = metadataSync.testMetadata;
