import { describe, expect, it } from 'vitest';
import { verifyCitation, articleLabel } from '../src/domain/statute.ts';
import { groundCandidates } from '../src/domain/grounding.ts';
import type { CandidateFinding } from '../src/domain/finding.ts';
import { fixtureCorpus } from './helpers.ts';

const corpus = fixtureCorpus();
const t = (en: string) => ({ en, ko: en });

describe('AC-1 citation verification', () => {
  it('verifies a verbatim quote regardless of whitespace', () => {
    const v = verifyCitation({ lawId: 'hlpa', article: '3', quote: '그 다음 날부터   제삼자에 대하여\n효력이 생긴다' }, corpus);
    expect(v).not.toBeNull();
    expect(v!.articleTitleEn).toBe('Opposing power');
    expect(v!.url).toBe('https://www.law.go.kr/법령/주택임대차보호법/제3조');
    expect(v!.textEn).toContain('the following day');
  });

  it('labels branch articles in both languages', () => {
    expect(articleLabel('3-2')).toEqual({ en: 'Art. 3-2', ko: '제3조의2' });
    expect(articleLabel('A20230221-2')).toEqual({ en: 'Addendum (Feb. 21, 2023) Art. 2', ko: '부칙(2023.2.21) 제2조' });
  });

  it('rejects a quote that is not in the article, and a missing article', () => {
    expect(verifyCitation({ lawId: 'hlpa', article: '3', quote: '임차인은 언제든지 보증금을 돌려받는다' }, corpus)).toBeNull();
    expect(verifyCitation({ lawId: 'hlpa', article: '99', quote: '효력' }, corpus)).toBeNull();
  });

  it('rejects an empty or too-short quote', () => {
    expect(verifyCitation({ lawId: 'hlpa', article: '3', quote: '  ' }, corpus)).toBeNull();
    expect(verifyCitation({ lawId: 'hlpa', article: '3', quote: '효력' }, corpus)).toBeNull();
  });
});

describe('AC-2 grounding gate', () => {
  const good: CandidateFinding = {
    id: 'g', severity: 'caution', title: t('ok'), explanation: t('x'), action: null, source: 'rule',
    citations: [{ lawId: 'hlpa', article: '3', quote: '그 다음 날부터 제삼자에 대하여 효력이 생긴다' }],
  };
  const hallucinated: CandidateFinding = {
    ...good, id: 'h',
    citations: [...good.citations, { lawId: 'hlpa', article: '3', quote: '임대인은 보증금을 두 배로 돌려준다' }],
  };
  const noCitation: CandidateFinding = { ...good, id: 'n', citations: [] };

  it('passes a fully verified candidate as a finding', () => {
    const r = groundCandidates([good], corpus);
    expect(r.findings.map((f) => f.id)).toEqual(['g']);
    expect(r.silences).toEqual([]);
  });

  it('turns any candidate with one unverified citation into a silence', () => {
    const r = groundCandidates([hallucinated], corpus);
    expect(r.findings).toEqual([]);
    expect(r.silences[0]!.reason).toBe('citation-unverified');
  });

  it('never lets a candidate without citations through', () => {
    const r = groundCandidates([noCitation], corpus);
    expect(r.findings).toEqual([]);
    expect(r.silences[0]!.reason).toBe('citation-unverified');
  });
});
