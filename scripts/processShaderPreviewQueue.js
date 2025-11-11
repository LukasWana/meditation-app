#!/usr/bin/env node

import 'dotenv/config';
import process from 'process';
import { setTimeout as delay } from 'timers/promises';
import { ensureFirebase, runShaderPreviewGeneration, DEFAULT_OPTIONS } from './generateShaderPreviews.js';

const parseQueueArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    watch: false,
    interval: parseInt(process.env.SHADER_PREVIEW_POLL_INTERVAL || '60000', 10),
    maxPerRun: 0,
    dryRun: false,
    width: DEFAULT_OPTIONS.width,
    height: DEFAULT_OPTIONS.height,
    thumbnailSize: DEFAULT_OPTIONS.thumbnailSize,
    quality: DEFAULT_OPTIONS.quality,
    logJob: true
  };

  for (const arg of args) {
    if (arg === '--watch') {
      options.watch = true;
    } else if (arg.startsWith('--interval=')) {
      options.interval = parseInt(arg.split('=')[1], 10) || options.interval;
    } else if (arg.startsWith('--max=')) {
      options.maxPerRun = parseInt(arg.split('=')[1], 10) || 0;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--width=')) {
      options.width = parseInt(arg.split('=')[1], 10) || options.width;
    } else if (arg.startsWith('--height=')) {
      options.height = parseInt(arg.split('=')[1], 10) || options.height;
    } else if (arg.startsWith('--thumb=')) {
      options.thumbnailSize = parseInt(arg.split('=')[1], 10) || options.thumbnailSize;
    } else if (arg.startsWith('--quality=')) {
      options.quality = parseFloat(arg.split('=')[1]) || options.quality;
    } else if (arg === '--no-log') {
      options.logJob = false;
    }
  }

  return options;
};

const findQueuedShaders = async (database, limit = 0) => {
  const snapshot = await database.ref('shader-previews').get();
  if (!snapshot.exists()) {
    return [];
  }

  const queued = [];
  snapshot.forEach((childSnapshot) => {
    const value = childSnapshot.val();
    if (value && value.status === 'queued') {
      queued.push(childSnapshot.key);
    }
  });

  if (limit > 0) {
    return queued.slice(0, limit);
  }
  return queued;
};

const processQueueOnce = async (firebase, options) => {
  const shaderKeys = await findQueuedShaders(firebase.database, options.maxPerRun);

  if (shaderKeys.length === 0) {
    console.log('ℹ️  Ve frontě nebyly nalezeny žádné shadery.');
    return { total: 0, success: [], errors: [] };
  }

  console.log(`🕒 Zpracovávám ${shaderKeys.length} shaderů z fronty.`);

  const result = await runShaderPreviewGeneration({
    mode: 'only',
    filters: shaderKeys,
    dryRun: options.dryRun,
    width: options.width,
    height: options.height,
    thumbnailSize: options.thumbnailSize,
    quality: options.quality,
    generationSource: 'queue-processor',
    requestedBy: 'queue-processor',
    logJob: options.logJob
  }, firebase);

  if (result.errors.length > 0) {
    console.warn('⚠️  Některé shadery selhaly:', result.errors);
  }

  return result;
};

const main = async () => {
  const options = parseQueueArgs();
  const firebase = await ensureFirebase();

  let active = false;
  let shouldExit = false;

  const runLoop = async () => {
    if (active) {
      return;
    }
    active = true;
    try {
      await processQueueOnce(firebase, options);
    } finally {
      active = false;
      if (!options.watch) {
        shouldExit = true;
      }
    }
  };

  await runLoop();

  if (options.watch) {
    while (!shouldExit) {
      await delay(options.interval);
      await runLoop();
    }
  }

  await firebase.database.goOffline();
};

const isDirectExecution = process.argv[1]?.includes('processShaderPreviewQueue.js');

if (isDirectExecution) {
  main().catch(async (error) => {
    console.error('❌ Zpracování fronty shader náhledů selhalo:', error);
    try {
      const firebase = await ensureFirebase();
      await firebase.database.goOffline();
    } catch (e) {
      // ignore
    }
    process.exit(1);
  });
}

