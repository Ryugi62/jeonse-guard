import type { CandidateFinding, CandidateSilence, Finding, Silence } from '../domain/finding.ts';
import { matchClausePatterns, patternById, type ClausePattern } from '../domain/clauses.ts';
import { groundCandidates } from '../domain/grounding.ts';
import type { Corpus } from '../domain/statute.ts';
import { t2 } from '../domain/text.ts';
import type { AiLabels } from './ports.ts';

export interface ClauseDecision {
  clause: string;
  patternId: string | null;
  via: 'rule' | 'ai' | null;
  rejectedAiLabel?: string;
}

/** Decide one pattern per clause: rule matcher first, then an in-taxonomy AI label, else nothing. */
export function decideClauses(clauses: string[], ai: AiLabels = {}): ClauseDecision[] {
  return clauses
    .map((c) => c.trim())
    .filter(Boolean)
    .map((clause) => {
      const rule = matchClausePatterns(clause)[0];
      if (rule) return { clause, patternId: rule, via: 'rule' as const };
      const label = ai[clause];
      if (label && patternById(label)) return { clause, patternId: label, via: 'ai' as const };
      if (label && label !== 'none') return { clause, patternId: null, via: null, rejectedAiLabel: label };
      return { clause, patternId: null, via: null };
    });
}

const toCandidate = (p: ClausePattern, clause: string, index: number, via: 'rule' | 'ai'): CandidateFinding => ({
  id: `clause-${index}-${p.id}`,
  severity: p.severity,
  title: p.title,
  explanation: p.explanation,
  action: p.action,
  citations: p.citations,
  source: via === 'rule' ? 'clause-rule' : 'clause-ai',
  clause,
  ...(p.suggestedClause ? { suggestedClause: p.suggestedClause } : {}),
});

export function reviewClauses(clauses: string[], corpus: Corpus, ai: AiLabels = {}): { findings: Finding[]; silences: Silence[] } {
  const candidates: (CandidateFinding | CandidateSilence)[] = decideClauses(clauses, ai).map((d, i) => {
    if (d.patternId && d.via) return toCandidate(patternById(d.patternId)!, d.clause, i, d.via);
    const outOfTaxonomy = d.rejectedAiLabel !== undefined;
    return {
      id: `clause-${i}-silent`,
      reason: outOfTaxonomy ? 'classifier-out-of-taxonomy' : 'no-verified-basis',
      subject: t2('Special term', '특약'),
      detail: outOfTaxonomy
        ? t2('The AI suggested a category Jeonse Guard does not have, so the suggestion was discarded.', 'AI가 Jeonse Guard에 없는 분류를 제안해서 버렸어요.')
        : t2(
            'Jeonse Guard has no verified article that decides this clause, so it does not judge it. Ask a licensed agent or a free Jeonse Damage Support Center.',
            '이 특약을 판단할 검증된 조문이 없어 판단하지 않아요. 공인중개사나 무료 전세피해지원센터에 물어보세요.',
          ),
      citations: [],
      clause: d.clause,
    } satisfies CandidateSilence;
  });
  return groundCandidates(candidates, corpus);
}
