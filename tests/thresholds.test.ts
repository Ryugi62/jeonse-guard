import { describe, expect, it } from 'vitest';
import { SMALL_DEPOSIT } from '../src/domain/library.ts';
import { parseKoreanWon, formatWon, formatWonKo } from '../src/domain/text.ts';

describe('numbers used in the math equal the amounts written in the decree quotes', () => {
  it.each(Object.entries(SMALL_DEPOSIT))('%s', (_region, row) => {
    const amountIn = (q: string) => parseKoreanWon(q.split(':').pop()!.trim());
    expect(amountIn(row.limitQuote.quote)).toBe(row.limit);
    expect(amountIn(row.capQuote.quote)).toBe(row.cap);
  });
});

describe('won formatting', () => {
  it('parses statute amounts', () => {
    expect(parseKoreanWon('1억6천500만원')).toBe(165_000_000);
    expect(parseKoreanWon('5천500만원')).toBe(55_000_000);
    expect(parseKoreanWon('abc')).toBeNull();
  });
  it('formats for both languages', () => {
    expect(formatWon(85_000_000)).toBe('₩85,000,000');
    expect(formatWonKo(115_000_000)).toBe('1억 1,500만원');
    expect(formatWonKo(55_000_000)).toBe('5,500만원');
  });
});
