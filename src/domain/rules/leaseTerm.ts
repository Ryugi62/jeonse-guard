import type { CandidateFinding } from '../finding.ts';
import { patternById } from '../clauses.ts';

export function leaseTermRule(leaseMonths: number | null): CandidateFinding | null {
  if (leaseMonths === null || leaseMonths >= 24) return null;
  const p = patternById('short-term')!;
  return {
    id: 'lease-term',
    severity: p.severity,
    title: p.title,
    explanation: p.explanation,
    action: p.action,
    citations: p.citations,
    source: 'rule',
    numbers: { leaseMonths },
  };
}
