import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// SPEC §10-9: body text contrast ≥ 4.5:1 in light and dark themes.
const css = readFileSync(new URL('../src/infrastructure/web/styles.css', import.meta.url), 'utf8');
function tokens(block: string): Record<string, string> {
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1]!, m[2]!]));
}
const light = tokens(css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {'))));
const darkStart = css.indexOf('@media (prefers-color-scheme: dark)');
const dark = { ...light, ...tokens(css.slice(darkStart, css.indexOf('}', css.indexOf(':root {', darkStart)))) };

function lum(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
}
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
};

const pairs: [string, string][] = [
  ['text', 'bg'], ['text2', 'bg'], ['text3', 'bg'], ['text2', 'surface'], ['text3', 'surface'], ['text3', 'page'],
  ['stop', 'bg'], ['caution', 'bg'], ['ok', 'bg'], ['blue-ink', 'bg'], ['blue-ink', 'surface'], ['caution', 'caution-soft'], ['text', 'blue-soft'],
];

describe('AC-18 color contrast', () => {
  it.each([['light', light], ['dark', dark]] as const)('%s theme: text pairs ≥ 4.5:1', (_n, t) => {
    const low = pairs.map(([f, b]) => ({ pair: `${f} on ${b}`, r: +ratio(t[f]!, t[b]!).toFixed(2) })).filter((x) => x.r < 4.5);
    expect(low).toEqual([]);
  });
  it('primary button text (white on --cta) ≥ 4.5:1', () => {
    expect(ratio('#ffffff', light['cta']!)).toBeGreaterThanOrEqual(4.5);
    expect(ratio('#ffffff', dark['cta']!)).toBeGreaterThanOrEqual(4.5);
  });
});
