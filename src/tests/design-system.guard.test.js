import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const files = readdirSync(SRC, { recursive: true })
  .map((f) => String(f).split(path.sep).join('/'))
  .filter((f) => f.endsWith('.jsx') && !f.startsWith('tests/'))
  .map((f) => path.join(SRC, f));

const HEADING_WITH_SIZE = /<h[1-6][^>]*className="[^"]*\btext-(xs|sm|base|lg|xl|[2-9]xl)\b/;
const INLINE_FONT_SIZE = /style=\{\{[^}]*fontSize/;
// Pevné horní odsazení obchází env(safe-area-inset-top) — v prohlížeči se to
// neprojeví, ale v APK na Androidu nadpis vjede pod status bar.
// Odsazení patří třídě .screen-content-top.
const HARDCODED_TOP_OFFSET = /style=\{\{[^}]*marginTop:\s*'5rem'/;

describe('guard designoveho systemu', () => {
  it('zadny nadpis nenese velikostni utility tridu', () => {
    const porusuje = files.filter((f) => HEADING_WITH_SIZE.test(readFileSync(f, 'utf8')));
    expect(porusuje.map((f) => path.relative(SRC, f))).toEqual([]);
  });

  it('zadny komponent nenastavuje fontSize inline', () => {
    const porusuje = files.filter((f) => INLINE_FONT_SIZE.test(readFileSync(f, 'utf8')));
    expect(porusuje.map((f) => path.relative(SRC, f))).toEqual([]);
  });

  it('zadna obrazovka nema pevne horni odsazeni misto .screen-content-top', () => {
    const porusuje = files.filter((f) => HARDCODED_TOP_OFFSET.test(readFileSync(f, 'utf8')));
    expect(porusuje.map((f) => path.relative(SRC, f))).toEqual([]);
  });
});