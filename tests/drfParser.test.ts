import { describe, expect, it } from 'vitest';
import { fixtureCorpus } from './helpers.ts';

describe('AC-12 DRF payload parsing', () => {
  const corpus = fixtureCorpus();

  it('keys articles by number with branch (3-2) and keeps paragraphs and items', () => {
    const a = corpus.hlpa.articles['3-2'];
    expect(a).toBeDefined();
    expect(a!.titleKo).toBe('보증금의 회수');
    expect(a!.textKo).toContain('후순위권리자(後順位權利者)나 그 밖의 채권자보다 우선하여 보증금을 변제(辨濟)받을 권리가 있다');
    expect(a!.textKo).toContain('9. 「주택도시기금법」에 따른 주택도시보증공사');
  });

  it('attaches the official English translation to the same article number', () => {
    const a = corpus.hlpa.articles['3-2'];
    expect(a!.titleEn).toBe('Recovery of deposits');
    expect(a!.textEn).toMatch(/^Article 3-2 \(Recovery of deposits\)/);
    expect(corpus.hlpa.articles['3']!.textEn).toContain('Opposing power');
  });

  it('records version metadata', () => {
    expect(corpus.hlpa.mst).toBe('276291');
    expect(corpus.hlpa.effectiveDate).toBe('2026-01-02');
    expect(corpus.hlpa.nameEn).toBe('HOUSING LEASE PROTECTION ACT');
    expect(corpus['hlpa-decree'].nameKo).toBe('주택임대차보호법 시행령');
  });

  it('skips deleted placeholders and chapter headings but keeps real articles', () => {
    expect(corpus.hlpa.articles['10']!.textKo).toContain('이 법에 위반된 약정(約定)으로서 임차인에게 불리한 것은 그 효력이 없다');
    expect(corpus['hlpa-decree'].articles['11']!.textKo).toContain('1. 서울특별시: 1억6천500만원');
  });

  it('exposes the 2023-02-21 decree addendum Article 2 as its own citable unit', () => {
    const add = corpus['hlpa-decree'].articles['A20230221-2'];
    expect(add).toBeDefined();
    expect(add!.textKo).toContain('이 영 시행 전에 임차주택에 대하여 담보물권을 취득한 자에 대해서는 종전의 규정에 따른다');
    expect(add!.textEn).toContain('the previous provisions thereof shall apply');
  });
});
