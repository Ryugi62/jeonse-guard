import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { assessLease } from '../src/application/assessLease.ts';
import { parseLeaseFacts } from '../src/domain/lease.ts';
import { renderHome, renderReport, renderStep } from '../src/infrastructure/web/render.ts';
import { DICT } from '../src/infrastructure/web/i18n.ts';
import { SAMPLE_FORM } from '../src/infrastructure/web/sample.ts';
import { groupDigits, highlightQuotes, moneyHint, digitsToNumber } from '../src/infrastructure/web/format.ts';
import { fixtureCorpus } from './helpers.ts';

const corpus = fixtureCorpus();
const facts = (() => {
  const f = SAMPLE_FORM;
  const r = parseLeaseFacts({ ...f, homeValue: digitsToNumber(f.homeValue), deposit: digitsToNumber(f.deposit), seniorDebt: digitsToNumber(f.seniorDebt), seniorDeposits: 0 });
  if (!r.ok) throw new Error('sample invalid');
  return r.facts;
})();
const view = { lawCheck: { status: 'ok' as const, checkedAt: 'now' }, snapshotDate: '2026-09-24', aiStatus: 'idle' as const };

describe('UI acceptance (SPEC §10)', () => {
  it('1/10: viewport meta present, no external fonts or CDNs', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    const css = readFileSync(new URL('../src/infrastructure/web/styles.css', import.meta.url), 'utf8');
    expect(html).toContain('name="viewport"');
    expect(html + css).not.toMatch(/https?:\/\/(fonts|cdn|unpkg|jsdelivr)/);
    expect(css).not.toMatch(/@import|@font-face/);
  });

  it('5: exactly one primary CTA per screen', () => {
    for (const lang of ['en', 'ko'] as const) {
      const d = DICT[lang];
      expect(renderHome(d).match(/class="cta[ "]/g)).toHaveLength(1);
      for (const n of [1, 2, 3, 4]) expect(renderStep(n, d, lang, SAMPLE_FORM, {}).match(/class="cta[ "]/g)).toHaveLength(1);
    }
  });

  it('2: each step asks at most two question groups', () => {
    const d = DICT.en;
    for (const n of [1, 2, 3, 4]) {
      const html = renderStep(n, d, 'en', SAMPLE_FORM, {});
      const groups = (html.match(/\sdata-q[\s>]/g) ?? []).length;
      expect(groups, `step ${n}`).toBeGreaterThanOrEqual(1);
      expect(groups, `step ${n}`).toBeLessThanOrEqual(2);
    }
  });

  it('6: the report starts with the money at risk', () => {
    const html = renderReport(assessLease(facts, corpus), DICT.en, 'en', view);
    const firstText = html.indexOf('class="risk-num"');
    expect(firstText).toBeGreaterThan(-1);
    expect(firstText).toBeLessThan(html.indexOf('<h2'));
    expect(html).toContain('₩85,000,000');
  });

  it('7: statute text sits inside closed <details>', () => {
    const html = renderReport(assessLease(facts, corpus), DICT.en, 'en', view);
    expect(html).toContain('<details class="cite">');
    expect(html).not.toMatch(/<details[^>]*\sopen/);
    expect(html).toContain('<mark>');
  });

  it('shows the silent section with the unmatched clauses and the AI button', () => {
    const html = renderReport(assessLease(facts, corpus), DICT.en, 'en', view);
    expect(html).toContain('반려동물 사육을 금지한다.');
    expect(html).toContain('Ask AI to sort 2 unmatched terms');
  });

  it('escapes user text', () => {
    const f = { ...facts, specialTerms: ['<img src=x onerror=alert(1)>'] };
    const html = renderReport(assessLease(f, corpus), DICT.en, 'en', view);
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x');
  });
});

describe('format helpers', () => {
  it('groups digits and reads amounts', () => {
    expect(groupDigits('0200000000원')).toBe('200,000,000');
    expect(moneyHint('200,000,000', 'ko')).toBe('2억원');
    expect(moneyHint('200,000,000', 'en')).toBe('200 million won');
    expect(moneyHint('', 'en')).toBe('');
  });
  it('highlights several quotes across whitespace and merges overlaps', () => {
    const html = highlightQuotes('가 나다\n라 마', ['나다 라', '라마']);
    expect(html).toBe('가 <mark>나다\n라 마</mark>');
  });
});

describe('sample lease tells the whole story', () => {
  it('has stop findings, an AI-sortable clause, a plain silence and a cited silence', () => {
    const r = assessLease(facts, corpus);
    expect(r.findings.filter((f) => f.severity === 'stop').length).toBeGreaterThanOrEqual(3);
    expect(r.silences.map((s) => s.reason).sort()).toEqual(['no-verified-basis', 'no-verified-basis', 'outside-corpus']);
    expect(r.silences.find((s) => s.reason === 'outside-corpus')?.citations[0]?.article).toBe('A20230221-2');
  });
});

describe('AC-16 / AC-17 law check states are honest', () => {
  it('AC-17 offline: says the snapshot date instead of claiming a live check', () => {
    const html = renderReport(assessLease(facts, corpus), DICT.en, 'en', { ...view, lawCheck: { status: 'offline' } });
    expect(html).toContain('Using the statute snapshot taken 2026-09-24');
    expect(html).not.toContain('every cited article matches');
  });
  it('AC-16 drift: says findings are withheld', () => {
    const html = renderReport(assessLease(facts, corpus), DICT.en, 'en', { ...view, lawCheck: { status: 'drift' } });
    expect(html).toContain('Findings that cite it are withheld');
  });
  it('AC-15 highlights the English translation of the quoted passage too', () => {
    const html = renderReport(assessLease(facts, corpus), DICT.en, 'en', view);
    expect(html).toMatch(/<p lang="en" class="law-en">[^]*?<mark>[^<]*junior creditors[^<]*<\/mark>/);
  });
  it('folds "good to know" and "looks fine" and states the summary first', () => {
    const html = renderReport(assessLease(facts, corpus), DICT.en, 'en', view);
    expect(html).toContain('<details class="group fold sev-info">');
    expect(html).toMatch(/class="summary">\d+ things? to fix before signing, \d+ to check\./);
  });
});

import { paragraphsEn } from '../src/infrastructure/web/format.ts';
describe('English paragraphs', () => {
  it('splits the heading, paragraphs and items onto their own lines', () => {
    const t = 'Article 4 (Term of lease) (1) A lease is two years.(2) It continues until repaid.[This Article Wholly Amended on Mar. 21, 2008]';
    expect(paragraphsEn(t).split('\n')).toEqual(['Article 4 (Term of lease)', '(1) A lease is two years.', '(2) It continues until repaid.', '[This Article Wholly Amended on Mar. 21, 2008]']);
  });
});

describe('empty silence section', () => {
  it('says so instead of showing an empty box', () => {
    const f = { ...facts, specialTerms: [], earliestMortgageDate: null };
    const html = renderReport(assessLease(f, corpus), DICT.ko, 'ko', view);
    expect(html).toContain('이번에는 없어요');
  });
});
