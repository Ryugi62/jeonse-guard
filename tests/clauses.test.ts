import { describe, expect, it } from 'vitest';
import { matchClausePatterns, CLAUSE_PATTERNS } from '../src/domain/clauses.ts';
import { reviewClauses } from '../src/application/reviewClauses.ts';
import { fixture, fixtureCorpus } from './helpers.ts';

const corpus = fixtureCorpus();
type Row = { text: string; label: string | null };
const labeled = fixture('clauses.labeled.json') as { dev: Row[]; holdout: Row[] };

function score(rows: Row[]) {
  let tp = 0, fp = 0, fn = 0;
  for (const r of rows) {
    const got = matchClausePatterns(r.text)[0] ?? null;
    if (got && got === r.label) tp++;
    else if (got && got !== r.label) fp++;
    if (r.label && got !== r.label) fn++;
  }
  return { tp, fp, fn, precision: tp / Math.max(1, tp + fp), recall: tp / Math.max(1, tp + fn) };
}

describe('AC-9 / AC-10 clause review', () => {
  it('flags a renewal-right waiver as stop citing Art. 6-3 and Art. 10', () => {
    const r = reviewClauses(['임차인은 계약갱신요구권을 행사하지 않는다'], corpus);
    const f = r.findings[0]!;
    expect(f.severity).toBe('stop');
    expect(f.citations.map((c) => c.article)).toEqual(['6-3', '10']);
    expect(f.clause).toBe('임차인은 계약갱신요구권을 행사하지 않는다');
    expect(f.source).toBe('clause-rule');
  });

  it('stays silent on a clause outside the taxonomy', () => {
    const r = reviewClauses(['반려동물 사육 금지'], corpus);
    expect(r.findings).toEqual([]);
    expect(r.silences[0]!.reason).toBe('no-verified-basis');
    expect(r.silences[0]!.clause).toBe('반려동물 사육 금지');
  });

  it('ignores blank lines', () => {
    expect(reviewClauses(['', '   '], corpus)).toEqual({ findings: [], silences: [] });
  });
});

describe('AC-11 AI labels are only accepted inside the taxonomy', () => {
  it('uses an AI label when the rule matcher is silent, and marks the source', () => {
    const clause = '집주인은 살면서 돈을 더 빌릴 수도 있음';
    const r = reviewClauses([clause], corpus, { [clause]: 'lessor-may-add-lien' });
    expect(r.findings[0]?.source).toBe('clause-ai');
    expect(r.findings[0]?.id).toContain('lessor-may-add-lien');
  });

  it('rejects an AI label outside the taxonomy as a silence', () => {
    const clause = '집주인은 살면서 돈을 더 빌릴 수도 있음';
    const r = reviewClauses([clause], corpus, { [clause]: 'tenant-must-pay-tax' });
    expect(r.findings).toEqual([]);
    expect(r.silences[0]!.reason).toBe('classifier-out-of-taxonomy');
  });

  it('the rule matcher wins over the AI when both answer', () => {
    const clause = '임차인은 계약갱신요구권을 행사하지 않는다';
    const r = reviewClauses([clause], corpus, { [clause]: 'short-term' });
    expect(r.findings[0]?.id).toContain('waive-renewal-right');
    expect(r.findings[0]?.source).toBe('clause-rule');
  });
});

describe('S4 rule matcher quality on the labeled set', () => {
  it('has zero false alarms on dev and holdout (precision 1.0)', () => {
    expect(score(labeled.dev).fp).toBe(0);
    expect(score(labeled.holdout).fp).toBe(0);
  });
  it('recalls every dev clause', () => {
    expect(score(labeled.dev).recall).toBe(1);
  });
  it('taxonomy ids are unique and every pattern has at least one citation', () => {
    const ids = CLAUSE_PATTERNS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(CLAUSE_PATTERNS.every((p) => p.citations.length > 0)).toBe(true);
  });
});
