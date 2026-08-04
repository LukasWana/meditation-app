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

describe.skip('guard designoveho systemu', () => {
  // TODO(Task 7): odstranit skip až doběhne migrace
  it('zadny nadpis nenese velikostni utility tridu', () => {
    const porusuje = files.filter((f) => HEADING_WITH_SIZE.test(readFileSync(f, 'utf8')));
    expect(porusuje.map((f) => path.relative(SRC, f))).toEqual([]);
  });

  it('zadny komponent nenastavuje fontSize inline', () => {
    const porusuje = files.filter((f) => INLINE_FONT_SIZE.test(readFileSync(f, 'utf8')));
    expect(porusuje.map((f) => path.relative(SRC, f))).toEqual([]);
  });
});