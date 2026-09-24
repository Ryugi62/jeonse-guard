import { describe, expect, it } from 'vitest';
import { assessLease } from '../src/application/assessLease.ts';
import { auctionScenario } from '../src/domain/rules/auctionShortfall.ts';
import { parseLeaseFacts, type LeaseFacts } from '../src/domain/lease.ts';
import { fixtureCorpus } from './helpers.ts';

const corpus = fixtureCorpus();
const M = 1_000_000;
const base: LeaseFacts = {
  region: 'seoul',
  homeValue: 250 * M,
  deposit: 200 * M,
  seniorDebt: 60 * M,
  seniorDeposits: 0,
  earliestMortgageDate: '2024-05-01',
  lessorShowedTaxCertificates: 'yes',
  lessorShowedFixedDateInfo: 'yes',
  leaseMonths: 24,
  specialTerms: [],
  auctionRatio: 0.7,
};
const find = (r: ReturnType<typeof assessLease>, id: string) => r.findings.find((f) => f.id === id);
const silent = (r: ReturnType<typeof assessLease>, id: string) => r.silences.find((s) => s.id === id);

describe('AC-4 auction shortfall', () => {
  it('computes recovery and shortfall with seniors paid first', () => {
    const s = auctionScenario(base);
    expect(s.proceeds).toBe(175 * M);
    expect(s.paidBeforeYou).toBe(60 * M);
    expect(s.recovery).toBe(115 * M);
    expect(s.shortfall).toBe(85 * M);
  });

  it('raises a stop finding citing Art. 3-2', () => {
    const f = find(assessLease(base, corpus), 'auction-shortfall');
    expect(f?.severity).toBe('stop');
    expect(f?.citations.map((c) => c.article)).toContain('3-2');
    expect(f?.title.en).toContain('₩85,000,000');
  });

  it('is caution when covered at the chosen ratio but short 10 points lower', () => {
    const f = find(assessLease({ ...base, deposit: 100 * M, seniorDebt: 70 * M }, corpus), 'auction-shortfall');
    // 175 - 70 = 105 >= 100 at 70%; at 60% 150 - 70 = 80 < 100
    expect(f?.severity).toBe('caution');
  });

  it('is ok when covered with margin', () => {
    const f = find(assessLease({ ...base, deposit: 50 * M, seniorDebt: 0 }, corpus), 'auction-shortfall');
    expect(f?.severity).toBe('ok');
  });

  it('never reports negative recovery', () => {
    const s = auctionScenario({ ...base, seniorDebt: 300 * M });
    expect(s.recovery).toBe(0);
    expect(s.shortfall).toBe(200 * M);
  });
});

describe('AC-5 opposing power starts the next day', () => {
  it('is caution without a no-new-lien clause, citing Art. 3', () => {
    const f = find(assessLease(base, corpus), 'opposing-power-next-day');
    expect(f?.severity).toBe('caution');
    expect(f?.citations[0]?.quote).toBe('그 다음 날부터 제삼자에 대하여 효력이 생긴다');
  });

  it('is ok when the contract has the no-new-lien clause', () => {
    const r = assessLease({ ...base, specialTerms: ['임대인은 임차인의 전입신고 다음 날까지 근저당권 등 어떠한 권리도 설정하지 않는다.'] }, corpus);
    expect(find(r, 'opposing-power-next-day')?.severity).toBe('ok');
  });
});

describe('AC-6 lessor disclosure duty (Art. 3-7)', () => {
  it.each([
    ['no', 'stop'],
    ['unknown', 'caution'],
    ['yes', 'ok'],
  ] as const)('tax certificates %s -> %s', (shown, sev) => {
    const f = find(assessLease({ ...base, lessorShowedTaxCertificates: shown }, corpus), 'lessor-disclosure');
    expect(f?.severity).toBe(sev);
    expect(f?.citations[0]?.article).toBe('3-7');
  });
});

describe('AC-7 small-deposit priority', () => {
  it('Seoul 150M deposit: protected min(55M, proceeds/2)', () => {
    const r = assessLease({ ...base, deposit: 150 * M }, corpus);
    const f = find(r, 'small-deposit-priority');
    expect(f?.severity).toBe('info');
    expect(f?.numbers?.protectedAmount).toBe(55 * M);
    const arts = f!.citations.map((c) => `${c.lawId}:${c.article}`);
    expect(arts).toEqual(expect.arrayContaining(['hlpa:8', 'hlpa-decree:10', 'hlpa-decree:11']));
  });

  it('caps at half the auction proceeds', () => {
    const r = assessLease({ ...base, region: 'seoul', homeValue: 80 * M, deposit: 70 * M, seniorDebt: 0 }, corpus);
    // proceeds 56M -> half 28M < 55M cap
    expect(find(r, 'small-deposit-priority')?.numbers?.protectedAmount).toBe(28 * M);
  });

  it('Seoul 170M deposit is not eligible (Decree Art. 11)', () => {
    const f = find(assessLease({ ...base, deposit: 170 * M }, corpus), 'small-deposit-priority');
    expect(f?.numbers?.protectedAmount).toBe(0);
    expect(f?.citations.map((c) => c.article)).toContain('11');
  });

  it('uses the region threshold quoted from the decree (other areas: 75M / 25M)', () => {
    const f = find(assessLease({ ...base, region: 'other', deposit: 70 * M }, corpus), 'small-deposit-priority');
    expect(f?.numbers?.protectedAmount).toBe(25 * M);
    expect(f?.citations.some((c) => c.quote.includes('그 밖의 지역: 2천500만원'))).toBe(true);
  });
});

describe('AC-8 silence outside the corpus', () => {
  it('senior mortgage before 2023-02-21 -> silence citing the addendum', () => {
    const r = assessLease({ ...base, deposit: 150 * M, earliestMortgageDate: '2022-11-30' }, corpus);
    expect(find(r, 'small-deposit-priority')).toBeUndefined();
    const s = silent(r, 'small-deposit-priority');
    expect(s?.reason).toBe('outside-corpus');
    expect(s?.citations[0]?.article).toBe('A20230221-2');
  });
});

describe('AC-14 short lease term', () => {
  it('12 months -> info citing Art. 4', () => {
    const f = find(assessLease({ ...base, leaseMonths: 12 }, corpus), 'lease-term');
    expect(f?.severity).toBe('info');
    expect(f?.citations[0]?.article).toBe('4');
  });
  it('24 months -> no lease-term finding', () => {
    expect(find(assessLease(base, corpus), 'lease-term')).toBeUndefined();
  });
});

describe('report ordering and fixed date', () => {
  it('always includes the fixed-date finding citing Art. 3-2 and 3-6', () => {
    const f = find(assessLease(base, corpus), 'fixed-date');
    expect(f?.citations.map((c) => c.article)).toEqual(['3-2', '3-6']);
  });
  it('orders findings stop > caution > info > ok', () => {
    const order = { stop: 0, caution: 1, info: 2, ok: 3 } as const;
    const sev = assessLease({ ...base, lessorShowedTaxCertificates: 'unknown' }, corpus).findings.map((f) => order[f.severity]);
    expect([...sev].sort((a, b) => a - b)).toEqual(sev);
  });
});

describe('lease facts validation', () => {
  it('parses a form payload in 만원-free integers and rejects nonsense', () => {
    const ok = parseLeaseFacts({ ...base, homeValue: '250000000', deposit: '200,000,000' });
    expect(ok.ok).toBe(true);
    const bad = parseLeaseFacts({ ...base, homeValue: 0, deposit: -5, auctionRatio: 2 });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors.map((e) => e.field).sort()).toEqual(['auctionRatio', 'deposit', 'homeValue']);
  });
});

import { withholdDrifted } from '../src/application/assessLease.ts';
describe('AC-16 / UC-3 drift withholds findings that cite a changed article', () => {
  it('moves Art. 3 findings to silences with reason law-changed', () => {
    const r = withholdDrifted(assessLease(base, corpus), [{ lawId: 'hlpa', article: '3' }]);
    expect(r.findings.some((f) => f.citations.some((c) => c.article === '3'))).toBe(false);
    expect(r.silences.filter((s) => s.reason === 'law-changed').map((s) => s.id)).toContain('opposing-power-next-day');
  });
  it('is a no-op without drift', () => {
    const r = assessLease(base, corpus);
    expect(withholdDrifted(r, [])).toBe(r);
  });
});

describe('suggested clause', () => {
  it('the suggested no-lien clause is itself recognized by the rule matcher as the good clause', async () => {
    const { NO_LIEN_CLAUSE } = await import('../src/domain/citations.ts');
    const { matchClausePatterns } = await import('../src/domain/clauses.ts');
    expect(matchClausePatterns(NO_LIEN_CLAUSE.ko)[0]).toBe('no-lien-until-next-day');
    expect(matchClausePatterns(NO_LIEN_CLAUSE.en)[0]).toBe('no-lien-until-next-day');
  });
});
