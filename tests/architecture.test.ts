import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : [];
  });
}
const importsOf = (src: string) => [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]!);

describe('AC-13 Clean Architecture boundaries', () => {
  it('domain imports only domain', () => {
    for (const f of files(join(root, 'domain'))) {
      const src = readFileSync(f, 'utf8');
      for (const i of importsOf(src)) expect(i, `${f} -> ${i}`).toMatch(/^\.\.?\//);
      for (const i of importsOf(src)) expect(i, `${f} -> ${i}`).not.toMatch(/application|adapters|infrastructure|api\//);
      expect(src, f).not.toMatch(/\bfetch\(|process\.env|document\.|window\./);
    }
  });
  it('application imports only domain and application', () => {
    for (const f of files(join(root, 'application'))) {
      const src = readFileSync(f, 'utf8');
      for (const i of importsOf(src)) expect(i, `${f} -> ${i}`).toMatch(/^(\.\/|\.\.\/domain\/)/);
      expect(src, f).not.toMatch(/\bfetch\(|process\.env|document\.|window\./);
    }
  });
  it('adapters never import infrastructure', () => {
    for (const f of files(join(root, 'adapters'))) {
      for (const i of importsOf(readFileSync(f, 'utf8'))) expect(i, `${f} -> ${i}`).not.toMatch(/infrastructure/);
    }
  });
});
