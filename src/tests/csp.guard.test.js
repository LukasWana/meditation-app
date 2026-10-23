/**
 * Strážní test CSP: každý inline <script> v index.html musí mít svůj sha256 v CSP meta
 * i v hlavičce firebase.json. Jinak ho APK (WebView) i web tiše zablokují.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { resolve } from 'path';

const root = resolve(__dirname, '../..');
const html = readFileSync(resolve(root, 'index.html'), 'utf-8');
const firebaseJson = JSON.parse(readFileSync(resolve(root, 'firebase.json'), 'utf-8'));

const hashesIn = (csp) => new Set([...csp.matchAll(/'sha256-([^']+)'/g)].map((m) => m[1]));

const metaCsp = html.match(/http-equiv="Content-Security-Policy" content="([^"]*)"/)?.[1] ?? '';
const headerCsp = (firebaseJson.hosting?.headers ?? [])
  .flatMap((h) => h.headers ?? [])
  .find((h) => h.key === 'Content-Security-Policy')?.value ?? '';

const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('base64');

describe('CSP guard', () => {
  it('index.html má CSP meta a firebase.json CSP hlavičku', () => {
    expect(metaCsp).not.toBe('');
    expect(headerCsp).not.toBe('');
  });

  it('script-src nepovoluje unsafe-inline ani unsafe-eval', () => {
    for (const csp of [metaCsp, headerCsp]) {
      const scriptSrc = csp.split(';').find((d) => d.trim().startsWith('script-src')) ?? '';
      expect(scriptSrc).not.toContain("'unsafe-inline'");
      expect(scriptSrc).not.toContain("'unsafe-eval'");
    }
  });

  it('každý inline skript má hash v obou CSP', () => {
    expect(inlineScripts.length).toBeGreaterThan(0);
    for (const script of inlineScripts) {
      const hash = sha256(script);
      expect(hashesIn(metaCsp).has(hash), `meta CSP postrádá sha256-${hash}`).toBe(true);
      expect(hashesIn(headerCsp).has(hash), `firebase.json CSP postrádá sha256-${hash}`).toBe(true);
    }
  });
});
