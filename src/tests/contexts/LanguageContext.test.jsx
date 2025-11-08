import { describe, it, expect } from 'vitest';
import { normalizeTranslationKeys } from '@/contexts/LanguageContext.jsx';

describe('normalizeTranslationKeys', () => {
  it('mapuje legacy klíč slova na meditace', () => {
    const result = normalizeTranslationKeys({ slova: 'test' });

    expect(result.meditace).toBe('test');
    expect(result.slova).toBeUndefined();
  });

  it('nezapíše hodnotu z legacy klíče, pokud již existuje nová hodnota', () => {
    const result = normalizeTranslationKeys({
      slova: 'legacy',
      meditace: 'aktualni'
    });

    expect(result.meditace).toBe('aktualni');
  });

  it('mapuje meditacia a dychanie na dychani', () => {
    const result = normalizeTranslationKeys({
      meditacia: 'legacySK',
      dychanie: 'legacyCZ'
    });

    expect(result.dychani).toBe('legacySK');
    expect(result.dychanie).toBeUndefined();
  });

  it('mapuje dlzkaMeditacie a pripravaNaMeditaci na nové klíče', () => {
    const result = normalizeTranslationKeys({
      dlzkaMeditacie: '10',
      pripravaNaMeditaci: '5'
    });

    expect(result.dlzkaDychania).toBe('10');
    expect(result.pripravaNaDychanie).toBe('5');
    expect(result.dlzkaMeditacie).toBeUndefined();
    expect(result.pripravaNaMeditaci).toBeUndefined();
  });
});


