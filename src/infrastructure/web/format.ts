import { formatWonKo } from '../../domain/text.ts';
import type { Lang } from './i18n.ts';

/** Keeps digits only and groups them: "200000000" -> "200,000,000". */
export function groupDigits(raw: string): string {
  const d = raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  return d.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export const digitsToNumber = (s: string): number => Number(s.replace(/\D/g, '') || '0');

/** Reading aid under a money field: "2억원" / "200 million won". */
export function moneyHint(raw: string, lang: Lang): string {
  const n = digitsToNumber(raw);
  if (!n) return '';
  if (lang === 'ko') return formatWonKo(n);
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${Number.isInteger(m) ? m : m.toFixed(1)} million won`;
  }
  return `${n.toLocaleString('en-US')} won`;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Wraps each quoted span of an article in <mark>, tolerant of whitespace differences. */
export function highlightQuotes(text: string, quotes: string[]): string {
  const ranges: [number, number][] = [];
  for (const q of quotes) {
    const pattern = [...q.replace(/\s+/g, '')].map((ch) => ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*');
    const m = new RegExp(pattern).exec(text);
    if (m) ranges.push([m.index, m.index + m[0].length]);
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([...r]);
  }
  let out = '';
  let pos = 0;
  for (const [a, b] of merged) {
    out += escapeHtml(text.slice(pos, a)) + '<mark>' + escapeHtml(text.slice(a, b)) + '</mark>';
    pos = b;
  }
  return out + escapeHtml(text.slice(pos));
}

export const highlightQuote = (text: string, quote: string): string => highlightQuotes(text, [quote]);

/** The official English translation arrives as one run-on block; break it at paragraph "(n)" and item "n." markers. */
export function paragraphsEn(text: string): string {
  return text
    .replace(/^(Article [\d-]+(?: \([^)]*\))?)\s*/, '$1\n')
    .replace(/([.>\]])\s*(\(\d+\))/g, '$1\n$2').replace(/([:;>])\s*(\d+\.\s)/g, '$1\n$2').replace(/(\S)(\[This Article)/g, '$1\n$2');
}
