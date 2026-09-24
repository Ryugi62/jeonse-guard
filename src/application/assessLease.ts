import { bySeverity, type CandidateFinding, type CandidateSilence, type Finding, type Silence } from '../domain/finding.ts';
import type { LeaseFacts } from '../domain/lease.ts';
import { groundCandidates } from '../domain/grounding.ts';
import type { Corpus, LawId } from '../domain/statute.ts';
import { auctionScenario, auctionShortfallRule, type AuctionScenario } from '../domain/rules/auctionShortfall.ts';
import { opposingPowerRule } from '../domain/rules/opposingPower.ts';
import { fixedDateRule } from '../domain/rules/fixedDate.ts';
import { lessorDisclosureRule } from '../domain/rules/lessorDisclosure.ts';
import { smallDepositRule } from '../domain/rules/smallDeposit.ts';
import { leaseTermRule } from '../domain/rules/leaseTerm.ts';
import { decideClauses, reviewClauses } from './reviewClauses.ts';
import type { AiLabels } from './ports.ts';

export interface CorpusStamp {
  lawId: LawId;
  nameEn: string;
  nameKo: string;
  mst: string;
  effectiveDate: string;
  enVersionDate: string | null;
}

export interface Report {
  findings: Finding[];
  silences: Silence[];
  scenario: AuctionScenario;
  corpus: CorpusStamp[];
}

/** UC-1: every rule proposes, the grounding gate disposes. */
export function assessLease(facts: LeaseFacts, corpus: Corpus, ai: AiLabels = {}): Report {
  const decisions = decideClauses(facts.specialTerms, ai);
  const hasNoLienClause = decisions.some((d) => d.patternId === 'no-lien-until-next-day');
  const hasShortTermClause = decisions.some((d) => d.patternId === 'short-term');

  const candidates: (CandidateFinding | CandidateSilence | null)[] = [
    auctionShortfallRule(facts),
    lessorDisclosureRule(facts),
    opposingPowerRule(hasNoLienClause),
    fixedDateRule(),
    smallDepositRule(facts),
    hasShortTermClause ? null : leaseTermRule(facts.leaseMonths),
  ];
  const ruled = groundCandidates(candidates.filter((c): c is CandidateFinding | CandidateSilence => c !== null), corpus);
  const clauses = reviewClauses(facts.specialTerms, corpus, ai);

  return {
    findings: [...ruled.findings, ...clauses.findings].sort(bySeverity),
    silences: [...ruled.silences, ...clauses.silences],
    scenario: auctionScenario(facts),
    corpus: Object.values(corpus).map((s) => ({
      lawId: s.lawId,
      nameEn: s.nameEn,
      nameKo: s.nameKo,
      mst: s.mst,
      effectiveDate: s.effectiveDate,
      enVersionDate: s.enVersionDate,
    })),
  };
}

/** UC-3 consequence: findings citing an article whose live text drifted from the snapshot are withheld. */
export function withholdDrifted(report: Report, drifted: { lawId: LawId; article: string }[]): Report {
  if (drifted.length === 0) return report;
  const hit = (f: Finding) => f.citations.some((c) => drifted.some((d) => d.lawId === c.lawId && d.article === c.article));
  const withheld: Silence[] = report.findings.filter(hit).map((f) => ({
    id: f.id,
    reason: 'law-changed',
    subject: f.title,
    detail: {
      en: 'The official text of an article this finding cites changed after our snapshot, so it is withheld until the snapshot is refreshed.',
      ko: '이 결과가 인용한 조문의 공식 원문이 스냅숏 이후 바뀌어, 스냅숏을 갱신할 때까지 보류했어요.',
    },
    citations: [],
    ...(f.clause !== undefined ? { clause: f.clause } : {}),
  }));
  return { ...report, findings: report.findings.filter((f) => !hit(f)), silences: [...report.silences, ...withheld] };
}
