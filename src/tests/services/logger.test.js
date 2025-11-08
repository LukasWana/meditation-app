

import { Logger } from '@/services/logger';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Logger', () => {
  let logger;
  let consoleLogSpy;
  let consoleWarnSpy;
  let consoleErrorSpy;
  let consoleDebugSpy;
  let consoleGroupSpy;
  let consoleGroupEndSpy;
  let consoleTableSpy;
  let consoleTimeSpy;
  let consoleTimeEndSpy;

  beforeEach(() => {
    logger = new Logger();
    logger.setLogLevel('debug');

    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    consoleGroupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
    consoleGroupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    consoleTableSpy = vi.spyOn(console, 'table').mockImplementation(() => {});
    consoleTimeSpy = vi.spyOn(console, 'time').mockImplementation(() => {});
    consoleTimeEndSpy = vi.spyOn(console, 'timeEnd').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loguje info zprávy když úroveň dovoluje', () => {
    logger.info('Test info');
    expect(consoleLogSpy).toHaveBeenCalledWith('ℹ️ [INFO] Test info');
  });

  it('loguje success zprávy s ikonkou', () => {
    logger.success('Hotovo');
    expect(consoleLogSpy).toHaveBeenCalledWith('✅ [SUCCESS] Hotovo');
  });

  it('loguje debug zprávy do console.debug', () => {
    logger.debug('Detail');
    expect(consoleDebugSpy).toHaveBeenCalledWith('🐛 [DEBUG] Detail');
  });

  it('loguje varování a chyby přes správné konzolové metody', () => {
    logger.warn('Pozor');
    logger.error('Chyba', { id: 1 });

    expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️ [WARN] Pozor');
    expect(consoleErrorSpy).toHaveBeenCalledWith('❌ [ERROR] Chyba', { id: 1 });
  });

  it('respektuje nastavenou úroveň logování', () => {
    logger.setLogLevel('error');

    logger.info('Skrytá zpráva');
    logger.warn('Skryté varování');
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();

    logger.error('Viditelná chyba');
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });

  it('formátuje specializované logy (api/cache/audio)', () => {
    logger.api('GET', '/test', 200, 123);
    logger.cache('hit', 'key', true);
    logger.audio('play', 'soubor.mp3');

    expect(consoleLogSpy).toHaveBeenCalledWith('✅ [API] GET /test - 200 (123ms)');
    expect(consoleLogSpy).toHaveBeenCalledWith('🎯 [CACHE] hit: key');
    expect(consoleLogSpy).toHaveBeenCalledWith('🎵 [AUDIO] play: soubor.mp3 ');
  });

  it('měří výkon pomocí performance logu', () => {
    logger.performance('načtení', 42);
    expect(consoleLogSpy).toHaveBeenCalledWith('⚡ [PERF] načtení: 42ms');
  });

  it('používá console.group pro group logy', () => {
    const task = vi.fn();
    logger.group('Test skupina', task);

    expect(consoleGroupSpy).toHaveBeenCalledWith('📁 Test skupina');
    expect(task).toHaveBeenCalled();
    expect(consoleGroupEndSpy).toHaveBeenCalled();
  });

  it('vypisuje tabulky a měří čas', () => {
    logger.table([{ id: 1 }], 'Data');
    logger.time('Async');
    logger.timeEnd('Async');

    expect(consoleLogSpy).toHaveBeenCalledWith('📋 Data:');
    expect(consoleTableSpy).toHaveBeenCalledWith([{ id: 1 }]);
    expect(consoleTimeSpy).toHaveBeenCalledWith('⏱️ Async');
    expect(consoleTimeEndSpy).toHaveBeenCalledWith('⏱️ Async');
  });

  it('loguje chyby se stackem přes errorWithStack', () => {
    const err = new Error('Selhání');
    logger.errorWithStack(err, 'Přehled');

    expect(consoleErrorSpy).toHaveBeenNthCalledWith(1, '❌ [ERROR] Přehled', err);
    if (err.stack) {
      expect(consoleErrorSpy).toHaveBeenNthCalledWith(2, 'Stack trace:', err.stack);
    }
  });
});
